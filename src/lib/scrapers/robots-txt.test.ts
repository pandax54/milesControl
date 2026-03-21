import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseRobotsTxt,
  isPathAllowed,
  getCrawlDelay,
  fetchRobotsTxt,
  clearRobotsTxtCache,
} from './robots-txt';

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ==================== parseRobotsTxt ====================

describe('parseRobotsTxt', () => {
  it('should parse basic disallow rules', () => {
    const content = `
User-agent: *
Disallow: /admin
Disallow: /private
`;

    const rules = parseRobotsTxt(content);

    expect(rules).toHaveLength(1);
    expect(rules[0].userAgent).toBe('*');
    expect(rules[0].disallowed).toEqual(['/admin', '/private']);
    expect(rules[0].allowed).toEqual([]);
  });

  it('should parse allow rules', () => {
    const content = `
User-agent: *
Disallow: /
Allow: /public
`;

    const rules = parseRobotsTxt(content);

    expect(rules).toHaveLength(1);
    expect(rules[0].disallowed).toEqual(['/']);
    expect(rules[0].allowed).toEqual(['/public']);
  });

  it('should parse crawl-delay', () => {
    const content = `
User-agent: *
Crawl-delay: 5
Disallow: /admin
`;

    const rules = parseRobotsTxt(content);

    expect(rules).toHaveLength(1);
    expect(rules[0].crawlDelay).toBe(5);
  });

  it('should parse multiple user-agent blocks', () => {
    const content = `
User-agent: Googlebot
Disallow: /no-google

User-agent: *
Disallow: /private
`;

    const rules = parseRobotsTxt(content);

    expect(rules).toHaveLength(2);
    expect(rules[0].userAgent).toBe('Googlebot');
    expect(rules[0].disallowed).toEqual(['/no-google']);
    expect(rules[1].userAgent).toBe('*');
    expect(rules[1].disallowed).toEqual(['/private']);
  });

  it('should skip comments and empty lines', () => {
    const content = `
# This is a comment
User-agent: *

# Another comment
Disallow: /secret
`;

    const rules = parseRobotsTxt(content);

    expect(rules).toHaveLength(1);
    expect(rules[0].disallowed).toEqual(['/secret']);
  });

  it('should ignore empty disallow values', () => {
    const content = `
User-agent: *
Disallow:
`;

    const rules = parseRobotsTxt(content);

    expect(rules).toHaveLength(1);
    expect(rules[0].disallowed).toEqual([]);
  });

  it('should return empty array for empty content', () => {
    expect(parseRobotsTxt('')).toEqual([]);
  });

  it('should handle invalid crawl-delay gracefully', () => {
    const content = `
User-agent: *
Crawl-delay: abc
Disallow: /test
`;

    const rules = parseRobotsTxt(content);

    expect(rules[0].crawlDelay).toBeUndefined();
  });

  it('should handle lines without colon', () => {
    const content = `
User-agent: *
Invalid line here
Disallow: /test
`;

    const rules = parseRobotsTxt(content);

    expect(rules).toHaveLength(1);
    expect(rules[0].disallowed).toEqual(['/test']);
  });

  it('should handle directives before first user-agent', () => {
    const content = `
Disallow: /orphan
User-agent: *
Disallow: /test
`;

    const rules = parseRobotsTxt(content);

    expect(rules).toHaveLength(1);
    expect(rules[0].userAgent).toBe('*');
    expect(rules[0].disallowed).toEqual(['/test']);
  });
});

// ==================== isPathAllowed ====================

describe('isPathAllowed', () => {
  it('should allow path when no rules match', () => {
    expect(isPathAllowed([], '/any-path')).toBe(true);
  });

  it('should block path matching disallow rule', () => {
    const rules = [{ userAgent: '*', disallowed: ['/admin'], allowed: [] }];

    expect(isPathAllowed(rules, '/admin')).toBe(false);
    expect(isPathAllowed(rules, '/admin/users')).toBe(false);
  });

  it('should allow path not matching any disallow rule', () => {
    const rules = [{ userAgent: '*', disallowed: ['/admin'], allowed: [] }];

    expect(isPathAllowed(rules, '/public')).toBe(true);
  });

  it('should block all paths with Disallow: /', () => {
    const rules = [{ userAgent: '*', disallowed: ['/'], allowed: [] }];

    expect(isPathAllowed(rules, '/anything')).toBe(false);
    expect(isPathAllowed(rules, '/page/sub')).toBe(false);
  });

  it('should allow path when allow is more specific than disallow', () => {
    const rules = [
      { userAgent: '*', disallowed: ['/'], allowed: ['/public/docs'] },
    ];

    expect(isPathAllowed(rules, '/public/docs/readme')).toBe(true);
  });

  it('should block path when disallow is more specific than allow', () => {
    const rules = [
      { userAgent: '*', disallowed: ['/public/docs/secret'], allowed: ['/public'] },
    ];

    expect(isPathAllowed(rules, '/public/docs/secret/file')).toBe(false);
  });

  it('should prefer allow when lengths are equal', () => {
    const rules = [
      { userAgent: '*', disallowed: ['/test'], allowed: ['/test'] },
    ];

    expect(isPathAllowed(rules, '/test/page')).toBe(true);
  });

  it('should use specific user-agent over wildcard', () => {
    const rules = [
      { userAgent: '*', disallowed: ['/blocked'], allowed: [] },
      { userAgent: 'MilesControl', disallowed: [], allowed: [] },
    ];

    expect(isPathAllowed(rules, '/blocked', 'MilesControl')).toBe(true);
  });

  it('should fall back to wildcard when no specific match', () => {
    const rules = [
      { userAgent: '*', disallowed: ['/blocked'], allowed: [] },
      { userAgent: 'Googlebot', disallowed: [], allowed: [] },
    ];

    expect(isPathAllowed(rules, '/blocked', 'OtherBot')).toBe(false);
  });

  it('should handle wildcard pattern in disallow', () => {
    const rules = [
      { userAgent: '*', disallowed: ['/search*'], allowed: [] },
    ];

    expect(isPathAllowed(rules, '/search?q=test')).toBe(false);
    expect(isPathAllowed(rules, '/searchresults')).toBe(false);
    expect(isPathAllowed(rules, '/about')).toBe(true);
  });
});

