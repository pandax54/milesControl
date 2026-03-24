import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CheerioAPI } from 'cheerio';
import type { ScraperRun } from '@/generated/prisma/client';
import { BaseScraper, ScraperFetchError } from './base-scraper';
import type { ScrapedPromotion } from './types';
import { SCRAPER_RUN_STATUS } from './types';

// ==================== Mocks ====================

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  createChildLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock('@/lib/services/scraper-run.service', () => ({
  createScraperRun: vi.fn(),
  completeScraperRun: vi.fn(),
}));

vi.mock('./robots-txt', () => ({
  fetchRobotsTxt: vi.fn(),
  isPathAllowed: vi.fn(),
}));

vi.mock('./rate-limiter', () => ({
  enforceRateLimit: vi.fn(),
  sleep: vi.fn().mockResolvedValue(undefined),
}));

import { createScraperRun, completeScraperRun } from '@/lib/services/scraper-run.service';
import { fetchRobotsTxt, isPathAllowed } from './robots-txt';
import { enforceRateLimit } from './rate-limiter';

// ==================== Test scraper ====================

const MOCK_PROMOTIONS: ScrapedPromotion[] = [
  {
    sourceUrl: 'https://blog.example.com/posts',
    sourceName: 'test-blog',
    title: 'Smiles 90% bonus',
    type: 'TRANSFER_BONUS',
    sourceProgram: 'Livelo',
    destinationProgram: 'Smiles',
    bonusPercent: 90,
    rawContent: '<p>Great promo!</p>',
    detectedAt: new Date('2026-03-20T10:00:00Z'),
  },
];

class TestScraper extends BaseScraper {
  public promotionsToReturn: ScrapedPromotion[] = MOCK_PROMOTIONS;
  public extractCallCount = 0;

  constructor() {
    super({
      name: 'test-blog',
      baseUrl: 'https://blog.example.com',
      scraperPath: '/posts',
      delayMs: 100,
      maxRetries: 2,
      retryDelayMs: 50,
    });
  }

  protected extractPromotions(_$: CheerioAPI): ScrapedPromotion[] {
    this.extractCallCount++;
    return this.promotionsToReturn;
  }
}

// ==================== Helpers ====================

function buildMockScraperRun(overrides: Partial<ScraperRun> = {}): ScraperRun {
  return {
    id: 'run-123',
    sourceName: 'test-blog',
    sourceUrl: 'https://blog.example.com/posts',
    status: SCRAPER_RUN_STATUS.RUNNING,
    itemsFound: 0,
    newPromos: 0,
    errorMessage: null,
    durationMs: null,
    startedAt: new Date('2026-03-20T10:00:00Z'),
    completedAt: null,
    ...overrides,
  };
}

function mockSuccessfulFetch(html = '<html><body>Hello</body></html>') {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    text: vi.fn().mockResolvedValue(html),
  }));
}

