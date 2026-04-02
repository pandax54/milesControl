import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PromoType, PromoStatus, ProgramType } from '@/generated/prisma/client';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findMany: vi.fn() },
    promotion: { findUnique: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { prisma } from '@/lib/prisma';
import {
  getPromoClientMatches,
  getPromotionsWithClientMatches,
} from './admin-promo-matching.service';
import { PromotionNotFoundError } from './promotion.service';

const mockUserFindMany = vi.mocked(prisma.user.findMany);
const mockPromotionFindUnique = vi.mocked(prisma.promotion.findUnique);
const mockPromotionFindMany = vi.mocked(prisma.promotion.findMany);

type UserFindManyResult = Awaited<ReturnType<typeof mockUserFindMany>>;
type PromotionFindUniqueResult = Awaited<ReturnType<typeof mockPromotionFindUnique>>;
type PromotionFindManyResult = Awaited<ReturnType<typeof mockPromotionFindMany>>;

const MOCK_ADMIN_ID = 'admin-1';
const MOCK_PROMO_ID = 'promo-1';

// ==================== Factories ====================

function buildMockProgram(overrides: { id?: string; name?: string; type?: string } = {}) {
  return {
    id: overrides.id ?? 'prog-1',
    name: overrides.name ?? 'Test Program',
    type: (overrides.type ?? 'AIRLINE') as ProgramType,
    currency: 'miles',
    logoUrl: null,
    website: null,
    transferPartners: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function buildMockPromotion(overrides: {
  id?: string;
  sourceProgramId?: string | null;
  destProgramId?: string | null;
  bonusPercent?: number | null;
} = {}) {
  return {
    id: overrides.id ?? MOCK_PROMO_ID,
    title: 'Test Promotion',
    type: 'TRANSFER_BONUS' as PromoType,
    status: 'ACTIVE' as PromoStatus,
    sourceProgramId: overrides.sourceProgramId !== undefined ? overrides.sourceProgramId : 'prog-livelo',
    destProgramId: overrides.destProgramId !== undefined ? overrides.destProgramId : 'prog-smiles',
    bonusPercent: overrides.bonusPercent !== undefined ? overrides.bonusPercent : 90,
    purchaseDiscount: null,
    purchasePricePerK: null,
    minimumTransfer: null,
    maxBonusCap: null,
    deadline: null,
    sourceUrl: 'https://example.com/promo',
    sourceSiteName: 'Test Blog',
    rawContent: null,
    costPerMilheiro: null,
    rating: null,
    isVerified: false,
    requiresClub: false,
    clubExtraBonus: null,
    detectedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    sourceProgram: buildMockProgram({ id: 'prog-livelo', name: 'Livelo', type: 'BANKING' }),
    destProgram: buildMockProgram({ id: 'prog-smiles', name: 'Smiles', type: 'AIRLINE' }),
  };
}

function buildMockClient(overrides: {
  id?: string;
  name?: string | null;
  email?: string;
  enrollments?: Array<{ programId: string; currentBalance: number; programName: string }>;
} = {}) {
  return {
    id: overrides.id ?? 'client-1',
    name: overrides.name !== undefined ? overrides.name : 'Test Client',
    email: overrides.email ?? 'client@example.com',
    programEnrollments: (overrides.enrollments ?? []).map((e) => ({
      programId: e.programId,
      currentBalance: e.currentBalance,
      program: { name: e.programName },
    })),
  };
}

// ==================== Tests: getPromoClientMatches ====================

describe('getPromoClientMatches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw PromotionNotFoundError when promotion does not exist', async () => {
    mockPromotionFindUnique.mockResolvedValue(null as unknown as PromotionFindUniqueResult);
    mockUserFindMany.mockResolvedValue([] as unknown as UserFindManyResult);

    await expect(
      getPromoClientMatches(MOCK_ADMIN_ID, MOCK_PROMO_ID),
    ).rejects.toThrow(PromotionNotFoundError);
  });

  it('should return empty matches when admin has no clients', async () => {
    mockPromotionFindUnique.mockResolvedValue(buildMockPromotion() as unknown as PromotionFindUniqueResult);
    mockUserFindMany.mockResolvedValue([] as unknown as UserFindManyResult);

    const result = await getPromoClientMatches(MOCK_ADMIN_ID, MOCK_PROMO_ID);

    expect(result.matchedClientCount).toBe(0);
    expect(result.totalClientCount).toBe(0);
    expect(result.matches).toHaveLength(0);
  });

  it('should match clients enrolled in the source program', async () => {
    mockPromotionFindUnique.mockResolvedValue(buildMockPromotion() as unknown as PromotionFindUniqueResult);
    mockUserFindMany.mockResolvedValue([
      buildMockClient({
        id: 'client-1',
        enrollments: [{ programId: 'prog-livelo', currentBalance: 10000, programName: 'Livelo' }],
      }),
      buildMockClient({
        id: 'client-2',
        email: 'other@example.com',
        enrollments: [{ programId: 'prog-latam', currentBalance: 5000, programName: 'Latam Pass' }],
      }),
    ] as unknown as UserFindManyResult);

    const result = await getPromoClientMatches(MOCK_ADMIN_ID, MOCK_PROMO_ID);

    expect(result.matchedClientCount).toBe(1);
    expect(result.totalClientCount).toBe(2);
    expect(result.matches[0].clientId).toBe('client-1');
    expect(result.matches[0].matchType).toBe('SOURCE');
  });

  it('should match BOTH when client is enrolled in source and destination', async () => {
    mockPromotionFindUnique.mockResolvedValue(buildMockPromotion() as unknown as PromotionFindUniqueResult);
    mockUserFindMany.mockResolvedValue([
      buildMockClient({
        id: 'client-1',
        enrollments: [
          { programId: 'prog-livelo', currentBalance: 10000, programName: 'Livelo' },
          { programId: 'prog-smiles', currentBalance: 50000, programName: 'Smiles' },
        ],
      }),
    ] as unknown as UserFindManyResult);

    const result = await getPromoClientMatches(MOCK_ADMIN_ID, MOCK_PROMO_ID);

    expect(result.matchedClientCount).toBe(1);
    expect(result.matches[0].matchType).toBe('BOTH');
    expect(result.matches[0].relevanceScore).toBe(15);
  });

  it('should sort matches by relevance score descending', async () => {
    mockPromotionFindUnique.mockResolvedValue(buildMockPromotion() as unknown as PromotionFindUniqueResult);
    mockUserFindMany.mockResolvedValue([
      buildMockClient({
        id: 'client-dest',
        email: 'dest@example.com',
        enrollments: [{ programId: 'prog-smiles', currentBalance: 20000, programName: 'Smiles' }],
      }),
      buildMockClient({
        id: 'client-both',
        email: 'both@example.com',
        enrollments: [
          { programId: 'prog-livelo', currentBalance: 10000, programName: 'Livelo' },
          { programId: 'prog-smiles', currentBalance: 5000, programName: 'Smiles' },
        ],
      }),
      buildMockClient({
        id: 'client-source',
        email: 'source@example.com',
        enrollments: [{ programId: 'prog-livelo', currentBalance: 8000, programName: 'Livelo' }],
      }),
    ] as unknown as UserFindManyResult);

    const result = await getPromoClientMatches(MOCK_ADMIN_ID, MOCK_PROMO_ID);

    expect(result.matchedClientCount).toBe(3);
    expect(result.matches[0].clientId).toBe('client-both');
    expect(result.matches[1].clientId).toBe('client-source');
    expect(result.matches[2].clientId).toBe('client-dest');
  });

  it('should include client name and email in results', async () => {
    mockPromotionFindUnique.mockResolvedValue(buildMockPromotion() as unknown as PromotionFindUniqueResult);
    mockUserFindMany.mockResolvedValue([
      buildMockClient({
        id: 'client-1',
        name: 'Alice Silva',
        email: 'alice@example.com',
        enrollments: [{ programId: 'prog-livelo', currentBalance: 5000, programName: 'Livelo' }],
      }),
    ] as unknown as UserFindManyResult);

    const result = await getPromoClientMatches(MOCK_ADMIN_ID, MOCK_PROMO_ID);

    expect(result.matches[0].clientName).toBe('Alice Silva');
    expect(result.matches[0].clientEmail).toBe('alice@example.com');
  });

  it('should handle client with null name', async () => {
    mockPromotionFindUnique.mockResolvedValue(buildMockPromotion() as unknown as PromotionFindUniqueResult);
    mockUserFindMany.mockResolvedValue([
      buildMockClient({
        id: 'client-1',
        name: null,
        email: 'noname@example.com',
        enrollments: [{ programId: 'prog-livelo', currentBalance: 5000, programName: 'Livelo' }],
      }),
    ] as unknown as UserFindManyResult);

    const result = await getPromoClientMatches(MOCK_ADMIN_ID, MOCK_PROMO_ID);

    expect(result.matches[0].clientName).toBeNull();
  });

  it('should return the correct promotionId in summary', async () => {
    mockPromotionFindUnique.mockResolvedValue(buildMockPromotion({ id: 'specific-promo' }) as unknown as PromotionFindUniqueResult);
    mockUserFindMany.mockResolvedValue([] as unknown as UserFindManyResult);

    const result = await getPromoClientMatches(MOCK_ADMIN_ID, 'specific-promo');

    expect(result.promotionId).toBe('specific-promo');
  });
});

// ==================== Tests: getPromotionsWithClientMatches ====================

describe('getPromotionsWithClientMatches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty list when there are no active promotions', async () => {
    mockPromotionFindMany.mockResolvedValue([] as unknown as PromotionFindManyResult);
    mockUserFindMany.mockResolvedValue([] as unknown as UserFindManyResult);

    const result = await getPromotionsWithClientMatches(MOCK_ADMIN_ID);

    expect(result).toHaveLength(0);
  });

  it('should return one entry per promotion', async () => {
    mockPromotionFindMany.mockResolvedValue([
      buildMockPromotion({ id: 'p1' }),
      buildMockPromotion({ id: 'p2' }),
    ] as unknown as PromotionFindManyResult);
    mockUserFindMany.mockResolvedValue([] as unknown as UserFindManyResult);

    const result = await getPromotionsWithClientMatches(MOCK_ADMIN_ID);

    expect(result).toHaveLength(2);
    expect(result[0].promotion.id).toBe('p1');
    expect(result[1].promotion.id).toBe('p2');
  });

  it('should compute match counts per promotion', async () => {
    const promoLiveloToSmiles = buildMockPromotion({
      id: 'p1',
      sourceProgramId: 'prog-livelo',
      destProgramId: 'prog-smiles',
    });
    const promoEsferaToLatam = {
      ...buildMockPromotion({ id: 'p2', sourceProgramId: 'prog-esfera', destProgramId: 'prog-latam' }),
      sourceProgram: buildMockProgram({ id: 'prog-esfera', name: 'Esfera', type: 'BANKING' }),
      destProgram: buildMockProgram({ id: 'prog-latam', name: 'Latam Pass', type: 'AIRLINE' }),
    };

    mockPromotionFindMany.mockResolvedValue([
      promoLiveloToSmiles,
      promoEsferaToLatam,
    ] as unknown as PromotionFindManyResult);

    mockUserFindMany.mockResolvedValue([
      buildMockClient({
        id: 'client-1',
        enrollments: [{ programId: 'prog-livelo', currentBalance: 10000, programName: 'Livelo' }],
      }),
      buildMockClient({
        id: 'client-2',
        email: 'c2@example.com',
        enrollments: [{ programId: 'prog-latam', currentBalance: 5000, programName: 'Latam Pass' }],
      }),
    ] as unknown as UserFindManyResult);

    const result = await getPromotionsWithClientMatches(MOCK_ADMIN_ID);

    const p1 = result.find((r) => r.promotion.id === 'p1');
    const p2 = result.find((r) => r.promotion.id === 'p2');

    expect(p1?.matchedClientCount).toBe(1);
    expect(p1?.totalClientCount).toBe(2);
    expect(p2?.matchedClientCount).toBe(1);
    expect(p2?.totalClientCount).toBe(2);
  });

  it('should include full client match details', async () => {
    mockPromotionFindMany.mockResolvedValue([buildMockPromotion()] as unknown as PromotionFindManyResult);
    mockUserFindMany.mockResolvedValue([
      buildMockClient({
        id: 'client-1',
        name: 'Alice',
        email: 'alice@example.com',
        enrollments: [{ programId: 'prog-livelo', currentBalance: 15000, programName: 'Livelo' }],
      }),
    ] as unknown as UserFindManyResult);

    const result = await getPromotionsWithClientMatches(MOCK_ADMIN_ID);

    expect(result[0].matches).toHaveLength(1);
    expect(result[0].matches[0].clientId).toBe('client-1');
    expect(result[0].matches[0].clientName).toBe('Alice');
    expect(result[0].matches[0].clientEmail).toBe('alice@example.com');
  });

  it('should return zero matched clients when no client is enrolled in promotion programs', async () => {
    mockPromotionFindMany.mockResolvedValue([buildMockPromotion()] as unknown as PromotionFindManyResult);
    mockUserFindMany.mockResolvedValue([
      buildMockClient({
        id: 'client-1',
        enrollments: [{ programId: 'prog-azul', currentBalance: 5000, programName: 'Azul Fidelidade' }],
      }),
    ] as unknown as UserFindManyResult);

    const result = await getPromotionsWithClientMatches(MOCK_ADMIN_ID);

    expect(result[0].matchedClientCount).toBe(0);
    expect(result[0].totalClientCount).toBe(1);
    expect(result[0].matches).toHaveLength(0);
  });

  it('should query only ACTIVE promotions', async () => {
    mockPromotionFindMany.mockResolvedValue([] as unknown as PromotionFindManyResult);
    mockUserFindMany.mockResolvedValue([] as unknown as UserFindManyResult);

    await getPromotionsWithClientMatches(MOCK_ADMIN_ID);

    expect(mockPromotionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'ACTIVE' },
      }),
    );
  });

  it('should query clients with managedById filter', async () => {
    mockPromotionFindMany.mockResolvedValue([] as unknown as PromotionFindManyResult);
    mockUserFindMany.mockResolvedValue([] as unknown as UserFindManyResult);

    await getPromotionsWithClientMatches(MOCK_ADMIN_ID);

    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { managedById: MOCK_ADMIN_ID },
      }),
    );
  });
});
