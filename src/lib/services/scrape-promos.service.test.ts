import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { StorePromotionsResult } from '@/lib/services/promotion.service';
import type { ScrapedPromotion } from '@/lib/scrapers/types';

// ==================== Mocks ====================

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  createChildLogger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })),
}));

const mockRun = vi.fn();

function createMockScraperClass(scraperName: string) {
  return class {
    readonly scraperName = scraperName;
    run = mockRun;
  };
}

vi.mock('@/lib/scrapers/passageiro-de-primeira', () => ({
  PassageiroDePrimeiraScraper: createMockScraperClass('Passageiro de Primeira'),
}));

vi.mock('@/lib/scrapers/melhores-cartoes', () => ({
  MelhoresCartoesScraper: createMockScraperClass('Melhores Cartões'),
}));

vi.mock('@/lib/scrapers/pontos-pra-voar', () => ({
  PontosPraVoarScraper: createMockScraperClass('Pontos Pra Voar'),
}));

vi.mock('@/lib/scrapers/comparemania', () => ({
  ComparemaniaScraper: createMockScraperClass('Comparemania'),
}));

vi.mock('@/lib/services/promotion.service', () => ({
  storePromotions: vi.fn(),
  markExpiredPromotions: vi.fn(),
}));

vi.mock('@/lib/services/scraper-run.service', () => ({
  countConsecutiveFailures: vi.fn(),
}));

import { runAllScrapers } from './scrape-promos.service';
import { storePromotions, markExpiredPromotions } from '@/lib/services/promotion.service';
import { countConsecutiveFailures } from '@/lib/services/scraper-run.service';

const mockStorePromotions = vi.mocked(storePromotions);
const mockMarkExpiredPromotions = vi.mocked(markExpiredPromotions);
const mockCountConsecutiveFailures = vi.mocked(countConsecutiveFailures);

// ==================== Helpers ====================

function buildMockPromotion(overrides?: Partial<ScrapedPromotion>): ScrapedPromotion {
  return {
    sourceUrl: 'https://example.com/promo-1',
    sourceName: 'Test Source',
    title: 'Test Promotion',
    type: 'TRANSFER_BONUS',
    rawContent: 'Test raw content',
    detectedAt: new Date('2026-03-21T10:00:00Z'),
    ...overrides,
  };
}

function buildMockStorageResult(overrides?: Partial<StorePromotionsResult>): StorePromotionsResult {
  return {
    created: 1,
    updated: 0,
    duplicates: 0,
    failed: 0,
    total: 1,
    ...overrides,
  };
}

// ==================== Tests ====================

beforeEach(() => {
  vi.clearAllMocks();
  mockCountConsecutiveFailures.mockResolvedValue(0);
  mockMarkExpiredPromotions.mockResolvedValue(0);
});

