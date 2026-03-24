import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

vi.mock('@/lib/env', () => ({
  env: {
    SEATS_AERO_API_KEY: 'test-api-key',
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  searchAvailability,
  getTripDetails,
  SeatsAeroError,
  SeatsAeroApiError,
} from './seats-aero';
import type { SeatsAeroSearchParams, SeatsAeroTrip } from './seats-aero';

// ==================== Helpers ====================

function buildSearchParams(overrides?: Partial<SeatsAeroSearchParams>): SeatsAeroSearchParams {
  return {
    originAirport: 'GRU',
    destinationAirport: 'LIS',
    cabinClass: 'ECONOMY',
    startDate: '2026-05-01',
    endDate: '2026-05-01',
    ...overrides,
  };
}

function buildAvailability(overrides?: Record<string, unknown>) {
  return {
    ID: 'trip-123',
    Route: 'GRU-LIS',
    Date: '2026-05-01',
    ParsedDate: '2026-05-01T00:00:00Z',
    YAvailable: true,
    WAvailable: false,
    JAvailable: false,
    FAvailable: false,
    YMileage: 30000,
    WMileage: 0,
    JMileage: 0,
    FMileage: 0,
    YTaxes: 250,
    WTaxes: 0,
    JTaxes: 0,
    FTaxes: 0,
    YSeat: 4,
    WSeat: 0,
    JSeat: 0,
    FSeat: 0,
    Source: 'smiles',
    UpdatedAt: '2026-03-24T10:00:00Z',
    ...overrides,
  };
}

function makeOkResponse(data: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(''),
  });
}

function makeErrorResponse(status: number, text: string) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(text),
  });
}

// ==================== Tests ====================

