import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ScraperRun } from '@/generated/prisma/client';
import {
  createScraperRun,
  completeScraperRun,
  listScraperRuns,
  getLatestRunBySource,
  countConsecutiveFailures,
} from './scraper-run.service';
import { SCRAPER_RUN_STATUS } from '@/lib/scrapers/types';

// ==================== Mocks ====================

vi.mock('@/lib/prisma', () => ({
  prisma: {
    scraperRun: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { prisma } from '@/lib/prisma';

function buildMockScraperRun(overrides: Partial<ScraperRun> = {}): ScraperRun {
  return {
    id: 'run-1',
    sourceName: 'test-source',
    sourceUrl: 'https://example.com/blog',
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

beforeEach(() => {
  vi.clearAllMocks();
});

// ==================== createScraperRun ====================

describe('createScraperRun', () => {
  it('should create a scraper run with RUNNING status', async () => {
    const mockRun = buildMockScraperRun();
    vi.mocked(prisma.scraperRun.create).mockResolvedValue(mockRun);

    const result = await createScraperRun('test-source', 'https://example.com/blog');

    expect(prisma.scraperRun.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceName: 'test-source',
        sourceUrl: 'https://example.com/blog',
        status: SCRAPER_RUN_STATUS.RUNNING,
      }),
    });
    expect(result.id).toBe('run-1');
  });
});

// ==================== completeScraperRun ====================

describe('completeScraperRun', () => {
  it('should update a scraper run with success status', async () => {
    const startedAt = new Date('2026-03-20T10:00:00Z');
    const completedRun = buildMockScraperRun({
      status: SCRAPER_RUN_STATUS.SUCCESS,
      itemsFound: 5,
      newPromos: 2,
      durationMs: 1500,
      completedAt: new Date('2026-03-20T10:00:01.500Z'),
    });
    vi.mocked(prisma.scraperRun.update).mockResolvedValue(completedRun);

    const result = await completeScraperRun({
      id: 'run-1',
      status: SCRAPER_RUN_STATUS.SUCCESS,
      itemsFound: 5,
      newPromos: 2,
      startedAt,
    });

    expect(prisma.scraperRun.update).toHaveBeenCalledWith({
      where: { id: 'run-1' },
      data: expect.objectContaining({
        status: SCRAPER_RUN_STATUS.SUCCESS,
        itemsFound: 5,
        newPromos: 2,
        errorMessage: null,
      }),
    });
    expect(result.status).toBe(SCRAPER_RUN_STATUS.SUCCESS);
  });

  it('should update a scraper run with failure status and error message', async () => {
    const startedAt = new Date('2026-03-20T10:00:00Z');
    const failedRun = buildMockScraperRun({
      status: SCRAPER_RUN_STATUS.FAILED,
      errorMessage: 'Connection timeout',
    });
    vi.mocked(prisma.scraperRun.update).mockResolvedValue(failedRun);

    const result = await completeScraperRun({
      id: 'run-1',
      status: SCRAPER_RUN_STATUS.FAILED,
      itemsFound: 0,
      newPromos: 0,
      startedAt,
      errorMessage: 'Connection timeout',
    });

    expect(prisma.scraperRun.update).toHaveBeenCalledWith({
      where: { id: 'run-1' },
      data: expect.objectContaining({
        status: SCRAPER_RUN_STATUS.FAILED,
        errorMessage: 'Connection timeout',
      }),
    });
    expect(result.errorMessage).toBe('Connection timeout');
  });

  it('should update a scraper run with blocked status', async () => {
    const startedAt = new Date('2026-03-20T10:00:00Z');
    const blockedRun = buildMockScraperRun({
      status: SCRAPER_RUN_STATUS.BLOCKED,
      errorMessage: 'Blocked by robots.txt',
    });
    vi.mocked(prisma.scraperRun.update).mockResolvedValue(blockedRun);

    const result = await completeScraperRun({
      id: 'run-1',
      status: SCRAPER_RUN_STATUS.BLOCKED,
      itemsFound: 0,
      newPromos: 0,
      startedAt,
      errorMessage: 'Blocked by robots.txt',
    });

    expect(result.status).toBe(SCRAPER_RUN_STATUS.BLOCKED);
  });

  it('should calculate duration from startedAt to now', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-20T10:00:03Z'));

    const startedAt = new Date('2026-03-20T10:00:00Z');
    vi.mocked(prisma.scraperRun.update).mockResolvedValue(
      buildMockScraperRun({ durationMs: 3000 }),
    );

    await completeScraperRun({
      id: 'run-1',
      status: SCRAPER_RUN_STATUS.SUCCESS,
      itemsFound: 0,
      newPromos: 0,
      startedAt,
    });

    expect(prisma.scraperRun.update).toHaveBeenCalledWith({
      where: { id: 'run-1' },
      data: expect.objectContaining({
        durationMs: 3000,
      }),
    });

    vi.useRealTimers();
  });
});

// ==================== listScraperRuns ====================

describe('listScraperRuns', () => {
  it('should list all runs ordered by most recent', async () => {
    const runs = [
      buildMockScraperRun({ id: 'run-2', startedAt: new Date('2026-03-20T11:00:00Z') }),
      buildMockScraperRun({ id: 'run-1', startedAt: new Date('2026-03-20T10:00:00Z') }),
    ];
    vi.mocked(prisma.scraperRun.findMany).mockResolvedValue(runs);

    const result = await listScraperRuns();

    expect(prisma.scraperRun.findMany).toHaveBeenCalledWith({
      where: undefined,
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
    expect(result).toHaveLength(2);
  });

  it('should filter by source name', async () => {
    vi.mocked(prisma.scraperRun.findMany).mockResolvedValue([]);

    await listScraperRuns('passageiro-de-primeira');

    expect(prisma.scraperRun.findMany).toHaveBeenCalledWith({
      where: { sourceName: 'passageiro-de-primeira' },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
  });

  it('should respect custom limit', async () => {
    vi.mocked(prisma.scraperRun.findMany).mockResolvedValue([]);

    await listScraperRuns(undefined, 10);

    expect(prisma.scraperRun.findMany).toHaveBeenCalledWith({
      where: undefined,
      orderBy: { startedAt: 'desc' },
      take: 10,
    });
  });
});

// ==================== getLatestRunBySource ====================

describe('getLatestRunBySource', () => {
  it('should return the most recent run for a source', async () => {
    const latestRun = buildMockScraperRun({ id: 'run-3' });
    vi.mocked(prisma.scraperRun.findFirst).mockResolvedValue(latestRun);

    const result = await getLatestRunBySource('test-source');

    expect(prisma.scraperRun.findFirst).toHaveBeenCalledWith({
      where: { sourceName: 'test-source' },
      orderBy: { startedAt: 'desc' },
    });
    expect(result?.id).toBe('run-3');
  });

  it('should return null when no runs exist', async () => {
    vi.mocked(prisma.scraperRun.findFirst).mockResolvedValue(null);

    const result = await getLatestRunBySource('unknown-source');

    expect(result).toBeNull();
  });
});

// ==================== countConsecutiveFailures ====================

describe('countConsecutiveFailures', () => {
  it('should count consecutive failed runs', async () => {
    vi.mocked(prisma.scraperRun.findMany).mockResolvedValue([
      buildMockScraperRun({ status: SCRAPER_RUN_STATUS.FAILED }),
      buildMockScraperRun({ status: SCRAPER_RUN_STATUS.FAILED }),
      buildMockScraperRun({ status: SCRAPER_RUN_STATUS.SUCCESS }),
    ]);

    const count = await countConsecutiveFailures('test-source');

    expect(count).toBe(2);
  });

  it('should return 0 when latest run is successful', async () => {
    vi.mocked(prisma.scraperRun.findMany).mockResolvedValue([
      buildMockScraperRun({ status: SCRAPER_RUN_STATUS.SUCCESS }),
      buildMockScraperRun({ status: SCRAPER_RUN_STATUS.FAILED }),
    ]);

    const count = await countConsecutiveFailures('test-source');

    expect(count).toBe(0);
  });

  it('should return 3 when all recent runs failed', async () => {
    vi.mocked(prisma.scraperRun.findMany).mockResolvedValue([
      buildMockScraperRun({ status: SCRAPER_RUN_STATUS.FAILED }),
      buildMockScraperRun({ status: SCRAPER_RUN_STATUS.FAILED }),
      buildMockScraperRun({ status: SCRAPER_RUN_STATUS.FAILED }),
    ]);

    const count = await countConsecutiveFailures('test-source');

    expect(count).toBe(3);
  });

  it('should return 0 when no runs exist', async () => {
    vi.mocked(prisma.scraperRun.findMany).mockResolvedValue([]);

    const count = await countConsecutiveFailures('test-source');

    expect(count).toBe(0);
  });

  it('should query only the 3 most recent runs', async () => {
    vi.mocked(prisma.scraperRun.findMany).mockResolvedValue([]);

    await countConsecutiveFailures('test-source');

    expect(prisma.scraperRun.findMany).toHaveBeenCalledWith({
      where: { sourceName: 'test-source' },
      orderBy: { startedAt: 'desc' },
      take: 3,
      select: { status: true },
    });
  });
});
