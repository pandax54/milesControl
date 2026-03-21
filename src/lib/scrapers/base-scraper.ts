import { type CheerioAPI, load } from 'cheerio';
import { createChildLogger } from '@/lib/logger';
import { fetchRobotsTxt, isPathAllowed } from './robots-txt';
import { enforceRateLimit, sleep } from './rate-limiter';
import { createScraperRun, completeScraperRun } from '@/lib/services/scraper-run.service';
import type { ScrapedPromotion, ScraperConfig } from './types';
import {
  DEFAULT_DELAY_MS,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY_MS,
  DEFAULT_ROBOTS_TXT_CACHE_TTL_MS,
  DEFAULT_FETCH_TIMEOUT_MS,
  DEFAULT_USER_AGENT,
  SCRAPER_RUN_STATUS,
} from './types';
import type pino from 'pino';

// ==================== Result type ====================

export interface ScraperResult {
  readonly promotions: readonly ScrapedPromotion[];
  readonly scraperRunId: string;
}

// ==================== Abstract base class ====================

export abstract class BaseScraper {
  protected readonly name: string;
  protected readonly baseUrl: string;
  protected readonly scraperPath: string;
  protected readonly delayMs: number;
  protected readonly maxRetries: number;
  protected readonly retryDelayMs: number;
  protected readonly robotsTxtCacheTtlMs: number;
  protected readonly userAgent: string;
  protected readonly log: pino.Logger;

  constructor(config: ScraperConfig) {
    this.name = config.name;
    this.baseUrl = config.baseUrl;
    this.scraperPath = config.scraperPath;
    this.delayMs = config.delayMs ?? DEFAULT_DELAY_MS;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.retryDelayMs = config.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
    this.robotsTxtCacheTtlMs = config.robotsTxtCacheTtlMs ?? DEFAULT_ROBOTS_TXT_CACHE_TTL_MS;
    this.userAgent = config.userAgent ?? DEFAULT_USER_AGENT;
    this.log = createChildLogger({ scraper: this.name });
  }

  async run(): Promise<ScraperResult> {
    const startedAt = new Date();
    const sourceUrl = this.buildUrl();
    const scraperRun = await createScraperRun(this.name, sourceUrl);

    try {
      const isAllowed = await this.checkRobotsTxt();
      if (!isAllowed) {
        this.log.warn({ path: this.scraperPath }, 'Path blocked by robots.txt');
        await completeScraperRun({
          id: scraperRun.id,
          status: SCRAPER_RUN_STATUS.BLOCKED,
          itemsFound: 0,
          newPromos: 0,
          startedAt,
          errorMessage: 'Blocked by robots.txt',
        });
        return { promotions: [], scraperRunId: scraperRun.id };
      }

      await enforceRateLimit(this.name, this.delayMs);

      const html = await this.fetchWithRetry();
      const $ = load(html);
      const promotions = await this.extractPromotions($);

      this.log.info({ itemsFound: promotions.length }, 'Scraping completed');

      await completeScraperRun({
        id: scraperRun.id,
        status: SCRAPER_RUN_STATUS.SUCCESS,
        itemsFound: promotions.length,
        newPromos: 0,
        startedAt,
      });

      return { promotions, scraperRunId: scraperRun.id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log.error({ err: error }, 'Scraping failed');

      try {
        await completeScraperRun({
          id: scraperRun.id,
          status: SCRAPER_RUN_STATUS.FAILED,
          itemsFound: 0,
          newPromos: 0,
          startedAt,
          errorMessage,
        });
      } catch (persistError) {
        this.log.error({ err: persistError, scraperRunId: scraperRun.id }, 'Failed to persist scraper run failure');
      }

      return { promotions: [], scraperRunId: scraperRun.id };
    }
  }

  protected abstract extractPromotions($: CheerioAPI): Promise<ScrapedPromotion[]> | ScrapedPromotion[];

  protected buildUrl(): string {
    return new URL(this.scraperPath, this.baseUrl).toString();
  }

  private async checkRobotsTxt(): Promise<boolean> {
    const rules = await fetchRobotsTxt(this.baseUrl, this.robotsTxtCacheTtlMs);
    return isPathAllowed(rules, this.scraperPath, this.userAgent);
  }

  private async fetchWithRetry(): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(this.buildUrl(), {
          headers: {
            'User-Agent': this.userAgent,
            Accept: 'text/html,application/xhtml+xml',
          },
          signal: AbortSignal.timeout(DEFAULT_FETCH_TIMEOUT_MS),
        });

        if (!response.ok) {
          throw new ScraperFetchError(this.name, response.status, response.statusText);
        }

        return await response.text();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.log.warn(
          { attempt, maxRetries: this.maxRetries, err: lastError },
          'Fetch attempt failed',
        );

        if (attempt < this.maxRetries) {
          const backoffMs = this.retryDelayMs * Math.pow(2, attempt - 1);
          await sleep(backoffMs);
        }
      }
    }

    throw lastError ?? new ScraperFetchError(this.name, 0, 'All retries exhausted');
  }
}

// ==================== Error classes ====================

export class ScraperFetchError extends Error {
  readonly statusCode: number;

  constructor(scraperName: string, statusCode: number, statusText: string) {
    super(`Scraper "${scraperName}" fetch failed: ${statusCode} ${statusText}`);
    this.name = 'ScraperFetchError';
    this.statusCode = statusCode;
  }
}

