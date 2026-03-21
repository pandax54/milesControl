import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Promotion, PromoType, PromoStatus, ScraperRun, Program, ProgramType } from '@/generated/prisma/client';
import { Prisma } from '@/generated/prisma/client';
import type { ScrapedPromotion } from '@/lib/scrapers/types';

// ==================== Mocks ====================

vi.mock('@/lib/prisma', () => ({
  prisma: {
    program: {
      findFirst: vi.fn(),
    },
    promotion: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    scraperRun: {
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { prisma } from '@/lib/prisma';
import {
  resolveProgramId,
  findBySourceUrl,
  findCrossSourceDuplicate,
  computeStatus,
  storePromotions,
  markExpiredPromotions,
  listPromotions,
  getPromotionById,
  PromotionNotFoundError,
} from './promotion.service';

// ==================== Typed mock accessors ====================

const mockProgramFindFirst = vi.mocked(prisma.program.findFirst);
const mockPromoFindUnique = vi.mocked(prisma.promotion.findUnique);
const mockPromoFindFirst = vi.mocked(prisma.promotion.findFirst);
const mockPromoFindMany = vi.mocked(prisma.promotion.findMany);
const mockPromoCreate = vi.mocked(prisma.promotion.create);
const mockPromoUpdate = vi.mocked(prisma.promotion.update);
const mockPromoUpdateMany = vi.mocked(prisma.promotion.updateMany);
const mockScraperRunUpdate = vi.mocked(prisma.scraperRun.update);

// ==================== Factories ====================

function buildMockPromotion(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: 'promo-1',
    title: 'Smiles 90% bonus',
    type: 'TRANSFER_BONUS' as PromoType,
    status: 'ACTIVE' as PromoStatus,
    sourceProgramId: 'prog-livelo',
    destProgramId: 'prog-smiles',
    bonusPercent: 90,
    purchaseDiscount: null,
    purchasePricePerK: null,
    minimumTransfer: null,
    maxBonusCap: null,
    deadline: new Date('2026-04-01'),
    sourceUrl: 'https://blog.example.com/promo-1',
    sourceSiteName: 'Test Blog',
    rawContent: 'Raw content here',
    costPerMilheiro: null,
    rating: null,
    isVerified: false,
    requiresClub: false,
    clubExtraBonus: null,
    detectedAt: new Date('2026-03-20T10:00:00Z'),
    createdAt: new Date('2026-03-20T10:00:00Z'),
    updatedAt: new Date('2026-03-20T10:00:00Z'),
    ...overrides,
  };
}

function buildMockProgram(overrides: Partial<Program> = {}): Program {
  return {
    id: 'prog-default',
    name: 'Default Program',
    type: 'AIRLINE' as ProgramType,
    currency: 'miles',
    logoUrl: null,
    website: null,
    transferPartners: null,
    createdAt: new Date('2026-03-20T10:00:00Z'),
    updatedAt: new Date('2026-03-20T10:00:00Z'),
    ...overrides,
  };
}

function buildMockScraperRun(overrides: Partial<ScraperRun> = {}): ScraperRun {
  return {
    id: 'run-1',
    sourceName: 'test-source',
    sourceUrl: 'https://example.com/blog',
    status: 'SUCCESS',
    itemsFound: 0,
    newPromos: 0,
    errorMessage: null,
    durationMs: null,
    startedAt: new Date('2026-03-20T10:00:00Z'),
    completedAt: null,
    ...overrides,
  };
}

function buildScrapedPromotion(overrides: Partial<ScrapedPromotion> = {}): ScrapedPromotion {
  return {
    sourceUrl: 'https://blog.example.com/promo-new',
    sourceName: 'Test Blog',
    title: 'Livelo → Smiles 90% bonus',
    type: 'TRANSFER_BONUS' as PromoType,
    sourceProgram: 'Livelo',
    destinationProgram: 'Smiles',
    bonusPercent: 90,
    rawContent: 'Transfer your Livelo points to Smiles with 90% bonus',
    detectedAt: new Date('2026-03-20T12:00:00Z'),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-03-20T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

// ==================== resolveProgramId ====================

describe('resolveProgramId', () => {
  it('should return the program id for a matching name', async () => {
    mockProgramFindFirst.mockResolvedValue(buildMockProgram({ id: 'prog-smiles', name: 'Smiles' }));

    const result = await resolveProgramId('Smiles');

    expect(mockProgramFindFirst).toHaveBeenCalledWith({
      where: { name: { equals: 'Smiles', mode: 'insensitive' } },
      select: { id: true },
    });
    expect(result).toBe('prog-smiles');
  });

  it('should return null when no program matches', async () => {
    mockProgramFindFirst.mockResolvedValue(null);

    const result = await resolveProgramId('UnknownProgram');

    expect(result).toBeNull();
  });
});

// ==================== findBySourceUrl ====================

describe('findBySourceUrl', () => {
  it('should return existing promotion with matching source URL', async () => {
    const mockPromo = buildMockPromotion();
    mockPromoFindUnique.mockResolvedValue(mockPromo);

    const result = await findBySourceUrl('https://blog.example.com/promo-1');

    expect(mockPromoFindUnique).toHaveBeenCalledWith({
      where: { sourceUrl: 'https://blog.example.com/promo-1' },
    });
    expect(result?.id).toBe('promo-1');
  });

  it('should return null when no promotion matches the URL', async () => {
    mockPromoFindUnique.mockResolvedValue(null);

    const result = await findBySourceUrl('https://unknown.com/xyz');

    expect(result).toBeNull();
  });
});

// ==================== findCrossSourceDuplicate ====================

describe('findCrossSourceDuplicate', () => {
  it('should return null when both program IDs are null', async () => {
    const scraped = buildScrapedPromotion();

    const result = await findCrossSourceDuplicate(scraped, null, null);

    expect(result).toBeNull();
    expect(mockPromoFindFirst).not.toHaveBeenCalled();
  });

  it('should find a cross-source duplicate for TRANSFER_BONUS with matching bonus', async () => {
    const existing = buildMockPromotion({ sourceUrl: 'https://other-blog.com/promo-1' });
    mockPromoFindFirst.mockResolvedValue(existing);

    const scraped = buildScrapedPromotion({ bonusPercent: 90 });
    const result = await findCrossSourceDuplicate(scraped, 'prog-livelo', 'prog-smiles');

    expect(mockPromoFindFirst).toHaveBeenCalledWith({
      where: {
        type: 'TRANSFER_BONUS',
        sourceProgramId: 'prog-livelo',
        destProgramId: 'prog-smiles',
        bonusPercent: 90,
        detectedAt: { gte: expect.any(Date) },
        sourceUrl: { not: scraped.sourceUrl },
      },
      orderBy: { detectedAt: 'desc' },
    });
    expect(result?.id).toBe('promo-1');
  });

  it('should find a cross-source duplicate for POINT_PURCHASE with matching discount', async () => {
    const existing = buildMockPromotion({
      type: 'POINT_PURCHASE' as PromoType,
      purchaseDiscount: 30,
    });
    mockPromoFindFirst.mockResolvedValue(existing);

    const scraped = buildScrapedPromotion({
      type: 'POINT_PURCHASE',
      purchaseDiscount: 30,
      bonusPercent: undefined,
    });
    const result = await findCrossSourceDuplicate(scraped, null, 'prog-livelo');

    expect(mockPromoFindFirst).toHaveBeenCalledWith({
      where: {
        type: 'POINT_PURCHASE',
        sourceProgramId: null,
        destProgramId: 'prog-livelo',
        purchaseDiscount: 30,
        detectedAt: { gte: expect.any(Date) },
        sourceUrl: { not: scraped.sourceUrl },
      },
      orderBy: { detectedAt: 'desc' },
    });
    expect(result).toBeTruthy();
  });

  it('should not include bonusPercent filter for non-TRANSFER_BONUS types', async () => {
    mockPromoFindFirst.mockResolvedValue(null);

    const scraped = buildScrapedPromotion({
      type: 'CLUB_SIGNUP',
      bonusPercent: 50,
      purchaseDiscount: undefined,
    });
    await findCrossSourceDuplicate(scraped, null, 'prog-smiles');

    expect(mockPromoFindFirst).toHaveBeenCalledWith({
      where: {
        type: 'CLUB_SIGNUP',
        sourceProgramId: null,
        destProgramId: 'prog-smiles',
        detectedAt: { gte: expect.any(Date) },
        sourceUrl: { not: scraped.sourceUrl },
      },
      orderBy: { detectedAt: 'desc' },
    });
  });

  it('should return null when no cross-source duplicate found', async () => {
    mockPromoFindFirst.mockResolvedValue(null);

    const scraped = buildScrapedPromotion();
    const result = await findCrossSourceDuplicate(scraped, 'prog-livelo', 'prog-smiles');

    expect(result).toBeNull();
  });

  it('should search within the 30-day dedup window', async () => {
    mockPromoFindFirst.mockResolvedValue(null);

    const scraped = buildScrapedPromotion();
    await findCrossSourceDuplicate(scraped, 'prog-livelo', 'prog-smiles');

    const call = mockPromoFindFirst.mock.calls[0]?.[0];
    const windowDate = (call as { where: { detectedAt: { gte: Date } } }).where.detectedAt.gte;
    const expectedDate = new Date('2026-02-18T12:00:00Z');
    expect(windowDate.getTime()).toBe(expectedDate.getTime());
  });

  it('should match when only destProgramId is provided', async () => {
    mockPromoFindFirst.mockResolvedValue(buildMockPromotion());

    const scraped = buildScrapedPromotion({ type: 'MIXED', bonusPercent: undefined });
    const result = await findCrossSourceDuplicate(scraped, null, 'prog-smiles');

    expect(mockPromoFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sourceProgramId: null,
          destProgramId: 'prog-smiles',
        }),
      }),
    );
    expect(result).toBeTruthy();
  });
});

// ==================== computeStatus ====================

describe('computeStatus', () => {
  it('should return ACTIVE when deadline is null', () => {
    expect(computeStatus(null)).toBe('ACTIVE');
  });

  it('should return ACTIVE when deadline is undefined', () => {
    expect(computeStatus(undefined)).toBe('ACTIVE');
  });

  it('should return ACTIVE when deadline is in the future', () => {
    const futureDate = new Date('2026-04-01T00:00:00Z');
    expect(computeStatus(futureDate)).toBe('ACTIVE');
  });

  it('should return EXPIRED when deadline is in the past', () => {
    const pastDate = new Date('2026-03-01T00:00:00Z');
    expect(computeStatus(pastDate)).toBe('EXPIRED');
  });
});

// ==================== storePromotions ====================

describe('storePromotions', () => {
  const setupProgramResolution = () => {
    mockProgramFindFirst.mockImplementation(((args: {
      where?: { name?: { equals: string } };
    }) => {
      const name = args?.where?.name?.equals;
      if (name?.toLowerCase() === 'livelo') return Promise.resolve({ id: 'prog-livelo' });
      if (name?.toLowerCase() === 'smiles') return Promise.resolve({ id: 'prog-smiles' });
      return Promise.resolve(null);
    }) as typeof mockProgramFindFirst);
  };

  it('should create a new promotion when no duplicate exists', async () => {
    setupProgramResolution();
    mockPromoFindUnique.mockResolvedValue(null);
    mockPromoFindFirst.mockResolvedValue(null);
    mockPromoCreate.mockResolvedValue(buildMockPromotion());

    const scraped = buildScrapedPromotion();
    const result = await storePromotions([scraped]);

    expect(result.created).toBe(1);
    expect(result.updated).toBe(0);
    expect(result.duplicates).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.total).toBe(1);

    expect(mockPromoCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: scraped.title,
        type: 'TRANSFER_BONUS',
        status: 'ACTIVE',
        sourceProgramId: 'prog-livelo',
        destProgramId: 'prog-smiles',
        bonusPercent: 90,
        sourceUrl: scraped.sourceUrl,
        sourceSiteName: 'Test Blog',
      }),
    });
  });

  it('should update an existing promotion when source URL matches', async () => {
    setupProgramResolution();
    const existing = buildMockPromotion({ sourceUrl: 'https://blog.example.com/promo-new' });
    mockPromoFindUnique.mockResolvedValue(existing);
    mockPromoUpdate.mockResolvedValue(existing);

    const scraped = buildScrapedPromotion();
    const result = await storePromotions([scraped]);

    expect(result.created).toBe(0);
    expect(result.updated).toBe(1);
    expect(result.duplicates).toBe(0);

    expect(mockPromoUpdate).toHaveBeenCalledWith({
      where: { id: 'promo-1' },
      data: expect.objectContaining({
        title: scraped.title,
        type: 'TRANSFER_BONUS',
        sourceProgramId: 'prog-livelo',
        destProgramId: 'prog-smiles',
      }),
    });
  });

  it('should skip cross-source duplicates', async () => {
    setupProgramResolution();
    mockPromoFindUnique.mockResolvedValue(null);
    const crossDupe = buildMockPromotion({ sourceUrl: 'https://other-blog.com/promo-1' });
    mockPromoFindFirst.mockResolvedValue(crossDupe);

    const scraped = buildScrapedPromotion();
    const result = await storePromotions([scraped]);

    expect(result.created).toBe(0);
    expect(result.updated).toBe(0);
    expect(result.duplicates).toBe(1);
    expect(mockPromoCreate).not.toHaveBeenCalled();
  });

  it('should process multiple promotions with mixed outcomes', async () => {
    setupProgramResolution();

    const promoNew = buildScrapedPromotion({
      sourceUrl: 'https://blog.example.com/new-promo',
      title: 'New promo',
    });
    const promoExisting = buildScrapedPromotion({
      sourceUrl: 'https://blog.example.com/existing',
      title: 'Existing promo',
    });
    const promoDupe = buildScrapedPromotion({
      sourceUrl: 'https://blog.example.com/dupe',
      title: 'Duplicate promo',
    });

    // First promo: no URL match, no cross-source match → create
    mockPromoFindUnique
      .mockResolvedValueOnce(null)
      // Second promo: URL match → update
      .mockResolvedValueOnce(buildMockPromotion({ id: 'existing-id', sourceUrl: promoExisting.sourceUrl }))
      // Third promo: no URL match → check cross-source
      .mockResolvedValueOnce(null);

    // Cross-source: first call returns null (new promo), second call returns a dupe (third promo)
    mockPromoFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(buildMockPromotion({ sourceUrl: 'https://other.com/same' }));

    mockPromoCreate.mockResolvedValue(buildMockPromotion());
    mockPromoUpdate.mockResolvedValue(buildMockPromotion());

    const result = await storePromotions([promoNew, promoExisting, promoDupe]);

    expect(result.created).toBe(1);
    expect(result.updated).toBe(1);
    expect(result.duplicates).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.total).toBe(3);
  });

  it('should update scraper run with new promo count when scraperRunId is provided', async () => {
    setupProgramResolution();
    mockPromoFindUnique.mockResolvedValue(null);
    mockPromoFindFirst.mockResolvedValue(null);
    mockPromoCreate.mockResolvedValue(buildMockPromotion());
    mockScraperRunUpdate.mockResolvedValue(buildMockScraperRun({ id: 'run-123' }));

    const scraped = buildScrapedPromotion();
    await storePromotions([scraped], 'run-123');

    expect(mockScraperRunUpdate).toHaveBeenCalledWith({
      where: { id: 'run-123' },
      data: { newPromos: 1 },
    });
  });

  it('should still return results when scraperRun update fails', async () => {
    setupProgramResolution();
    mockPromoFindUnique.mockResolvedValue(null);
    mockPromoFindFirst.mockResolvedValue(null);
    mockPromoCreate.mockResolvedValue(buildMockPromotion());
    mockScraperRunUpdate.mockRejectedValue(new Error('ScraperRun not found'));

    const scraped = buildScrapedPromotion();
    const result = await storePromotions([scraped], 'invalid-run-id');

    expect(result.created).toBe(1);
    expect(result.updated).toBe(0);
    expect(result.duplicates).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.total).toBe(1);
    expect(mockScraperRunUpdate).toHaveBeenCalled();
  });

  it('should not update scraper run when scraperRunId is not provided', async () => {
    setupProgramResolution();
    mockPromoFindUnique.mockResolvedValue(null);
    mockPromoFindFirst.mockResolvedValue(null);
    mockPromoCreate.mockResolvedValue(buildMockPromotion());

    await storePromotions([buildScrapedPromotion()]);

    expect(mockScraperRunUpdate).not.toHaveBeenCalled();
  });

  it('should handle promotions without programs', async () => {
    mockProgramFindFirst.mockResolvedValue(null);
    mockPromoFindUnique.mockResolvedValue(null);
    mockPromoFindFirst.mockResolvedValue(null);
    mockPromoCreate.mockResolvedValue(buildMockPromotion());

    const scraped = buildScrapedPromotion({
      sourceProgram: undefined,
      destinationProgram: undefined,
    });
    const result = await storePromotions([scraped]);

    expect(result.created).toBe(1);
    expect(mockPromoCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceProgramId: null,
        destProgramId: null,
      }),
    });
  });

  it('should handle unresolvable program names gracefully', async () => {
    mockProgramFindFirst.mockResolvedValue(null);
    mockPromoFindUnique.mockResolvedValue(null);
    // No cross-source dedup when both programs are null
    mockPromoCreate.mockResolvedValue(buildMockPromotion());

    const scraped = buildScrapedPromotion({
      sourceProgram: 'UnknownSource',
      destinationProgram: 'UnknownDest',
    });
    const result = await storePromotions([scraped]);

    expect(result.created).toBe(1);
    expect(mockPromoCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceProgramId: null,
        destProgramId: null,
      }),
    });
  });

  it('should handle empty promotions array', async () => {
    const result = await storePromotions([]);

    expect(result.created).toBe(0);
    expect(result.updated).toBe(0);
    expect(result.duplicates).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.total).toBe(0);
    expect(mockPromoCreate).not.toHaveBeenCalled();
  });

  it('should increment failed counter and continue when a single promotion fails', async () => {
    setupProgramResolution();

    const promoGood = buildScrapedPromotion({
      sourceUrl: 'https://blog.example.com/good',
      title: 'Good promo',
    });
    const promoBad = buildScrapedPromotion({
      sourceUrl: 'https://blog.example.com/bad',
      title: 'Bad promo',
    });

    // First promo: findUnique fails
    mockPromoFindUnique
      .mockRejectedValueOnce(new Error('DB connection lost'))
      // Second promo: no URL match
      .mockResolvedValueOnce(null);
    mockPromoFindFirst.mockResolvedValue(null);
    mockPromoCreate.mockResolvedValue(buildMockPromotion());

    const result = await storePromotions([promoBad, promoGood]);

    expect(result.failed).toBe(1);
    expect(result.created).toBe(1);
    expect(result.total).toBe(2);
    expect(mockPromoCreate).toHaveBeenCalledTimes(1);
  });

  it('should set status to EXPIRED when deadline is in the past', async () => {
    setupProgramResolution();
    mockPromoFindUnique.mockResolvedValue(null);
    mockPromoFindFirst.mockResolvedValue(null);
    mockPromoCreate.mockResolvedValue(buildMockPromotion());

    const scraped = buildScrapedPromotion({
      deadline: new Date('2026-03-01T00:00:00Z'),
    });
    await storePromotions([scraped]);

    expect(mockPromoCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'EXPIRED',
      }),
    });
  });

  it('should set status to ACTIVE when deadline is in the future', async () => {
    setupProgramResolution();
    mockPromoFindUnique.mockResolvedValue(null);
    mockPromoFindFirst.mockResolvedValue(null);
    mockPromoCreate.mockResolvedValue(buildMockPromotion());

    const scraped = buildScrapedPromotion({
      deadline: new Date('2026-04-01T00:00:00Z'),
    });
    await storePromotions([scraped]);

    expect(mockPromoCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'ACTIVE',
      }),
    });
  });

  it('should set status to ACTIVE when no deadline', async () => {
    setupProgramResolution();
    mockPromoFindUnique.mockResolvedValue(null);
    mockPromoFindFirst.mockResolvedValue(null);
    mockPromoCreate.mockResolvedValue(buildMockPromotion());

    const scraped = buildScrapedPromotion({ deadline: undefined });
    await storePromotions([scraped]);

    expect(mockPromoCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'ACTIVE',
        deadline: null,
      }),
    });
  });

  it('should set optional fields to null when not provided', async () => {
    setupProgramResolution();
    mockPromoFindUnique.mockResolvedValue(null);
    mockPromoFindFirst.mockResolvedValue(null);
    mockPromoCreate.mockResolvedValue(buildMockPromotion());

    const scraped = buildScrapedPromotion({
      bonusPercent: undefined,
      purchaseDiscount: undefined,
      minimumTransfer: undefined,
      maxBonusCap: undefined,
      deadline: undefined,
    });
    await storePromotions([scraped]);

    expect(mockPromoCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        bonusPercent: null,
        purchaseDiscount: null,
        minimumTransfer: null,
        maxBonusCap: null,
        deadline: null,
      }),
    });
  });
});

