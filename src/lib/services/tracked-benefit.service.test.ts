import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { TrackedBenefit, BenefitType } from '@/generated/prisma/client';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    trackedBenefit: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { prisma } from '@/lib/prisma';
import {
  listBenefits,
  listExpiringBenefits,
  createBenefit,
  updateBenefit,
  markBenefitUsed,
  deleteBenefit,
  BenefitNotFoundError,
  BenefitAlreadyUsedError,
} from './tracked-benefit.service';

const mockFindMany = vi.mocked(prisma.trackedBenefit.findMany);
const mockFindFirst = vi.mocked(prisma.trackedBenefit.findFirst);
const mockCreate = vi.mocked(prisma.trackedBenefit.create);
const mockUpdate = vi.mocked(prisma.trackedBenefit.update);
const mockDelete = vi.mocked(prisma.trackedBenefit.delete);

const MOCK_USER_ID = 'user-123';
const MOCK_BENEFIT_ID = 'benefit-456';

function buildMockBenefit(overrides: Partial<TrackedBenefit> = {}): TrackedBenefit {
  return {
    id: MOCK_BENEFIT_ID,
    userId: MOCK_USER_ID,
    type: 'FREE_NIGHT' as BenefitType,
    programOrCard: 'Clube Smiles',
    description: 'Free night at Marriott',
    quantity: 2,
    remainingQty: 2,
    expirationDate: new Date('2026-12-31'),
    isUsed: false,
    usedAt: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('listBenefits', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return benefits for user ordered by usage, expiration, and creation', async () => {
    mockFindMany.mockResolvedValue([buildMockBenefit()]);

    const result = await listBenefits(MOCK_USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].programOrCard).toBe('Clube Smiles');
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: MOCK_USER_ID },
      orderBy: [{ isUsed: 'asc' }, { expirationDate: 'asc' }, { createdAt: 'desc' }],
    });
  });

  it('should return empty array when user has no benefits', async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await listBenefits(MOCK_USER_ID);

    expect(result).toEqual([]);
  });
});

describe('listExpiringBenefits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should query for benefits expiring within the given days', async () => {
    mockFindMany.mockResolvedValue([buildMockBenefit()]);

    const result = await listExpiringBenefits(MOCK_USER_ID, 30);

    expect(result).toHaveLength(1);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        userId: MOCK_USER_ID,
        isUsed: false,
        expirationDate: {
          not: null,
          lte: new Date('2026-07-01'),
          gte: new Date('2026-06-01'),
        },
      },
      orderBy: { expirationDate: 'asc' },
    });
  });
});

describe('createBenefit', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should create benefit with all fields', async () => {
    mockCreate.mockResolvedValue(buildMockBenefit());

    const result = await createBenefit(MOCK_USER_ID, {
      type: 'FREE_NIGHT',
      programOrCard: 'Clube Smiles',
      description: 'Free night at Marriott',
      quantity: 2,
      expirationDate: '2026-12-31',
      notes: 'Some notes',
    });

    expect(result.programOrCard).toBe('Clube Smiles');
    const createCall = mockCreate.mock.calls[0][0];
    expect(createCall.data.userId).toBe(MOCK_USER_ID);
    expect(createCall.data.type).toBe('FREE_NIGHT');
    expect(createCall.data.quantity).toBe(2);
    expect(createCall.data.remainingQty).toBe(2);
    expect(createCall.data.expirationDate).toEqual(new Date('2026-12-31'));
    expect(createCall.data.notes).toBe('Some notes');
  });

  it('should set expirationDate to null when not provided', async () => {
    mockCreate.mockResolvedValue(buildMockBenefit({ expirationDate: null }));

    await createBenefit(MOCK_USER_ID, {
      type: 'LOUNGE_ACCESS',
      programOrCard: 'Itaú The One',
      description: 'Priority Pass',
      quantity: 1,
    });

    const createCall = mockCreate.mock.calls[0][0];
    expect(createCall.data.expirationDate).toBeNull();
  });

  it('should set notes to null when not provided', async () => {
    mockCreate.mockResolvedValue(buildMockBenefit());

    await createBenefit(MOCK_USER_ID, {
      type: 'TRAVEL_CREDIT',
      programOrCard: 'Amex',
      description: 'Annual credit',
      quantity: 1,
    });

    const createCall = mockCreate.mock.calls[0][0];
    expect(createCall.data.notes).toBeNull();
  });

  it('should set remainingQty equal to quantity', async () => {
    mockCreate.mockResolvedValue(buildMockBenefit({ quantity: 5, remainingQty: 5 }));

    await createBenefit(MOCK_USER_ID, {
      type: 'UPGRADE_CREDIT',
      programOrCard: 'Smiles',
      description: 'Upgrade credit',
      quantity: 5,
    });

    const createCall = mockCreate.mock.calls[0][0];
    expect(createCall.data.remainingQty).toBe(5);
  });
});

