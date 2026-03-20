import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    clubTier: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    clubSubscription: {
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
  listClubTiers,
  listSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  ClubTierNotFoundError,
  SubscriptionNotFoundError,
} from './club-subscription.service';

const mockClubTierFindMany = vi.mocked(prisma.clubTier.findMany);
const mockClubTierFindUnique = vi.mocked(prisma.clubTier.findUnique);
const mockSubscriptionFindMany = vi.mocked(prisma.clubSubscription.findMany);
const mockSubscriptionFindFirst = vi.mocked(prisma.clubSubscription.findFirst);
const mockSubscriptionCreate = vi.mocked(prisma.clubSubscription.create);
const mockSubscriptionUpdate = vi.mocked(prisma.clubSubscription.update);
const mockSubscriptionDelete = vi.mocked(prisma.clubSubscription.delete);

const MOCK_USER_ID = 'user-123';
const MOCK_TIER_ID = 'tier-smiles-2000';
const MOCK_SUBSCRIPTION_ID = 'sub-456';

const mockClubTier = {
  id: MOCK_TIER_ID,
  programId: 'prog-smiles',
  name: 'Clube Smiles 2.000',
  monthlyPrice: 73.8,
  baseMonthlyMiles: 2000,
  minimumStayMonths: 12,
  benefits: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  program: { id: 'prog-smiles', name: 'Smiles', type: 'AIRLINE' as const },
};

const mockSubscription = {
  id: MOCK_SUBSCRIPTION_ID,
  userId: MOCK_USER_ID,
  clubTierId: MOCK_TIER_ID,
  status: 'ACTIVE' as const,
  startDate: new Date('2026-01-01'),
  endDate: null,
  monthlyCost: 73.8,
  accrualSchedule: [{ fromMonth: 1, toMonth: null, milesPerMonth: 2000 }],
  totalMilesAccrued: 0,
  nextBillingDate: new Date('2026-04-01'),
  createdAt: new Date(),
  updatedAt: new Date(),
  clubTier: {
    ...mockClubTier,
    program: { id: 'prog-smiles', name: 'Smiles', type: 'AIRLINE' as const, currency: 'miles', website: 'https://smiles.com.br' },
  },
};

describe('listClubTiers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return all club tiers with program data', async () => {
    mockClubTierFindMany.mockResolvedValue([mockClubTier] as never);

    const result = await listClubTiers();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Clube Smiles 2.000');
    expect(mockClubTierFindMany).toHaveBeenCalledWith({
      include: {
        program: { select: { id: true, name: true, type: true } },
      },
      orderBy: [{ program: { name: 'asc' } }, { baseMonthlyMiles: 'asc' }],
    });
  });

  it('should return empty array when no tiers exist', async () => {
    mockClubTierFindMany.mockResolvedValue([]);

    const result = await listClubTiers();

    expect(result).toEqual([]);
  });
});

describe('listSubscriptions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return subscriptions for user with club tier and program', async () => {
    mockSubscriptionFindMany.mockResolvedValue([mockSubscription] as never);

    const result = await listSubscriptions(MOCK_USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].clubTier.name).toBe('Clube Smiles 2.000');
    expect(mockSubscriptionFindMany).toHaveBeenCalledWith({
      where: { userId: MOCK_USER_ID },
      include: {
        clubTier: {
          include: {
            program: {
              select: { id: true, name: true, type: true, currency: true, website: true },
            },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
    });
  });

  it('should return empty array when user has no subscriptions', async () => {
    mockSubscriptionFindMany.mockResolvedValue([]);

    const result = await listSubscriptions(MOCK_USER_ID);

    expect(result).toEqual([]);
  });
});

