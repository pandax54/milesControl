import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { PassageiroDePrimeiraScraper } from '@/lib/scrapers/passageiro-de-primeira';
import { MelhoresCartoesScraper } from '@/lib/scrapers/melhores-cartoes';
import { PontosPraVoarScraper } from '@/lib/scrapers/pontos-pra-voar';
import { ComparemaniaScraper } from '@/lib/scrapers/comparemania';
import { storePromotions, markExpiredPromotions } from '@/lib/services/promotion.service';
import { countConsecutiveFailures } from '@/lib/services/scraper-run.service';
import { processNewPromotions } from '@/lib/services/alert-matcher.service';
import type { BaseScraper } from '@/lib/scrapers/base-scraper';
import type { StorePromotionsResult } from '@/lib/services/promotion.service';
import type { ProcessNewPromotionsResult } from '@/lib/services/alert-matcher.service';

// ==================== Constants ====================

const CONSECUTIVE_FAILURE_SKIP_THRESHOLD = 3;

// ==================== Types ====================

export interface ScraperRunResult {
  readonly scraperName: string;
  readonly skipped: boolean;
  readonly skipReason?: string;
  readonly itemsFound: number;
  readonly storage?: StorePromotionsResult;
  readonly error?: string;
}

export interface ScrapePromosResult {
  readonly scrapers: readonly ScraperRunResult[];
  readonly expiredCount: number;
  readonly totalCreated: number;
  readonly totalUpdated: number;
  readonly totalFailed: number;
  readonly durationMs: number;
  readonly alertMatchResult?: ProcessNewPromotionsResult;
}

// ==================== Scraper registry ====================

function buildScrapers(): BaseScraper[] {
  return [
    new PassageiroDePrimeiraScraper(),
    new MelhoresCartoesScraper(),
    new PontosPraVoarScraper(),
    new ComparemaniaScraper(),
  ];
}

// ==================== Orchestrator ====================

/**
 * Runs all registered scrapers sequentially, stores discovered promotions,
 * and marks expired promotions. Skips scrapers with consecutive failures
 * above the threshold.
 */
export async function runAllScrapers(): Promise<ScrapePromosResult> {
  const runStartTime = new Date();
  const scrapers = buildScrapers();
  const results: ScraperRunResult[] = [];

  logger.info({ scraperCount: scrapers.length }, 'Starting scrape-promos cron');

  for (const scraper of scrapers) {
    const result = await runSingleScraper(scraper);
    results.push(result);
  }

  let expiredCount = 0;
  try {
    expiredCount = await markExpiredPromotions();
  } catch (error) {
    logger.error({ err: error }, 'Failed to mark expired promotions');
  }

  const totalCreated = results.reduce((sum, r) => sum + (r.storage?.created ?? 0), 0);
  const totalUpdated = results.reduce((sum, r) => sum + (r.storage?.updated ?? 0), 0);
  const totalFailed = results.reduce((sum, r) => sum + (r.storage?.failed ?? 0), 0);
  const durationMs = Date.now() - runStartTime.getTime();

  // Trigger alert matching for newly created promotions
  let alertMatchResult: ProcessNewPromotionsResult | undefined;
  if (totalCreated > 0) {
    try {
      const newPromotions = await prisma.promotion.findMany({
        where: { createdAt: { gte: runStartTime } },
        include: { sourceProgram: true, destProgram: true },
      });
      if (newPromotions.length > 0) {
        alertMatchResult = await processNewPromotions(newPromotions);
        logger.info({ alertMatchResult }, 'Alert matching completed after scrape');
      }
    } catch (error) {
      logger.error({ err: error }, 'Alert matching failed after scrape');
    }
  }

  logger.info(
    { totalCreated, totalUpdated, totalFailed, expiredCount, durationMs },
    'Scrape-promos cron completed',
  );

  return {
    scrapers: results,
    expiredCount,
    totalCreated,
    totalUpdated,
    totalFailed,
    durationMs,
    alertMatchResult,
  };
}

async function runSingleScraper(scraper: BaseScraper): Promise<ScraperRunResult> {
  const scraperName = scraper.scraperName;

  try {
    const failures = await countConsecutiveFailures(scraperName);
    if (failures >= CONSECUTIVE_FAILURE_SKIP_THRESHOLD) {
      logger.warn(
        { scraperName, consecutiveFailures: failures },
        'Skipping scraper due to consecutive failures',
      );
      return {
        scraperName,
        skipped: true,
        skipReason: `${failures} consecutive failures`,
        itemsFound: 0,
      };
    }
  } catch (error) {
    // Failure check is non-critical; proceed with the scraper run
    logger.warn({ err: error, scraperName }, 'Failed to check consecutive failures');
  }

  try {
    const { promotions, scraperRunId } = await scraper.run();

    let storage: StorePromotionsResult | undefined;
    if (promotions.length > 0) {
      storage = await storePromotions(promotions, scraperRunId);
    }

    return {
      scraperName,
      skipped: false,
      itemsFound: promotions.length,
      storage,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ err: error, scraperName }, 'Scraper run failed unexpectedly');

    return {
      scraperName,
      skipped: false,
      itemsFound: 0,
      error: errorMessage,
    };
  }
}
