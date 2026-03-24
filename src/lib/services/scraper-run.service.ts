import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { ScraperRunStatus } from '@/lib/scrapers/types';
import { SCRAPER_RUN_STATUS } from '@/lib/scrapers/types';

// ==================== Create / update ====================

export async function createScraperRun(sourceName: string, sourceUrl: string) {
  const run = await prisma.scraperRun.create({
    data: {
      sourceName,
      sourceUrl,
      status: SCRAPER_RUN_STATUS.RUNNING,
      startedAt: new Date(),
    },
  });

  logger.info({ scraperRunId: run.id, sourceName }, 'Scraper run started');

  return run;
}

interface CompleteScraperRunInput {
  readonly id: string;
  readonly status: ScraperRunStatus;
  readonly itemsFound: number;
  readonly newPromos: number;
  readonly startedAt: Date;
  readonly errorMessage?: string;
}

export async function completeScraperRun(input: CompleteScraperRunInput) {
  const completedAt = new Date();
  const durationMs = completedAt.getTime() - input.startedAt.getTime();

  const run = await prisma.scraperRun.update({
    where: { id: input.id },
    data: {
      status: input.status,
      itemsFound: input.itemsFound,
      newPromos: input.newPromos,
      durationMs,
      errorMessage: input.errorMessage ?? null,
      completedAt,
    },
  });

  logger.info(
    { scraperRunId: input.id, status: input.status, durationMs, itemsFound: input.itemsFound },
    'Scraper run completed',
  );

  return run;
}

// ==================== Queries ====================

export async function listScraperRuns(sourceName?: string, limit = 50) {
  return prisma.scraperRun.findMany({
    where: sourceName ? { sourceName } : undefined,
    orderBy: { startedAt: 'desc' },
    take: limit,
  });
}

export async function getLatestRunBySource(sourceName: string) {
  return prisma.scraperRun.findFirst({
    where: { sourceName },
    orderBy: { startedAt: 'desc' },
  });
}

const CONSECUTIVE_FAILURE_THRESHOLD = 3;

export async function countConsecutiveFailures(sourceName: string): Promise<number> {
  const recentRuns = await prisma.scraperRun.findMany({
    where: { sourceName },
    orderBy: { startedAt: 'desc' },
    take: CONSECUTIVE_FAILURE_THRESHOLD,
    select: { status: true },
  });

  let count = 0;
  for (const run of recentRuns) {
    if (run.status === SCRAPER_RUN_STATUS.FAILED) {
      count++;
    } else {
      break;
    }
  }

  return count;
}