describe('createSubscription', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should create subscription successfully', async () => {
    mockClubTierFindUnique.mockResolvedValue(mockClubTier as never);
    mockSubscriptionCreate.mockResolvedValue(mockSubscription as never);

    const result = await createSubscription(MOCK_USER_ID, {
      clubTierId: MOCK_TIER_ID,
      startDate: '2026-01-01',
      monthlyCost: 73.8,
      accrualSchedule: [{ fromMonth: 1, toMonth: null, milesPerMonth: 2000 }],
    });

    expect(result.clubTier.name).toBe('Clube Smiles 2.000');
    expect(mockSubscriptionCreate).toHaveBeenCalledOnce();
    const createCall = mockSubscriptionCreate.mock.calls[0][0];
    expect(createCall.data.userId).toBe(MOCK_USER_ID);
    expect(createCall.data.clubTierId).toBe(MOCK_TIER_ID);
    expect(createCall.data.startDate).toEqual(new Date('2026-01-01'));
    expect(createCall.data.monthlyCost).toBe(73.8);
  });

  it('should throw ClubTierNotFoundError when tier does not exist', async () => {
    mockClubTierFindUnique.mockResolvedValue(null);

    await expect(
      createSubscription(MOCK_USER_ID, {
        clubTierId: 'nonexistent',
        startDate: '2026-01-01',
        monthlyCost: 73.8,
        accrualSchedule: [{ fromMonth: 1, toMonth: null, milesPerMonth: 2000 }],
      })
    ).rejects.toThrow(ClubTierNotFoundError);

    expect(mockSubscriptionCreate).not.toHaveBeenCalled();
  });

  it('should set nextBillingDate when provided', async () => {
    mockClubTierFindUnique.mockResolvedValue(mockClubTier as never);
    mockSubscriptionCreate.mockResolvedValue(mockSubscription as never);

    await createSubscription(MOCK_USER_ID, {
      clubTierId: MOCK_TIER_ID,
      startDate: '2026-01-01',
      monthlyCost: 73.8,
      accrualSchedule: [{ fromMonth: 1, toMonth: null, milesPerMonth: 2000 }],
      nextBillingDate: '2026-02-01',
    });

    const createCall = mockSubscriptionCreate.mock.calls[0][0];
    expect(createCall.data.nextBillingDate).toEqual(new Date('2026-02-01'));
  });

  it('should set nextBillingDate to null when not provided', async () => {
    mockClubTierFindUnique.mockResolvedValue(mockClubTier as never);
    mockSubscriptionCreate.mockResolvedValue(mockSubscription as never);

    await createSubscription(MOCK_USER_ID, {
      clubTierId: MOCK_TIER_ID,
      startDate: '2026-01-01',
      monthlyCost: 73.8,
      accrualSchedule: [{ fromMonth: 1, toMonth: null, milesPerMonth: 2000 }],
    });

    const createCall = mockSubscriptionCreate.mock.calls[0][0];
    expect(createCall.data.nextBillingDate).toBeNull();
  });
});