describe('updateBenefit', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should update benefit fields', async () => {
    mockFindFirst.mockResolvedValue(buildMockBenefit());
    mockUpdate.mockResolvedValue(buildMockBenefit({ description: 'Updated' }));

    const result = await updateBenefit(MOCK_USER_ID, {
      benefitId: MOCK_BENEFIT_ID,
      description: 'Updated',
    });

    expect(result.description).toBe('Updated');
    expect(mockUpdate).toHaveBeenCalledOnce();
  });

  it('should only include provided fields in update', async () => {
    mockFindFirst.mockResolvedValue(buildMockBenefit());
    mockUpdate.mockResolvedValue(buildMockBenefit());

    await updateBenefit(MOCK_USER_ID, {
      benefitId: MOCK_BENEFIT_ID,
      quantity: 5,
    });

    const updateCall = mockUpdate.mock.calls[0][0];
    expect(updateCall.data).toHaveProperty('quantity', 5);
    expect(updateCall.data).not.toHaveProperty('programOrCard');
    expect(updateCall.data).not.toHaveProperty('description');
    expect(updateCall.data).not.toHaveProperty('type');
  });

  it('should set usedAt when marking as used', async () => {
    mockFindFirst.mockResolvedValue(buildMockBenefit());
    mockUpdate.mockResolvedValue(buildMockBenefit({ isUsed: true }));

    await updateBenefit(MOCK_USER_ID, {
      benefitId: MOCK_BENEFIT_ID,
      isUsed: true,
    });

    const updateCall = mockUpdate.mock.calls[0][0];
    expect(updateCall.data.isUsed).toBe(true);
    expect(updateCall.data.usedAt).toBeInstanceOf(Date);
  });

  it('should clear usedAt when marking as not used', async () => {
    mockFindFirst.mockResolvedValue(buildMockBenefit({ isUsed: true }));
    mockUpdate.mockResolvedValue(buildMockBenefit({ isUsed: false }));

    await updateBenefit(MOCK_USER_ID, {
      benefitId: MOCK_BENEFIT_ID,
      isUsed: false,
    });

    const updateCall = mockUpdate.mock.calls[0][0];
    expect(updateCall.data.isUsed).toBe(false);
    expect(updateCall.data.usedAt).toBeNull();
  });

  it('should allow clearing expirationDate with null', async () => {
    mockFindFirst.mockResolvedValue(buildMockBenefit());
    mockUpdate.mockResolvedValue(buildMockBenefit({ expirationDate: null }));

    await updateBenefit(MOCK_USER_ID, {
      benefitId: MOCK_BENEFIT_ID,
      expirationDate: null,
    });

    const updateCall = mockUpdate.mock.calls[0][0];
    expect(updateCall.data.expirationDate).toBeNull();
  });

  it('should throw BenefitNotFoundError when benefit does not exist', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      updateBenefit(MOCK_USER_ID, {
        benefitId: 'nonexistent',
        description: 'Test',
      })
    ).rejects.toThrow(BenefitNotFoundError);

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('should throw BenefitNotFoundError when benefit belongs to another user', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      updateBenefit('other-user', {
        benefitId: MOCK_BENEFIT_ID,
        description: 'Test',
      })
    ).rejects.toThrow(BenefitNotFoundError);
  });
});

describe('markBenefitUsed', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should decrement remainingQty and mark fully used when last unit', async () => {
    mockFindFirst.mockResolvedValue(buildMockBenefit({ quantity: 1, remainingQty: 1 }));
    mockUpdate.mockResolvedValue(buildMockBenefit({ remainingQty: 0, isUsed: true }));

    const result = await markBenefitUsed(MOCK_USER_ID, MOCK_BENEFIT_ID);

    expect(result.isUsed).toBe(true);
    const updateCall = mockUpdate.mock.calls[0][0];
    expect(updateCall.data.remainingQty).toBe(0);
    expect(updateCall.data.isUsed).toBe(true);
    expect(updateCall.data.usedAt).toBeInstanceOf(Date);
  });

  it('should decrement remainingQty but not mark as used when units remain', async () => {
    mockFindFirst.mockResolvedValue(buildMockBenefit({ quantity: 3, remainingQty: 2 }));
    mockUpdate.mockResolvedValue(buildMockBenefit({ remainingQty: 1, isUsed: false }));

    await markBenefitUsed(MOCK_USER_ID, MOCK_BENEFIT_ID);

    const updateCall = mockUpdate.mock.calls[0][0];
    expect(updateCall.data.remainingQty).toBe(1);
    expect(updateCall.data.isUsed).toBe(false);
    expect(updateCall.data.usedAt).toBeNull();
  });

  it('should throw BenefitNotFoundError when benefit does not exist', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      markBenefitUsed(MOCK_USER_ID, 'nonexistent')
    ).rejects.toThrow(BenefitNotFoundError);
  });

  it('should throw BenefitAlreadyUsedError when benefit is already fully used', async () => {
    mockFindFirst.mockResolvedValue(buildMockBenefit({ isUsed: true, remainingQty: 0 }));

    await expect(
      markBenefitUsed(MOCK_USER_ID, MOCK_BENEFIT_ID)
    ).rejects.toThrow(BenefitAlreadyUsedError);

    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe('deleteBenefit', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should delete benefit successfully', async () => {
    const benefit = buildMockBenefit();
    mockFindFirst.mockResolvedValue(benefit);
    mockDelete.mockResolvedValue(benefit);

    await deleteBenefit(MOCK_USER_ID, MOCK_BENEFIT_ID);

    expect(mockDelete).toHaveBeenCalledWith({
      where: { id: MOCK_BENEFIT_ID },
    });
  });

  it('should throw BenefitNotFoundError when benefit does not exist', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      deleteBenefit(MOCK_USER_ID, 'nonexistent')
    ).rejects.toThrow(BenefitNotFoundError);

    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('should throw BenefitNotFoundError when benefit belongs to another user', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      deleteBenefit('other-user', MOCK_BENEFIT_ID)
    ).rejects.toThrow(BenefitNotFoundError);

    expect(mockDelete).not.toHaveBeenCalled();
  });
});
