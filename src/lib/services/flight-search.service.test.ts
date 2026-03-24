import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/integrations/seats-aero', () => ({
  searchAvailability: vi.fn(),
  SeatsAeroError: class SeatsAeroError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'SeatsAeroError';
    }
  },
}));

vi.mock('@/lib/integrations/serp-api', () => ({
  searchCashFlights: vi.fn(),
  SerpApiError: class SerpApiError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'SerpApiError';
    }
  },
}));

import { searchAvailability } from '@/lib/integrations/seats-aero';
import { SeatsAeroError } from '@/lib/integrations/seats-aero';
import { searchCashFlights } from '@/lib/integrations/serp-api';
import { SerpApiError } from '@/lib/integrations/serp-api';
import { searchFlights } from './flight-search.service';
import type { AwardFlight, CashFlight } from './flight-search.service';
import type { FlightSearchParams } from '@/lib/validators/flight-search.schema';

const mockSearchAvailability = vi.mocked(searchAvailability);
const mockSearchCashFlights = vi.mocked(searchCashFlights);

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

function buildAwardFlight(overrides?: Partial<AwardFlight>): AwardFlight {
  return {
    airline: 'Smiles',
    milesRequired: 30000,
    taxes: 250,
    program: 'Smiles',
    cabinClass: 'Economy',
    seatsAvailable: 4,
    source: 'SEATS_AERO',
    ...overrides,
  };
}

function buildCashFlight(overrides?: Partial<CashFlight>): CashFlight {
  return {
    airline: 'LATAM Airlines',
    price: 1200,
    duration: 720,
    stops: 0,
    departureTime: '2026-05-01T10:00:00',
    arrivalTime: '2026-05-01T22:00:00',
    source: 'GOOGLE_FLIGHTS',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchAvailability.mockResolvedValue([]);
  mockSearchCashFlights.mockResolvedValue([]);
});

describe('searchFlights', () => {
  it('should return award flights from Seats.aero', async () => {
    const awardFlight = buildAwardFlight();
    mockSearchAvailability.mockResolvedValue([awardFlight]);

    const result = await searchFlights(buildParams());

    expect(result.awardFlights).toHaveLength(1);
    expect(result.awardFlights[0]).toEqual(awardFlight);
  });

  it('should call Seats.aero with correct params', async () => {
    await searchFlights(
      buildParams({ origin: 'GRU', destination: 'CDG', cabinClass: 'BUSINESS' }),
    );

    expect(mockSearchAvailability).toHaveBeenCalledWith(
      expect.objectContaining({
        originAirport: 'GRU',
        destinationAirport: 'CDG',
        cabinClass: 'BUSINESS',
        startDate: '2026-05-01',
        endDate: '2026-05-01',
      }),
    );
  });

  it('should use returnDate as endDate when provided', async () => {
    await searchFlights(buildParams({ returnDate: '2026-05-10' }));

    expect(mockSearchAvailability).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: '2026-05-01',
        endDate: '2026-05-10',
      }),
    );
  });

  it('should use departureDate as endDate when returnDate is absent', async () => {
    await searchFlights(buildParams());

    expect(mockSearchAvailability).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: '2026-05-01',
        endDate: '2026-05-01',
      }),
    );
  });

  it('should return cash flights from SerpApi', async () => {
    const cashFlight = buildCashFlight();
    mockSearchCashFlights.mockResolvedValue([cashFlight]);

    const result = await searchFlights(buildParams());

    expect(result.cashFlights).toHaveLength(1);
    expect(result.cashFlights[0]).toEqual(cashFlight);
  });

  it('should call SerpApi with the same params', async () => {
    const params = buildParams({ origin: 'GRU', destination: 'CDG', cabinClass: 'BUSINESS', passengers: 2 });

    await searchFlights(params);

    expect(mockSearchCashFlights).toHaveBeenCalledWith(params);
  });

  it('should return empty cashFlights when SerpApi fails with SerpApiError', async () => {
    mockSearchCashFlights.mockRejectedValue(new SerpApiError('API key not configured'));

    const result = await searchFlights(buildParams());

    expect(result.cashFlights).toHaveLength(0);
  });

  it('should re-throw unexpected errors from SerpApi', async () => {
    mockSearchCashFlights.mockRejectedValue(new Error('Unexpected SerpApi failure'));

    await expect(searchFlights(buildParams())).rejects.toThrow('Unexpected SerpApi failure');
  });

  it('should return both cash and award flights together', async () => {
    const awardFlight = buildAwardFlight();
    const cashFlight = buildCashFlight();
    mockSearchAvailability.mockResolvedValue([awardFlight]);
    mockSearchCashFlights.mockResolvedValue([cashFlight]);

    const result = await searchFlights(buildParams());

    expect(result.awardFlights).toHaveLength(1);
    expect(result.cashFlights).toHaveLength(1);
  });

  it('should include the search params in the result', async () => {
    const params = buildParams({ cabinClass: 'BUSINESS', passengers: 2 });
    const result = await searchFlights(params);

    expect(result.params.cabinClass).toBe('BUSINESS');
    expect(result.params.passengers).toBe(2);
  });

  it('should return a searchedAt date', async () => {
    const before = new Date();
    const result = await searchFlights(buildParams());
    const after = new Date();

    expect(result.searchedAt).toBeInstanceOf(Date);
    expect(result.searchedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.searchedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should return empty award flights when Seats.aero fails with SeatsAeroError', async () => {
    mockSearchAvailability.mockRejectedValue(new SeatsAeroError('API key not configured'));

    const result = await searchFlights(buildParams());

    expect(result.awardFlights).toHaveLength(0);
  });

  it('should re-throw unexpected errors from Seats.aero', async () => {
    mockSearchAvailability.mockRejectedValue(new Error('Unexpected failure'));

    await expect(searchFlights(buildParams())).rejects.toThrow('Unexpected failure');
  });

  it('should include returnDate in params when provided', async () => {
    const params = buildParams({ returnDate: '2026-05-10' });
    const result = await searchFlights(params);

    expect(result.params.returnDate).toBe('2026-05-10');
  });

  it('should return multiple award flights', async () => {
    const flights = [
      buildAwardFlight({ program: 'Smiles', milesRequired: 25000 }),
      buildAwardFlight({ program: 'Azul Fidelidade', milesRequired: 28000 }),
    ];
    mockSearchAvailability.mockResolvedValue(flights);

    const result = await searchFlights(buildParams());

    expect(result.awardFlights).toHaveLength(2);
  });
});
