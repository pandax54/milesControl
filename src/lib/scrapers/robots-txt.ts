import { logger } from '@/lib/logger';
import { DEFAULT_ROBOTS_TXT_CACHE_TTL_MS, DEFAULT_ROBOTS_TXT_TIMEOUT_MS, DEFAULT_USER_AGENT } from './types';

// ==================== Types ====================

export interface RobotsRule {
  readonly userAgent: string;
  readonly disallowed: readonly string[];
  readonly allowed: readonly string[];
  readonly crawlDelay?: number;
}

interface RobotsTxtCacheEntry {
  readonly rules: readonly RobotsRule[];
  readonly fetchedAt: number;
}

// ==================== Cache ====================

const cache = new Map<string, RobotsTxtCacheEntry>();

export function clearRobotsTxtCache(): void {
  cache.clear();
}

// ==================== Fetch and parse ====================

export async function fetchRobotsTxt(
  baseUrl: string,
  cacheTtlMs = DEFAULT_ROBOTS_TXT_CACHE_TTL_MS,
): Promise<readonly RobotsRule[]> {
  const cached = cache.get(baseUrl);
  if (cached && Date.now() - cached.fetchedAt < cacheTtlMs) {
    return cached.rules;
  }

  const url = new URL('/robots.txt', baseUrl).toString();

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': DEFAULT_USER_AGENT },
      signal: AbortSignal.timeout(DEFAULT_ROBOTS_TXT_TIMEOUT_MS),
    });

    if (!response.ok) {
      logger.warn({ url, status: response.status }, 'Failed to fetch robots.txt');
      const emptyRules: readonly RobotsRule[] = [];
      cache.set(baseUrl, { rules: emptyRules, fetchedAt: Date.now() });
      return emptyRules;
    }

    const text = await response.text();
    const rules = parseRobotsTxt(text);

    cache.set(baseUrl, { rules, fetchedAt: Date.now() });

    return rules;
  } catch (error) {
    logger.warn({ url, err: error }, 'Error fetching robots.txt');
    const emptyRules: readonly RobotsRule[] = [];
    cache.set(baseUrl, { rules: emptyRules, fetchedAt: Date.now() });
    return emptyRules;
  }
}

// ==================== Parser ====================

export function parseRobotsTxt(content: string): RobotsRule[] {
  const rules: RobotsRule[] = [];
  let currentUserAgent: string | null = null;
  let disallowed: string[] = [];
  let allowed: string[] = [];
  let crawlDelay: number | undefined;

  function flushCurrentRule() {
    if (currentUserAgent !== null) {
      rules.push({ userAgent: currentUserAgent, disallowed, allowed, crawlDelay });
    }
    disallowed = [];
    allowed = [];
    crawlDelay = undefined;
  }

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) continue;

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const directive = line.substring(0, colonIndex).trim().toLowerCase();
    const value = line.substring(colonIndex + 1).trim();

    if (directive === 'user-agent') {
      flushCurrentRule();
      currentUserAgent = value;
    } else if (currentUserAgent !== null) {
      if (directive === 'disallow' && value) {
        disallowed.push(value);
      } else if (directive === 'allow' && value) {
        allowed.push(value);
      } else if (directive === 'crawl-delay') {
        const delay = parseFloat(value);
        if (!isNaN(delay)) {
          crawlDelay = delay;
        }
      }
    }
  }

  flushCurrentRule();

  return rules;
}

// ==================== Path checking ====================

export function isPathAllowed(
  rules: readonly RobotsRule[],
  path: string,
  userAgent = '*',
): boolean {
  const specificRule = rules.find(
    r => r.userAgent.toLowerCase() === userAgent.toLowerCase(),
  );
  const wildcardRule = rules.find(r => r.userAgent === '*');
  const rule = specificRule ?? wildcardRule;

  if (!rule) return true;

  // Find longest matching patterns — longer pattern wins; on tie, allow wins
  let longestDisallow = -1;
  let longestAllow = -1;

  for (const pattern of rule.disallowed) {
    if (matchesPattern(path, pattern)) {
      longestDisallow = Math.max(longestDisallow, pattern.length);
    }
  }

  for (const pattern of rule.allowed) {
    if (matchesPattern(path, pattern)) {
      longestAllow = Math.max(longestAllow, pattern.length);
    }
  }

  if (longestDisallow === -1) return true;
  if (longestAllow === -1) return false;

  return longestAllow >= longestDisallow;
}

function matchesPattern(path: string, pattern: string): boolean {
  if (pattern.endsWith('*')) {
    return path.startsWith(pattern.slice(0, -1));
  }
  return path.startsWith(pattern);
}

// ==================== Crawl delay ====================

export function getCrawlDelay(
  rules: readonly RobotsRule[],
  userAgent = '*',
): number | undefined {
  const specificRule = rules.find(
    r => r.userAgent.toLowerCase() === userAgent.toLowerCase(),
  );
  const wildcardRule = rules.find(r => r.userAgent === '*');
  const rule = specificRule ?? wildcardRule;

  return rule?.crawlDelay;
}