describe('runAllScrapers', () => {
  it('should run all 4 scrapers and return aggregated results', async () => {
    const promo = buildMockPromotion();
    mockRun.mockResolvedValue({ promotions: [promo], scraperRunId: 'run-1' });
    mockStorePromotions.mockResolvedValue(buildMockStorageResult());

    const result = await runAllScrapers();

    expect(result.scrapers).toHaveLength(4);
    expect(result.totalCreated).toBe(4);
    expect(result.totalUpdated).toBe(0);
    expect(result.totalFailed).toBe(0);
    expect(mockRun).toHaveBeenCalledTimes(4);
    expect(mockStorePromotions).toHaveBeenCalledTimes(4);
  });

  it('should skip scraper with 3 or more consecutive failures', async () => {
    mockCountConsecutiveFailures.mockResolvedValueOnce(3); // PdP — skip
    mockCountConsecutiveFailures.mockResolvedValue(0); // others — run

    const promo = buildMockPromotion();
    mockRun.mockResolvedValue({ promotions: [promo], scraperRunId: 'run-1' });
    mockStorePromotions.mockResolvedValue(buildMockStorageResult());

    const result = await runAllScrapers();

    const skipped = result.scrapers.filter((s) => s.skipped);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].skipReason).toBe('3 consecutive failures');
    expect(mockRun).toHaveBeenCalledTimes(3);
  });

  it('should not skip storage when promotions are empty', async () => {
    mockRun.mockResolvedValue({ promotions: [], scraperRunId: 'run-1' });

    const result = await runAllScrapers();

    expect(mockStorePromotions).not.toHaveBeenCalled();
    expect(result.totalCreated).toBe(0);
    result.scrapers.forEach((s) => {
      expect(s.itemsFound).toBe(0);
      expect(s.storage).toBeUndefined();
    });
  });

  it('should handle scraper run throwing an error', async () => {
    mockRun.mockRejectedValueOnce(new Error('Network timeout')); // PdP fails
    mockRun.mockResolvedValue({ promotions: [], scraperRunId: 'run-2' }); // others succeed

    const result = await runAllScrapers();

    const failed = result.scrapers.find((s) => s.error);
    expect(failed).toBeDefined();
    expect(failed!.error).toBe('Network timeout');
    expect(failed!.skipped).toBe(false);
    expect(failed!.itemsFound).toBe(0);
  });

  it('should mark expired promotions after scraping', async () => {
    mockRun.mockResolvedValue({ promotions: [], scraperRunId: 'run-1' });
    mockMarkExpiredPromotions.mockResolvedValue(5);

    const result = await runAllScrapers();

    expect(result.expiredCount).toBe(5);
    expect(mockMarkExpiredPromotions).toHaveBeenCalledOnce();
  });

  it('should handle markExpiredPromotions failure gracefully', async () => {
    mockRun.mockResolvedValue({ promotions: [], scraperRunId: 'run-1' });
    mockMarkExpiredPromotions.mockRejectedValue(new Error('DB error'));

    const result = await runAllScrapers();

    expect(result.expiredCount).toBe(0);
    // Should not throw — the cron completes despite expiration failure
  });

  it('should proceed when countConsecutiveFailures throws', async () => {
    mockCountConsecutiveFailures.mockRejectedValue(new Error('DB error'));
    mockRun.mockResolvedValue({ promotions: [], scraperRunId: 'run-1' });

    const result = await runAllScrapers();

    // All 4 scrapers should still run
    expect(mockRun).toHaveBeenCalledTimes(4);
    expect(result.scrapers.every((s) => !s.skipped)).toBe(true);
  });

  it('should aggregate created and updated counts from all scrapers', async () => {
    const promo = buildMockPromotion();
    mockRun.mockResolvedValue({ promotions: [promo], scraperRunId: 'run-1' });
    mockStorePromotions
      .mockResolvedValueOnce(buildMockStorageResult({ created: 2, updated: 1, failed: 0, total: 3 }))
      .mockResolvedValueOnce(buildMockStorageResult({ created: 0, updated: 3, failed: 1, total: 4 }))
      .mockResolvedValueOnce(buildMockStorageResult({ created: 1, updated: 0, failed: 0, total: 1 }))
      .mockResolvedValueOnce(buildMockStorageResult({ created: 0, updated: 0, failed: 2, total: 2 }));

    const result = await runAllScrapers();

    expect(result.totalCreated).toBe(3);
    expect(result.totalUpdated).toBe(4);
    expect(result.totalFailed).toBe(3);
  });

  it('should pass scraperRunId to storePromotions', async () => {
    const promo = buildMockPromotion();
    mockRun.mockResolvedValue({ promotions: [promo], scraperRunId: 'specific-run-id' });
    mockStorePromotions.mockResolvedValue(buildMockStorageResult());

    await runAllScrapers();

    expect(mockStorePromotions).toHaveBeenCalledWith([promo], 'specific-run-id');
  });

  it('should include durationMs in result', async () => {
    mockRun.mockResolvedValue({ promotions: [], scraperRunId: 'run-1' });

    const result = await runAllScrapers();

    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(typeof result.durationMs).toBe('number');
  });

  it('should skip scraper with more than 3 consecutive failures', async () => {
    mockCountConsecutiveFailures.mockResolvedValueOnce(3); // first scraper at ceiling
    mockCountConsecutiveFailures.mockResolvedValue(0);

    mockRun.mockResolvedValue({ promotions: [], scraperRunId: 'run-1' });

    const result = await runAllScrapers();

    const skipped = result.scrapers.filter((s) => s.skipped);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].skipReason).toBe('3 consecutive failures');
  });

  it('should not skip scraper with exactly 2 consecutive failures', async () => {
    mockCountConsecutiveFailures.mockResolvedValue(2);
    mockRun.mockResolvedValue({ promotions: [], scraperRunId: 'run-1' });

    const result = await runAllScrapers();

    expect(result.scrapers.every((s) => !s.skipped)).toBe(true);
    expect(mockRun).toHaveBeenCalledTimes(4);
  });
});
