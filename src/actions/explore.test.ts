import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exploreDestinationsAction } from './explore';

// ==================== Mocks ====================

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/services/explore-destinations.service', () => ({
  exploreDestinations: vi.fn(),
}));

vi.mock('@/lib/services/transfer.service', () => ({
  getUserAverageCostPerMilheiro: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@/lib/services/freemium.service', () => ({
  assertPremiumFeatureAccess: vi.fn(),
  PremiumFeatureRequiredError: class extends Error {
    constructor(feature: string) {
      super(`${feature} premium`);
      this.name = 'PremiumFeatureRequiredError';
    }
  },
}));

import { auth } from '@/lib/auth';
import { exploreDestinations } from '@/lib/services/explore-destinations.service';
import { getUserAverageCostPerMilheiro } from '@/lib/services/transfer.service';
import {
  assertPremiumFeatureAccess,
  PremiumFeatureRequiredError,
} from '@/lib/services/freemium.service';

// ==================== Fixtures ====================

const VALID_PARAMS = {
  origin: 'GRU',
  region: 'EUROPE' as const,
  dateType: 'WEEKENDS' as const,
  cabinClass: 'ECONOMY' as const,
  sortBy: 'BEST_MILES_VALUE' as const,
};

const SAMPLE_DESTINATION = {
  destination: 'LIS',
  destinationLabel: 'Lisbon (LIS)',
  region: 'EUROPE' as const,
  departureDate: '2026-03-27',
  returnDate: '2026-04-03',
  lowestCashPrice: 3200,
  lowestMilesRequired: 50000,
  bestMilesValuePerK: 58,
  bestMilesRating: 'EXCELLENT' as const,
  cashFlightsCount: 2,
  awardFlightsCount: 1,
};

// ==================== Tests ====================

describe('exploreDestinationsAction', () => {
  const mockAuth = vi.mocked(auth);
  const mockExploreDestinations = vi.mocked(exploreDestinations);
  const mockGetUserAvgCost = vi.mocked(getUserAverageCostPerMilheiro);
  const mockAssertPremiumFeatureAccess = vi.mocked(assertPremiumFeatureAccess);

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(null as never);
    mockExploreDestinations.mockResolvedValue([SAMPLE_DESTINATION]);
    mockGetUserAvgCost.mockResolvedValue(14);
    mockAssertPremiumFeatureAccess.mockResolvedValue(undefined);
  });

  it('should return explore results for valid params', async () => {
    const result = await exploreDestinationsAction(VALID_PARAMS);

    expect(result.success).toBe(true);
    expect(result.data?.destinations).toHaveLength(1);
    expect(result.data?.destinations[0].destination).toBe('LIS');
    expect(result.data?.departureDate).toBe('2026-03-27');
    expect(result.data?.returnDate).toBe('2026-04-03');
  });

  it('should pass user avg cost to explore service when authenticated', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } } as never);
    mockGetUserAvgCost.mockResolvedValue(12);

    await exploreDestinationsAction(VALID_PARAMS);

    expect(mockAssertPremiumFeatureAccess).toHaveBeenCalledWith('user-1', 'exploreDestinations');
    expect(mockExploreDestinations).toHaveBeenCalledWith(expect.objectContaining(VALID_PARAMS), 12);
  });

  it('should pass undefined user avg cost when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as never);

    await exploreDestinationsAction(VALID_PARAMS);

    expect(mockExploreDestinations).toHaveBeenCalledWith(
      expect.objectContaining(VALID_PARAMS),
      undefined,
    );
    expect(mockGetUserAvgCost).not.toHaveBeenCalled();
  });

  it('should return empty dates when no destinations found', async () => {
    mockExploreDestinations.mockResolvedValue([]);

    const result = await exploreDestinationsAction(VALID_PARAMS);

    expect(result.success).toBe(true);
    expect(result.data?.destinations).toHaveLength(0);
    expect(result.data?.departureDate).toBe('');
    expect(result.data?.returnDate).toBe('');
  });

  it('should return error for invalid params', async () => {
    const result = await exploreDestinationsAction({
      origin: 'INVALID',
      region: 'EUROPE',
      dateType: 'WEEKENDS',
      cabinClass: 'ECONOMY',
      sortBy: 'BEST_MILES_VALUE',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid explore parameters');
    expect(mockExploreDestinations).not.toHaveBeenCalled();
  });

  it('should return error when service throws', async () => {
    mockExploreDestinations.mockRejectedValue(new Error('Service error'));

    const result = await exploreDestinationsAction(VALID_PARAMS);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Explore search failed. Please try again.');
  });

  it('should pass optional month param for FLEXIBLE date type', async () => {
    const paramsWithMonth = {
      ...VALID_PARAMS,
      dateType: 'FLEXIBLE' as const,
      month: '2026-07',
    };

    const result = await exploreDestinationsAction(paramsWithMonth);

    expect(result.success).toBe(true);
    expect(mockExploreDestinations).toHaveBeenCalledWith(
      expect.objectContaining({ dateType: 'FLEXIBLE', month: '2026-07' }),
      undefined,
    );
  });

  it('should include userAvgCostPerMilheiro in response when authenticated', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } } as never);
    mockGetUserAvgCost.mockResolvedValue(13.5);

    const result = await exploreDestinationsAction(VALID_PARAMS);

    expect(result.data?.userAvgCostPerMilheiro).toBe(13.5);
  });

  it('should return a premium error for free users', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } } as never);
    mockAssertPremiumFeatureAccess.mockRejectedValue(
      new PremiumFeatureRequiredError('exploreDestinations'),
    );

    const result = await exploreDestinationsAction(VALID_PARAMS);

    expect(result.success).toBe(false);
    expect(result.error).toBe('exploreDestinations premium');
    expect(mockExploreDestinations).not.toHaveBeenCalled();
  });
});
