import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Promotion, Program, PromoType, PromoStatus, ProgramType } from '@/generated/prisma/client';

vi.mock('@/lib/services/promotion.service', () => ({
  listPromotions: vi.fn(),
  listPromotionPrograms: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { listPromotions, listPromotionPrograms } from '@/lib/services/promotion.service';
import { fetchPromotionsAction, fetchPromotionProgramsAction } from './promotions';

const mockListPromotions = vi.mocked(listPromotions);
const mockListPrograms = vi.mocked(listPromotionPrograms);

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
    rawContent: 'Raw content',
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
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchPromotionsAction', () => {
  it('should return promotions for valid filters', async () => {
    const promos = [
      { ...buildMockPromotion(), sourceProgram: buildMockProgram({ id: 'prog-livelo', name: 'Livelo' }), destProgram: buildMockProgram({ id: 'prog-smiles', name: 'Smiles' }) },
    ];
    mockListPromotions.mockResolvedValue(promos);

    const result = await fetchPromotionsAction({ status: 'ACTIVE' });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(mockListPromotions).toHaveBeenCalledWith({ status: 'ACTIVE' });
  });

  it('should pass all filters to the service', async () => {
    mockListPromotions.mockResolvedValue([]);

    await fetchPromotionsAction({
      status: 'ACTIVE',
      type: 'TRANSFER_BONUS',
      programId: 'prog-smiles',
      sortBy: 'costPerMilheiro',
      sortOrder: 'asc',
      limit: 25,
    });

    expect(mockListPromotions).toHaveBeenCalledWith({
      status: 'ACTIVE',
      type: 'TRANSFER_BONUS',
      programId: 'prog-smiles',
      sortBy: 'costPerMilheiro',
      sortOrder: 'asc',
      limit: 25,
    });
  });

  it('should accept empty filters', async () => {
    mockListPromotions.mockResolvedValue([]);

    const result = await fetchPromotionsAction({});

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it('should return error for invalid filters', async () => {
    const result = await fetchPromotionsAction({ status: 'INVALID' } as never);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid filter parameters');
    expect(mockListPromotions).not.toHaveBeenCalled();
  });

  it('should handle service errors gracefully', async () => {
    mockListPromotions.mockRejectedValue(new Error('DB connection lost'));

    const result = await fetchPromotionsAction({ status: 'ACTIVE' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to fetch promotions');
  });
});

describe('fetchPromotionProgramsAction', () => {
  it('should return programs list', async () => {
    const programs = [
      { id: 'prog-smiles', name: 'Smiles' },
      { id: 'prog-livelo', name: 'Livelo' },
    ];
    mockListPrograms.mockResolvedValue(programs);

    const result = await fetchPromotionProgramsAction();

    expect(result.success).toBe(true);
    expect(result.data).toEqual(programs);
  });

  it('should return empty array when no programs exist', async () => {
    mockListPrograms.mockResolvedValue([]);

    const result = await fetchPromotionProgramsAction();

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it('should handle service errors gracefully', async () => {
    mockListPrograms.mockRejectedValue(new Error('DB connection lost'));

    const result = await fetchPromotionProgramsAction();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to fetch promotion programs');
  });
});