// ==================== getCrawlDelay ====================

describe('getCrawlDelay', () => {
  it('should return crawl delay for matching user-agent', () => {
    const rules = [
      { userAgent: 'MilesControl', disallowed: [], allowed: [], crawlDelay: 10 },
    ];

    expect(getCrawlDelay(rules, 'MilesControl')).toBe(10);
  });

  it('should return wildcard crawl delay as fallback', () => {
    const rules = [
      { userAgent: '*', disallowed: [], allowed: [], crawlDelay: 5 },
    ];

    expect(getCrawlDelay(rules, 'AnyBot')).toBe(5);
  });

  it('should return undefined when no crawl delay set', () => {
    const rules = [
      { userAgent: '*', disallowed: ['/test'], allowed: [] },
    ];

    expect(getCrawlDelay(rules)).toBeUndefined();
  });

  it('should prefer specific user-agent over wildcard', () => {
    const rules = [
      { userAgent: '*', disallowed: [], allowed: [], crawlDelay: 5 },
      { userAgent: 'MilesControl', disallowed: [], allowed: [], crawlDelay: 2 },
    ];

    expect(getCrawlDelay(rules, 'MilesControl')).toBe(2);
  });
});

// ==================== fetchRobotsTxt ====================

describe('fetchRobotsTxt', () => {
  beforeEach(() => {
    clearRobotsTxtCache();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should fetch and parse robots.txt', async () => {
    const mockResponse = {
      ok: true,
      text: vi.fn().mockResolvedValue('User-agent: *\nDisallow: /admin'),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    const rules = await fetchRobotsTxt('https://example.com');

    expect(fetch).toHaveBeenCalledWith(
      'https://example.com/robots.txt',
      expect.objectContaining({
        headers: { 'User-Agent': 'MilesControl/1.0 (+https://milescontrol.com)' },
      }),
    );
    expect(rules).toHaveLength(1);
    expect(rules[0].disallowed).toEqual(['/admin']);
  });

  it('should return cached result on subsequent calls', async () => {
    const mockResponse = {
      ok: true,
      text: vi.fn().mockResolvedValue('User-agent: *\nDisallow: /test'),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    await fetchRobotsTxt('https://example.com');
    const rules = await fetchRobotsTxt('https://example.com');

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(rules).toHaveLength(1);
  });

  it('should refetch after cache TTL expires', async () => {
    const mockResponse = {
      ok: true,
      text: vi.fn().mockResolvedValue('User-agent: *\nDisallow: /old'),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    vi.useFakeTimers();

    await fetchRobotsTxt('https://example.com', 1000);

    vi.advanceTimersByTime(1500);

    const updatedResponse = {
      ok: true,
      text: vi.fn().mockResolvedValue('User-agent: *\nDisallow: /new'),
    };
    vi.mocked(fetch).mockResolvedValue(updatedResponse as unknown as Response);

    const rules = await fetchRobotsTxt('https://example.com', 1000);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(rules[0].disallowed).toEqual(['/new']);

    vi.useRealTimers();
  });

  it('should return empty rules on HTTP error', async () => {
    const mockResponse = { ok: false, status: 404 };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    const rules = await fetchRobotsTxt('https://example.com');

    expect(rules).toEqual([]);
  });

  it('should return empty rules on network error', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

    const rules = await fetchRobotsTxt('https://example.com');

    expect(rules).toEqual([]);
  });

  it('should cache empty rules on HTTP error to avoid repeated requests', async () => {
    const mockResponse = { ok: false, status: 404 };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    await fetchRobotsTxt('https://example.com');
    await fetchRobotsTxt('https://example.com');

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('should cache empty rules on network error to avoid repeated timeouts', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

    await fetchRobotsTxt('https://timeout.example.com');
    await fetchRobotsTxt('https://timeout.example.com');

    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