beforeEach(() => {
  mockFetch.mockReset();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('searchAvailability', () => {
  it('should return award flights for available economy seats', async () => {
    const availability = buildAvailability();
    mockFetch.mockReturnValueOnce(
      makeOkResponse({ count: 1, data: [availability] }),
    );

    const results = await searchAvailability(buildSearchParams());

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      airline: 'Smiles',
      milesRequired: 30000,
      taxes: 250,
      program: 'Smiles',
      cabinClass: 'Economy',
      seatsAvailable: 4,
      source: 'SEATS_AERO',
    });
  });

  it('should pass correct query params to the API', async () => {
    mockFetch.mockReturnValueOnce(makeOkResponse({ count: 0, data: [] }));

    await searchAvailability(buildSearchParams({
      originAirport: 'GRU',
      destinationAirport: 'CDG',
      cabinClass: 'BUSINESS',
      startDate: '2026-06-10',
      endDate: '2026-06-12',
    }));

    expect(mockFetch).toHaveBeenCalledOnce();
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('origin_airport=GRU');
    expect(calledUrl).toContain('destination_airport=CDG');
    expect(calledUrl).toContain('cabin=j');
    expect(calledUrl).toContain('start_date=2026-06-10');
    expect(calledUrl).toContain('end_date=2026-06-12');
  });

  it('should set Partner-Authorization header', async () => {
    mockFetch.mockReturnValueOnce(makeOkResponse({ count: 0, data: [] }));

    await searchAvailability(buildSearchParams());

    expect(mockFetch).toHaveBeenCalledOnce();
    const calledOptions = mockFetch.mock.calls[0][1] as RequestInit;
    expect((calledOptions.headers as Record<string, string>)['Partner-Authorization']).toBe(
      'test-api-key',
    );
  });

  it('should map cabin codes correctly for each cabin class', async () => {
    const cabinMappings: Array<[SeatsAeroSearchParams['cabinClass'], string, string]> = [
      ['ECONOMY', 'cabin=y', 'Economy'],
      ['PREMIUM_ECONOMY', 'cabin=w', 'Premium Economy'],
      ['BUSINESS', 'cabin=j', 'Business'],
      ['FIRST', 'cabin=f', 'First'],
    ];

    for (const [cabinClass, expectedQueryParam, expectedLabel] of cabinMappings) {
      const cabinCode = cabinClass[0]; // Y/W/J/F
      const cabinKey = cabinCode as 'Y' | 'W' | 'J' | 'F';
      const availability = buildAvailability({
        [`${cabinKey}Available`]: true,
        [`${cabinKey}Mileage`]: 50000,
        [`${cabinKey}Taxes`]: 100,
        [`${cabinKey}Seat`]: 2,
        YAvailable: cabinClass === 'ECONOMY',
        WAvailable: cabinClass === 'PREMIUM_ECONOMY',
        JAvailable: cabinClass === 'BUSINESS',
        FAvailable: cabinClass === 'FIRST',
        YMileage: cabinClass === 'ECONOMY' ? 50000 : 0,
        WMileage: cabinClass === 'PREMIUM_ECONOMY' ? 50000 : 0,
        JMileage: cabinClass === 'BUSINESS' ? 50000 : 0,
        FMileage: cabinClass === 'FIRST' ? 50000 : 0,
      });
      mockFetch.mockReturnValueOnce(makeOkResponse({ count: 1, data: [availability] }));

      const results = await searchAvailability(buildSearchParams({ cabinClass }));

      const calledUrl = mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0] as string;
      expect(calledUrl).toContain(expectedQueryParam);
      expect(results[0]?.cabinClass).toBe(expectedLabel);
    }
  });

  it('should filter out unavailable seats', async () => {
    const availability = buildAvailability({
      YAvailable: false,
      YMileage: 0,
    });
    mockFetch.mockReturnValueOnce(makeOkResponse({ count: 1, data: [availability] }));

    const results = await searchAvailability(buildSearchParams());

    expect(results).toHaveLength(0);
  });

  it('should filter out entries with zero mileage', async () => {
    const availability = buildAvailability({
      YAvailable: true,
      YMileage: 0,
    });
    mockFetch.mockReturnValueOnce(makeOkResponse({ count: 1, data: [availability] }));

    const results = await searchAvailability(buildSearchParams());

    expect(results).toHaveLength(0);
  });

  it('should return empty array when no data returned', async () => {
    mockFetch.mockReturnValueOnce(makeOkResponse({ count: 0, data: [] }));

    const results = await searchAvailability(buildSearchParams());

    expect(results).toHaveLength(0);
  });

  it('should map known sources to program names', async () => {
    const sources: Array<[string, string]> = [
      ['smiles', 'Smiles'],
      ['azul', 'Azul Fidelidade'],
      ['latam', 'Latam Pass'],
      ['american', 'American Airlines AAdvantage'],
      ['united', 'United MileagePlus'],
    ];

    for (const [source, expectedProgram] of sources) {
      const availability = buildAvailability({ Source: source });
      mockFetch.mockReturnValueOnce(makeOkResponse({ count: 1, data: [availability] }));

      const results = await searchAvailability(buildSearchParams());

      expect(results[0]?.program).toBe(expectedProgram);
    }
  });

  it('should use raw source name when program is unknown', async () => {
    const availability = buildAvailability({ Source: 'unknown_program' });
    mockFetch.mockReturnValueOnce(makeOkResponse({ count: 1, data: [availability] }));

    const results = await searchAvailability(buildSearchParams());

    expect(results[0]?.program).toBe('unknown_program');
  });

  it('should throw SeatsAeroError when API key is not configured', async () => {
    vi.resetModules();
    vi.doMock('@/lib/env', () => ({
      env: { SEATS_AERO_API_KEY: undefined },
    }));
    vi.doMock('@/lib/logger', () => ({
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }));

    const { searchAvailability: freshSearch } = await import('./seats-aero');

    await expect(freshSearch(buildSearchParams())).rejects.toThrow('Seats.aero API key not configured');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should throw SeatsAeroApiError for 4xx HTTP errors without retrying', async () => {
    mockFetch.mockReturnValueOnce(makeErrorResponse(401, 'Unauthorized'));

    await expect(searchAvailability(buildSearchParams())).rejects.toThrow(SeatsAeroApiError);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should retry on 5xx server errors and succeed on retry', async () => {
    mockFetch
      .mockReturnValueOnce(makeErrorResponse(503, 'Service Unavailable'))
      .mockReturnValueOnce(makeOkResponse({ count: 0, data: [] }));

    const searchPromise = searchAvailability(buildSearchParams());
    await vi.runAllTimersAsync();
    const results = await searchPromise;

    expect(results).toHaveLength(0);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should retry on network errors', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockReturnValueOnce(makeOkResponse({ count: 0, data: [] }));

    const searchPromise = searchAvailability(buildSearchParams());
    await vi.runAllTimersAsync();
    const results = await searchPromise;

    expect(results).toHaveLength(0);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should throw after all retry attempts are exhausted', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'));

    const searchPromise = searchAvailability(buildSearchParams());
    // Attach rejection handler before running timers to avoid unhandled rejection warning
    const expectPromise = expect(searchPromise).rejects.toThrow();
    await vi.runAllTimersAsync();
    await expectPromise;

    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('should return multiple award flights from multiple availability records', async () => {
    const availability1 = buildAvailability({ Source: 'smiles', YMileage: 25000 });
    const availability2 = buildAvailability({ ID: 'trip-456', Source: 'azul', YMileage: 28000, YSeat: 2 });
    mockFetch.mockReturnValueOnce(
      makeOkResponse({ count: 2, data: [availability1, availability2] }),
    );

    const results = await searchAvailability(buildSearchParams());

    expect(results).toHaveLength(2);
    expect(results[0]?.program).toBe('Smiles');
    expect(results[1]?.program).toBe('Azul Fidelidade');
  });
});