describe('updateSubscription', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should update subscription status', async () => {
    mockSubscriptionFindFirst.mockResolvedValue(mockSubscription as never);
    const updated = { ...mockSubscription, status: 'PAUSED' };
    mockSubscriptionUpdate.mockResolvedValue(updated as never);

    const result = await updateSubscription(MOCK_USER_ID, {
      subscriptionId: MOCK_SUBSCRIPTION_ID,
      status: 'PAUSED',
    });

    expect(result.status).toBe('PAUSED');
    expect(mockSubscriptionUpdate).toHaveBeenCalledOnce();
  });

  it('should update monthlyCost', async () => {
    mockSubscriptionFindFirst.mockResolvedValue(mockSubscription as never);
    mockSubscriptionUpdate.mockResolvedValue({ ...mockSubscription, monthlyCost: 89.9 } as never);

    await updateSubscription(MOCK_USER_ID, {
      subscriptionId: MOCK_SUBSCRIPTION_ID,
      monthlyCost: 89.9,
    });

    const updateCall = mockSubscriptionUpdate.mock.calls[0][0];
    expect(updateCall.data).toHaveProperty('monthlyCost', 89.9);
  });

  it('should update accrualSchedule', async () => {
    mockSubscriptionFindFirst.mockResolvedValue(mockSubscription as never);
    mockSubscriptionUpdate.mockResolvedValue(mockSubscription as never);

    const newSchedule = [
      { fromMonth: 1, toMonth: 6, milesPerMonth: 2000 },
      { fromMonth: 7, toMonth: null, milesPerMonth: 1000 },
    ];

    await updateSubscription(MOCK_USER_ID, {
      subscriptionId: MOCK_SUBSCRIPTION_ID,
      accrualSchedule: newSchedule,
    });

    const updateCall = mockSubscriptionUpdate.mock.calls[0][0];
    expect(updateCall.data).toHaveProperty('accrualSchedule', newSchedule);
  });

  it('should update endDate when provided', async () => {
    mockSubscriptionFindFirst.mockResolvedValue(mockSubscription as never);
    mockSubscriptionUpdate.mockResolvedValue(mockSubscription as never);

    await updateSubscription(MOCK_USER_ID, {
      subscriptionId: MOCK_SUBSCRIPTION_ID,
      endDate: '2027-01-01',
    });

    const updateCall = mockSubscriptionUpdate.mock.calls[0][0];
    expect(updateCall.data.endDate).toEqual(new Date('2027-01-01'));
  });

  it('should clear endDate when null', async () => {
    mockSubscriptionFindFirst.mockResolvedValue(mockSubscription as never);
    mockSubscriptionUpdate.mockResolvedValue(mockSubscription as never);

    await updateSubscription(MOCK_USER_ID, {
      subscriptionId: MOCK_SUBSCRIPTION_ID,
      endDate: null,
    });

    const updateCall = mockSubscriptionUpdate.mock.calls[0][0];
    expect(updateCall.data.endDate).toBeNull();
  });

  it('should not include fields that are undefined', async () => {
    mockSubscriptionFindFirst.mockResolvedValue(mockSubscription as never);
    mockSubscriptionUpdate.mockResolvedValue(mockSubscription as never);

    await updateSubscription(MOCK_USER_ID, {
      subscriptionId: MOCK_SUBSCRIPTION_ID,
      status: 'CANCELLED',
    });

    const updateCall = mockSubscriptionUpdate.mock.calls[0][0];
    expect(updateCall.data).toHaveProperty('status', 'CANCELLED');
    expect(updateCall.data).not.toHaveProperty('monthlyCost');
    expect(updateCall.data).not.toHaveProperty('accrualSchedule');
    expect(updateCall.data).not.toHaveProperty('endDate');
    expect(updateCall.data).not.toHaveProperty('nextBillingDate');
  });

  it('should throw SubscriptionNotFoundError when subscription does not exist', async () => {
    mockSubscriptionFindFirst.mockResolvedValue(null);

    await expect(
      updateSubscription(MOCK_USER_ID, {
        subscriptionId: 'nonexistent',
        status: 'PAUSED',
      })
    ).rejects.toThrow(SubscriptionNotFoundError);

    expect(mockSubscriptionUpdate).not.toHaveBeenCalled();
  });

  it('should throw SubscriptionNotFoundError when subscription belongs to another user', async () => {
    mockSubscriptionFindFirst.mockResolvedValue(null);

    await expect(
      updateSubscription('other-user', {
        subscriptionId: MOCK_SUBSCRIPTION_ID,
        status: 'PAUSED',
      })
    ).rejects.toThrow(SubscriptionNotFoundError);
  });
});

describe('deleteSubscription', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should delete subscription successfully', async () => {
    mockSubscriptionFindFirst.mockResolvedValue(mockSubscription as never);
    mockSubscriptionDelete.mockResolvedValue(mockSubscription as never);

    await deleteSubscription(MOCK_USER_ID, MOCK_SUBSCRIPTION_ID);

    expect(mockSubscriptionDelete).toHaveBeenCalledWith({
      where: { id: MOCK_SUBSCRIPTION_ID },
    });
  });

  it('should throw SubscriptionNotFoundError when subscription does not exist', async () => {
    mockSubscriptionFindFirst.mockResolvedValue(null);

    await expect(
      deleteSubscription(MOCK_USER_ID, 'nonexistent')
    ).rejects.toThrow(SubscriptionNotFoundError);

    expect(mockSubscriptionDelete).not.toHaveBeenCalled();
  });

  it('should throw SubscriptionNotFoundError when subscription belongs to another user', async () => {
    mockSubscriptionFindFirst.mockResolvedValue(null);

    await expect(
      deleteSubscription('other-user', MOCK_SUBSCRIPTION_ID)
    ).rejects.toThrow(SubscriptionNotFoundError);

    expect(mockSubscriptionDelete).not.toHaveBeenCalled();
  });
});
