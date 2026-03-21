import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { ScrapedPromotion } from '@/lib/scrapers/types';
import type { Promotion, PromoStatus, PromoType } from '@/generated/prisma/client';

// ==================== Constants ====================

const CROSS_SOURCE_DEDUP_WINDOW_DAYS = 30;
const DEFAULT_LIST_LIMIT = 50;

// ==================== Error classes ====================

/** Used by API-layer actions (task 3.9+) when looking up a specific promotion. */
export class PromotionNotFoundError extends Error {
  constructor(promotionId: string) {
    super(`Promotion not found: ${promotionId}`);
    this.name = 'PromotionNotFoundError';
  }
}

// ==================== Program resolution ====================

/**
 * Resolve a scraped program name to its database ID via case-insensitive lookup.
 * Returns null when no matching program is found.
 */
export async function resolveProgramId(programName: string): Promise<string | null> {
  const program = await prisma.program.findFirst({
    where: {
      name: { equals: programName, mode: 'insensitive' },
    },
    select: { id: true },
  });

  return program?.id ?? null;
}

// ==================== Deduplication ====================

/**
 * Find an existing promotion by its source URL (same article, re-scraped).
 */
export async function findBySourceUrl(sourceUrl: string): Promise<Promotion | null> {
  return prisma.promotion.findUnique({
    where: { sourceUrl },
  });
}

/**
 * Find a cross-source duplicate: same promo type, same programs, matching
 * bonus/discount, detected within the dedup time window from a different URL.
 */
export async function findCrossSourceDuplicate(
  scraped: ScrapedPromotion,
  sourceProgramId: string | null,
  destProgramId: string | null,
): Promise<Promotion | null> {
  if (!destProgramId && !sourceProgramId) {
    return null;
  }

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - CROSS_SOURCE_DEDUP_WINDOW_DAYS);

  return prisma.promotion.findFirst({
    where: {
      type: scraped.type,
      sourceProgramId,
      destProgramId,
      ...(scraped.type === 'TRANSFER_BONUS' && scraped.bonusPercent != null
        ? { bonusPercent: scraped.bonusPercent }
        : {}),
      ...(scraped.type === 'POINT_PURCHASE' && scraped.purchaseDiscount != null
        ? { purchaseDiscount: scraped.purchaseDiscount }
        : {}),
      detectedAt: { gte: windowStart },
      sourceUrl: { not: scraped.sourceUrl },
    },
    orderBy: { detectedAt: 'desc' },
  });
}

// ==================== Status helpers ====================

export function computeStatus(deadline: Date | undefined | null): PromoStatus {
  if (!deadline) {
    return 'ACTIVE';
  }
  return deadline.getTime() < Date.now() ? 'EXPIRED' : 'ACTIVE';
}

// ==================== Storage ====================

export interface StorePromotionsResult {
  readonly created: number;
  readonly updated: number;
  readonly duplicates: number;
  readonly failed: number;
  readonly total: number;
}

/**
 * Store scraped promotions: create new ones, update existing (by URL),
 * and skip cross-source duplicates. Optionally updates the ScraperRun
 * record with the number of new promotions created.
 */
