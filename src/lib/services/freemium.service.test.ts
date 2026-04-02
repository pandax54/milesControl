import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    programEnrollment: {
      count: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import {
  FREE_TIER_PROGRAM_LIMIT,
  PremiumFeatureRequiredError,
  ProgramEnrollmentLimitReachedError,
  getFeatureAccessByTier,
  getProgramLimitByTier,
  getUserFreemiumAccessState,
  getUserFreemiumTier,
  canAccessPremiumFeature,
  assertPremiumFeatureAccess,
  assertProgramEnrollmentAvailable,
} from './freemium.service';

const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockEnrollmentCount = vi.mocked(prisma.programEnrollment.count);

describe('freemium.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserFindUnique.mockResolvedValue({ freemiumTier: 'FREE' } as never);
    mockEnrollmentCount.mockResolvedValue(0);
  });

  it('should return the user tier from prisma', async () => {
    const tier = await getUserFreemiumTier('user-1');

    expect(tier).toBe('FREE');
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { freemiumTier: true },
    });
  });

  it('should return feature access by tier', () => {
    expect(getFeatureAccessByTier('FREE').awardFlights).toBe(false);
    expect(getFeatureAccessByTier('PREMIUM').awardFlights).toBe(true);
    expect(getProgramLimitByTier('FREE')).toBe(FREE_TIER_PROGRAM_LIMIT);
    expect(getProgramLimitByTier('PREMIUM')).toBeNull();
  });

  it('should allow premium users to access premium features', async () => {
    mockUserFindUnique.mockResolvedValue({ freemiumTier: 'PREMIUM' } as never);

    await expect(assertPremiumFeatureAccess('user-1', 'benefits')).resolves.toBeUndefined();
    await expect(canAccessPremiumFeature('user-1', 'telegramAlerts')).resolves.toBe(true);
  });

  it('should reject free users from premium features', async () => {
    await expect(assertPremiumFeatureAccess('user-1', 'benefits')).rejects.toThrow(
      PremiumFeatureRequiredError,
    );
    await expect(canAccessPremiumFeature('user-1', 'benefits')).resolves.toBe(false);
  });

  it('should enforce the free tier program limit', async () => {
    mockEnrollmentCount.mockResolvedValue(FREE_TIER_PROGRAM_LIMIT);

    await expect(assertProgramEnrollmentAvailable('user-1')).rejects.toThrow(
      ProgramEnrollmentLimitReachedError,
    );
  });

  it('should skip the program limit for premium users', async () => {
    mockUserFindUnique.mockResolvedValue({ freemiumTier: 'PREMIUM' } as never);

    await expect(assertProgramEnrollmentAvailable('user-1')).resolves.toBeUndefined();
    expect(mockEnrollmentCount).not.toHaveBeenCalled();
  });

  it('should build freemium access state with remaining slots', async () => {
    mockEnrollmentCount.mockResolvedValue(3);

    const state = await getUserFreemiumAccessState('user-1');

    expect(state).toEqual({
      tier: 'FREE',
      programLimit: FREE_TIER_PROGRAM_LIMIT,
      programCount: 3,
      remainingProgramSlots: 2,
      features: expect.objectContaining({
        awardFlights: false,
        telegramAlerts: false,
      }),
    });
  });
});
