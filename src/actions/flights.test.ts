import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/services/flight-search.service', () => ({
  searchFlights: vi.fn(),
}));

vi.mock('@/lib/services/transfer.service', () => ({
  getUserAverageCostPerMilheiro: vi.fn(),
}));

import { auth } from '@/lib/auth';
import { searchFlights } from '@/lib/services/flight-search.service';
import { getUserAverageCostPerMilheiro } from '@/lib/services/transfer.service';
import { searchFlightsAction } from './flights';
import type { FlightSearchResult } from '@/lib/services/flight-search.service';
import type { FlightSearchParams } from '@/lib/validators/flight-search.schema';

const mockAuth = vi.mocked(auth);
const mockSearchFlights = vi.mocked(searchFlights);
const mockGetUserAvgCost = vi.mocked(getUserAverageCostPerMilheiro);

function buildParams(overrides?: Partial<FlightSearchParams>): FlightSearchParams {
  return {
    origin: 'GRU',
    destination: 'LIS',
    departureDate: '2026-05-01',
    passengers: 1,
    cabinClass: 'ECONOMY',
    ...overrides,
  };
}

function buildSearchResult(overrides?: Partial<FlightSearchResult>): FlightSearchResult {
  return {
    params: buildParams(),
    cashFlights: [],
    awardFlights: [],
    searchedAt: new Date('2026-03-24T10:00:00Z'),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('searchFlightsAction', () => {
  it('should return search results for valid params', async () => {
    const result = buildSearchResult();
    mockSearchFlights.mockResolvedValue(result);
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as unknown as Awaited<ReturnType<typeof auth>>);
    mockGetUserAvgCost.mockResolvedValue(null);

    const response = await searchFlightsAction(buildParams());

    expect(response.success).toBe(true);
    expect(response.data?.cashFlights).toEqual([]);
    expect(response.data?.awardFlights).toEqual([]);
    expect(mockSearchFlights).toHaveBeenCalledOnce();
  });

  it('should include userAvgCostPerMilheiro when user has transfer history', async () => {
    const result = buildSearchResult();
    mockSearchFlights.mockResolvedValue(result);
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as unknown as Awaited<ReturnType<typeof auth>>);
    mockGetUserAvgCost.mockResolvedValue(13.5);

    const response = await searchFlightsAction(buildParams());

    expect(response.success).toBe(true);
    expect(response.data?.userAvgCostPerMilheiro).toBe(13.5);
    expect(response.data?.isUsingPersonalData).toBe(true);
  });

  it('should set isUsingPersonalData false when user has no history', async () => {
    const result = buildSearchResult();
    mockSearchFlights.mockResolvedValue(result);
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as unknown as Awaited<ReturnType<typeof auth>>);
    mockGetUserAvgCost.mockResolvedValue(null);

    const response = await searchFlightsAction(buildParams());

    expect(response.success).toBe(true);
    expect(response.data?.userAvgCostPerMilheiro).toBeUndefined();
    expect(response.data?.isUsingPersonalData).toBe(false);
  });

  it('should skip user avg cost fetch when unauthenticated', async () => {
    const result = buildSearchResult();
    mockSearchFlights.mockResolvedValue(result);
    mockAuth.mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);

    const response = await searchFlightsAction(buildParams());

    expect(response.success).toBe(true);
    expect(mockGetUserAvgCost).not.toHaveBeenCalled();
    expect(response.data?.isUsingPersonalData).toBe(false);
  });

  it('should return error for invalid origin code', async () => {
    const response = await searchFlightsAction(buildParams({ origin: 'GR' }));

    expect(response.success).toBe(false);
    expect(response.error).toBe('Invalid search parameters');
    expect(mockSearchFlights).not.toHaveBeenCalled();
  });

  it('should return error for lowercase IATA code', async () => {
    const response = await searchFlightsAction(buildParams({ origin: 'gru' as unknown as 'GRU' }));

    expect(response.success).toBe(false);
    expect(response.error).toBe('Invalid search parameters');
  });

  it('should return error for invalid date format', async () => {
    const response = await searchFlightsAction(
      buildParams({ departureDate: '01/05/2026' }),
    );

    expect(response.success).toBe(false);
    expect(response.error).toBe('Invalid search parameters');
  });

  it('should return error for passengers out of range', async () => {
    const response = await searchFlightsAction(buildParams({ passengers: 10 }));

    expect(response.success).toBe(false);
    expect(response.error).toBe('Invalid search parameters');
  });

  it('should handle service error', async () => {
    mockSearchFlights.mockRejectedValue(new Error('Network error'));
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as unknown as Awaited<ReturnType<typeof auth>>);
    mockGetUserAvgCost.mockResolvedValue(null);

    const response = await searchFlightsAction(buildParams());

    expect(response.success).toBe(false);
    expect(response.error).toBe('Flight search failed. Please try again.');
  });

  it('should pass cabin class and passengers to search service', async () => {
    const result = buildSearchResult();
    mockSearchFlights.mockResolvedValue(result);
    mockAuth.mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);

    const params = buildParams({ cabinClass: 'BUSINESS', passengers: 2 });
    await searchFlightsAction(params);

    expect(mockSearchFlights).toHaveBeenCalledWith(
      expect.objectContaining({ cabinClass: 'BUSINESS', passengers: 2 }),
    );
  });

  it('should include returnDate when provided', async () => {
    const result = buildSearchResult();
    mockSearchFlights.mockResolvedValue(result);
    mockAuth.mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);

    const params = buildParams({ returnDate: '2026-05-10' });
    await searchFlightsAction(params);

    expect(mockSearchFlights).toHaveBeenCalledWith(
      expect.objectContaining({ returnDate: '2026-05-10' }),
    );
  });
});