export async function storePromotions(
  promotions: readonly ScrapedPromotion[],
  scraperRunId?: string,
): Promise<StorePromotionsResult> {
  let created = 0;
  let updated = 0;
  let duplicates = 0;
  let failed = 0;

  for (const scraped of promotions) {
    try {
      const sourceProgramId = scraped.sourceProgram
        ? await resolveProgramId(scraped.sourceProgram)
        : null;
      const destProgramId = scraped.destinationProgram
        ? await resolveProgramId(scraped.destinationProgram)
        : null;

      const existing = await findBySourceUrl(scraped.sourceUrl);
      if (existing) {
        await updatePromotion(existing.id, scraped, sourceProgramId, destProgramId);
        updated++;
        continue;
      }

      const crossDupe = await findCrossSourceDuplicate(scraped, sourceProgramId, destProgramId);
      if (crossDupe) {
        logger.debug(
          { newUrl: scraped.sourceUrl, existingUrl: crossDupe.sourceUrl },
          'Cross-source duplicate detected, skipping',
        );
        duplicates++;
        continue;
      }

      await createPromotion(scraped, sourceProgramId, destProgramId);
      created++;
    } catch (error) {
      failed++;
      logger.error(
        { err: error, sourceUrl: scraped.sourceUrl },
        'Failed to store promotion',
      );
    }
  }

  if (scraperRunId) {
    try {
      await prisma.scraperRun.update({
        where: { id: scraperRunId },
        data: { newPromos: created },
      });
    } catch (error) {
      logger.error(
        { err: error, scraperRunId, created },
        'Failed to update ScraperRun with new promo count',
      );
    }
  }

  logger.info(
    { created, updated, duplicates, failed, total: promotions.length, scraperRunId },
    'Promotion storage completed',
  );

  return { created, updated, duplicates, failed, total: promotions.length };
}

async function createPromotion(
  scraped: ScrapedPromotion,
  sourceProgramId: string | null,
  destProgramId: string | null,
): Promise<Promotion> {
  return prisma.promotion.create({
    data: {
      title: scraped.title,
      type: scraped.type,
      status: computeStatus(scraped.deadline),
      sourceProgramId,
      destProgramId,
      bonusPercent: scraped.bonusPercent ?? null,
      purchaseDiscount: scraped.purchaseDiscount ?? null,
      minimumTransfer: scraped.minimumTransfer ?? null,
      maxBonusCap: scraped.maxBonusCap ?? null,
      deadline: scraped.deadline ?? null,
      sourceUrl: scraped.sourceUrl,
      sourceSiteName: scraped.sourceName,
      rawContent: scraped.rawContent,
      detectedAt: scraped.detectedAt,
    },
  });
}

async function updatePromotion(
  id: string,
  scraped: ScrapedPromotion,
  sourceProgramId: string | null,
  destProgramId: string | null,
): Promise<Promotion> {
  return prisma.promotion.update({
    where: { id },
    data: {
      title: scraped.title,
      type: scraped.type,
      status: computeStatus(scraped.deadline),
      sourceProgramId,
      destProgramId,
      bonusPercent: scraped.bonusPercent ?? null,
      purchaseDiscount: scraped.purchaseDiscount ?? null,
      minimumTransfer: scraped.minimumTransfer ?? null,
      maxBonusCap: scraped.maxBonusCap ?? null,
      deadline: scraped.deadline ?? null,
      rawContent: scraped.rawContent,
    },
  });
}

// ==================== Expiration management ====================

/**
 * Mark promotions with past deadlines as EXPIRED.
 * Returns the count of promotions marked as expired.
 */
export async function markExpiredPromotions(): Promise<number> {
  const result = await prisma.promotion.updateMany({
    where: {
      status: 'ACTIVE',
      deadline: { lt: new Date() },
    },
    data: {
      status: 'EXPIRED',
    },
  });

  if (result.count > 0) {
    logger.info({ expiredCount: result.count }, 'Marked promotions as expired');
  }

  return result.count;
}

// ==================== Queries ====================

export async function listPromotions(options?: {
  status?: PromoStatus;
  type?: PromoType;
  limit?: number;
}): Promise<Promotion[]> {
  return prisma.promotion.findMany({
    where: {
      ...(options?.status ? { status: options.status } : {}),
      ...(options?.type ? { type: options.type } : {}),
    },
    include: {
      sourceProgram: true,
      destProgram: true,
    },
    orderBy: { detectedAt: 'desc' },
    take: options?.limit ?? DEFAULT_LIST_LIMIT,
  });
}

export async function getPromotionById(id: string): Promise<Promotion | null> {
  return prisma.promotion.findUnique({
    where: { id },
    include: {
      sourceProgram: true,
      destProgram: true,
    },
  });
}