// ==================== markExpiredPromotions ====================

describe('markExpiredPromotions', () => {
  it('should mark active promotions with past deadlines as expired', async () => {
    mockPromoUpdateMany.mockResolvedValue({ count: 3 } as Prisma.BatchPayload);

    const count = await markExpiredPromotions();

    expect(mockPromoUpdateMany).toHaveBeenCalledWith({
      where: {
        status: 'ACTIVE',
        deadline: { lt: expect.any(Date) },
      },
      data: { status: 'EXPIRED' },
    });
    expect(count).toBe(3);
  });

  it('should return 0 when no promotions need expiring', async () => {
    mockPromoUpdateMany.mockResolvedValue({ count: 0 } as Prisma.BatchPayload);

    const count = await markExpiredPromotions();

    expect(count).toBe(0);
  });
});

// ==================== listPromotions ====================

describe('listPromotions', () => {
  it('should list promotions with default options', async () => {
    mockPromoFindMany.mockResolvedValue([buildMockPromotion()]);

    const result = await listPromotions();

    expect(mockPromoFindMany).toHaveBeenCalledWith({
      where: {},
      include: { sourceProgram: true, destProgram: true },
      orderBy: { detectedAt: 'desc' },
      take: 50,
    });
    expect(result).toHaveLength(1);
  });

  it('should filter by status', async () => {
    mockPromoFindMany.mockResolvedValue([]);

    await listPromotions({ status: 'ACTIVE' });

    expect(mockPromoFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'ACTIVE' },
      }),
    );
  });

  it('should filter by type', async () => {
    mockPromoFindMany.mockResolvedValue([]);

    await listPromotions({ type: 'TRANSFER_BONUS' });

    expect(mockPromoFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { type: 'TRANSFER_BONUS' },
      }),
    );
  });

  it('should filter by both status and type', async () => {
    mockPromoFindMany.mockResolvedValue([]);

    await listPromotions({ status: 'ACTIVE', type: 'POINT_PURCHASE' });

    expect(mockPromoFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'ACTIVE', type: 'POINT_PURCHASE' },
      }),
    );
  });

  it('should respect custom limit', async () => {
    mockPromoFindMany.mockResolvedValue([]);

    await listPromotions({ limit: 10 });

    expect(mockPromoFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
      }),
    );
  });
});

// ==================== getPromotionById ====================

describe('getPromotionById', () => {
  it('should return promotion with included programs', async () => {
    const promo = buildMockPromotion();
    mockPromoFindUnique.mockResolvedValue(promo);

    const result = await getPromotionById('promo-1');

    expect(mockPromoFindUnique).toHaveBeenCalledWith({
      where: { id: 'promo-1' },
      include: { sourceProgram: true, destProgram: true },
    });
    expect(result?.id).toBe('promo-1');
  });

  it('should return null when promotion not found', async () => {
    mockPromoFindUnique.mockResolvedValue(null);

    const result = await getPromotionById('nonexistent');

    expect(result).toBeNull();
  });
});

// ==================== PromotionNotFoundError ====================

describe('PromotionNotFoundError', () => {
  it('should have correct name and message', () => {
    const error = new PromotionNotFoundError('promo-123');

    expect(error.name).toBe('PromotionNotFoundError');
    expect(error.message).toBe('Promotion not found: promo-123');
    expect(error).toBeInstanceOf(Error);
  });
});
