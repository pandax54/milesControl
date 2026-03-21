import type { PromoType } from '@/generated/prisma/client';

// ==================== Scraped promotion (output of each scraper) ====================

export interface ScrapedPromotion {
  readonly sourceUrl: string;
  readonly sourceName: string;
  readonly title: string;
  readonly type: PromoType;
  readonly sourceProgram?: string;
  readonly destinationProgram?: string;
  readonly bonusPercent?: number;
  readonly purchaseDiscount?: number;
  readonly deadline?: Date;
  readonly minimumTransfer?: number;
  readonly maxBonusCap?: number;
  readonly rawContent: string;
  readonly detectedAt: Date;
}

// ==================== Scraper configuration ====================

export interface ScraperConfig {
  readonly name: string;
  readonly baseUrl: string;
  readonly scraperPath: string;
  readonly delayMs?: number;
  readonly maxRetries?: number;
  readonly retryDelayMs?: number;
  readonly robotsTxtCacheTtlMs?: number;
  readonly userAgent?: string;
}

// ==================== Scraper run statuses ====================

export const SCRAPER_RUN_STATUS = {
  RUNNING: 'RUNNING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  BLOCKED: 'BLOCKED',
} as const;

export type ScraperRunStatus = (typeof SCRAPER_RUN_STATUS)[keyof typeof SCRAPER_RUN_STATUS];

// ==================== Default configuration ====================

export const DEFAULT_DELAY_MS = 2000;
export const DEFAULT_MAX_RETRIES = 3;
export const DEFAULT_RETRY_DELAY_MS = 1000;
export const DEFAULT_ROBOTS_TXT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const DEFAULT_FETCH_TIMEOUT_MS = 30_000;
export const DEFAULT_ROBOTS_TXT_TIMEOUT_MS = 10_000;
export const DEFAULT_USER_AGENT = 'MilesControl/1.0 (+https://milescontrol.com)';