describe('getTripDetails', () => {
  it('should return trip details by ID', async () => {
    const trip: SeatsAeroTrip = {
      ID: 'trip-123',
      Segments: [
        {
          Origin: 'GRU',
          Destination: 'LIS',
          Airline: 'TP',
          FlightNumber: 'TP82',
          DepartureDateTime: '2026-05-01T23:55:00',
          ArrivalDateTime: '2026-05-02T13:30:00',
          Cabin: 'Y',
        },
      ],
      Source: 'smiles',
      UpdatedAt: '2026-03-24T10:00:00Z',
    };
    mockFetch.mockReturnValueOnce(makeOkResponse(trip));

    const result = await getTripDetails('trip-123');

    expect(result.ID).toBe('trip-123');
    expect(result.Segments).toHaveLength(1);
    expect(result.Source).toBe('smiles');
  });

  it('should call the correct endpoint', async () => {
    const trip: SeatsAeroTrip = {
      ID: 'trip-abc',
      Segments: [],
      Source: 'azul',
      UpdatedAt: '2026-03-24T10:00:00Z',
    };
    mockFetch.mockReturnValueOnce(makeOkResponse(trip));

    await getTripDetails('trip-abc');

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/trips/trip-abc');
  });

  it('should throw SeatsAeroApiError for 404 not found', async () => {
    mockFetch.mockReturnValueOnce(makeErrorResponse(404, 'Trip not found'));

    await expect(getTripDetails('nonexistent-id')).rejects.toThrow(SeatsAeroApiError);
  });

  it('should retry on network errors and succeed', async () => {
    const trip: SeatsAeroTrip = {
      ID: 'trip-123',
      Segments: [],
      Source: 'smiles',
      UpdatedAt: '2026-03-24T10:00:00Z',
    };
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockReturnValueOnce(makeOkResponse(trip));

    const detailsPromise = getTripDetails('trip-123');
    await vi.runAllTimersAsync();
    const result = await detailsPromise;

    expect(result.ID).toBe('trip-123');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe('SeatsAeroError', () => {
  it('should have correct name', () => {
    const error = new SeatsAeroError('test');
    expect(error.name).toBe('SeatsAeroError');
    expect(error.message).toBe('test');
  });
});

describe('SeatsAeroApiError', () => {
  it('should have correct name and statusCode', () => {
    const error = new SeatsAeroApiError('Unauthorized', 401);
    expect(error.name).toBe('SeatsAeroApiError');
    expect(error.statusCode).toBe(401);
  });

  it('should be an instance of SeatsAeroError', () => {
    const error = new SeatsAeroApiError('test', 500);
    expect(error).toBeInstanceOf(SeatsAeroError);
  });
});