// ==================== Tests ====================

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createScraperRun).mockResolvedValue(buildMockScraperRun());
  vi.mocked(completeScraperRun).mockResolvedValue(
    buildMockScraperRun({ status: SCRAPER_RUN_STATUS.SUCCESS }),
  );
  vi.mocked(fetchRobotsTxt).mockResolvedValue([]);
  vi.mocked(isPathAllowed).mockReturnValue(true);
  vi.mocked(enforceRateLimit).mockResolvedValue(undefined);
  mockSuccessfulFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('BaseScraper', () => {
  describe('run', () => {
    it('should create a scraper run, fetch, extract, and complete', async () => {
      const scraper = new TestScraper();

      const result = await scraper.run();

      expect(createScraperRun).toHaveBeenCalledWith('test-blog', 'https://blog.example.com/posts');
      expect(result.promotions).toHaveLength(1);
      expect(result.promotions[0].title).toBe('Smiles 90% bonus');
      expect(result.scraperRunId).toBe('run-123');
      expect(completeScraperRun).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'run-123',
          status: SCRAPER_RUN_STATUS.SUCCESS,
          itemsFound: 1,
        }),
      );
    });

    it('should check robots.txt before fetching', async () => {
      const scraper = new TestScraper();

      await scraper.run();

      expect(fetchRobotsTxt).toHaveBeenCalledWith('https://blog.example.com', expect.any(Number));
      expect(isPathAllowed).toHaveBeenCalledWith(
        [],
        '/posts',
        expect.any(String),
      );
    });

    it('should return empty and mark BLOCKED when robots.txt disallows', async () => {
      vi.mocked(isPathAllowed).mockReturnValue(false);
      const scraper = new TestScraper();

      const result = await scraper.run();

      expect(result.promotions).toEqual([]);
      expect(completeScraperRun).toHaveBeenCalledWith(
        expect.objectContaining({
          status: SCRAPER_RUN_STATUS.BLOCKED,
          errorMessage: 'Blocked by robots.txt',
        }),
      );
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should enforce rate limiting before fetching', async () => {
      const scraper = new TestScraper();

      await scraper.run();

      expect(enforceRateLimit).toHaveBeenCalledWith('test-blog', 100);
    });

    it('should call extractPromotions with loaded HTML', async () => {
      mockSuccessfulFetch('<html><body><article>Promo</article></body></html>');
      const scraper = new TestScraper();

      await scraper.run();

      expect(scraper.extractCallCount).toBe(1);
    });

    it('should pass correct headers in fetch request', async () => {
      const scraper = new TestScraper();

      await scraper.run();

      expect(fetch).toHaveBeenCalledWith(
        'https://blog.example.com/posts',
        expect.objectContaining({
          headers: {
            'User-Agent': expect.any(String),
            Accept: 'text/html,application/xhtml+xml',
          },
        }),
      );
    });

    it('should return empty and mark FAILED on fetch error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
      const scraper = new TestScraper();

      const result = await scraper.run();

      expect(result.promotions).toEqual([]);
      expect(completeScraperRun).toHaveBeenCalledWith(
        expect.objectContaining({
          status: SCRAPER_RUN_STATUS.FAILED,
          errorMessage: 'Network error',
        }),
      );
    });

    it('should return empty and mark FAILED on non-ok response after retries', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      }));
      const scraper = new TestScraper();

      const result = await scraper.run();

      expect(result.promotions).toEqual([]);
      expect(fetch).toHaveBeenCalledTimes(2); // maxRetries = 2
      expect(completeScraperRun).toHaveBeenCalledWith(
        expect.objectContaining({
          status: SCRAPER_RUN_STATUS.FAILED,
          errorMessage: expect.stringContaining('503'),
        }),
      );
    });

    it('should retry on fetch failure and succeed on subsequent attempt', async () => {
      const fetchMock = vi.fn()
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({
          ok: true,
          text: vi.fn().mockResolvedValue('<html></html>'),
        });
      vi.stubGlobal('fetch', fetchMock);
      const scraper = new TestScraper();

      const result = await scraper.run();

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(result.promotions).toHaveLength(1);
      expect(completeScraperRun).toHaveBeenCalledWith(
        expect.objectContaining({
          status: SCRAPER_RUN_STATUS.SUCCESS,
        }),
      );
    });

    it('should return empty promotions when extract returns none', async () => {
      const scraper = new TestScraper();
      scraper.promotionsToReturn = [];

      const result = await scraper.run();

      expect(result.promotions).toEqual([]);
      expect(completeScraperRun).toHaveBeenCalledWith(
        expect.objectContaining({
          status: SCRAPER_RUN_STATUS.SUCCESS,
          itemsFound: 0,
        }),
      );
    });

    it('should still return result when persistence fails in error handler', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
      vi.mocked(completeScraperRun).mockRejectedValue(new Error('DB connection lost'));
      const scraper = new TestScraper();

      const result = await scraper.run();

      expect(result.promotions).toEqual([]);
      expect(result.scraperRunId).toBe('run-123');
    });
  });
});

// ==================== ScraperFetchError ====================

describe('ScraperFetchError', () => {
  it('should contain scraper name and status code', () => {
    const error = new ScraperFetchError('test-blog', 404, 'Not Found');

    expect(error.message).toBe('Scraper "test-blog" fetch failed: 404 Not Found');
    expect(error.name).toBe('ScraperFetchError');
    expect(error.statusCode).toBe(404);
  });
});
