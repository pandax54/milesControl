import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

vi.mock('@/lib/env', () => ({
  env: {
    SERPAPI_API_KEY: 'test-api-key',
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  searchCashFlights,
  clearCache,
  SerpApiError,
  SerpApiRequestError,
} from './serp-api';
import type { FlightSearchParams } from '@/lib/validators/flight-search.schema';

// ==================== Helpers ====================

function buildSearchParams(overrides?: Partial<FlightSearchParams>): FlightSearchParams {
  return {
    origin: 'GRU',
    destination: 'LIS',
    departureDate: '2026-05-01',
    passengers: 1,
    cabinClass: 'ECONOMY',
    ...overrides,
  };
}

function buildFlightLeg(overrides?: Record<string, unknown>) {
  return {
    departure_airport: { name: 'São Paulo', id: 'GRU', time: '2026-05-01 10:00' },
    arrival_airport: { name: 'Lisbon', id: 'LIS', time: '2026-05-01 22:00' },
    duration: 720,
    airline: 'LATAM Airlines',
    flight_number: 'LA8009',
    travel_class: 'Economy',
    ...overrides,
  };
}

function buildFlightOption(overrides?: Record<string, unknown>) {
  return {
    flights: [buildFlightLeg()],
    total_duration: 720,
    price: 1200,
    type: 'One way',
    ...overrides,
  };
}

function buildSerpApiResponse(overrides?: Record<string, unknown>) {
  return {
    search_metadata: { id: 'abc123', status: 'Success' },
    best_flights: [buildFlightOption()],
    other_flights: [],
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
  clearCache();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('searchCashFlights', () => {
  it('should return cash flights from best_flights', async () => {
    mockFetch.mockReturnValueOnce(makeOkResponse(buildSerpApiResponse()));

    const results = await searchCashFlights(buildSearchParams());

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      airline: 'LATAM Airlines',
      price: 1200,
      duration: 720,
      stops: 0,
      departureTime: '2026-05-01T10:00:00',
      arrivalTime: '2026-05-01T22:00:00',
      source: 'GOOGLE_FLIGHTS',
    });
  });

  it('should return cash flights from both best_flights and other_flights', async () => {
    const response = buildSerpApiResponse({
      best_flights: [buildFlightOption({ price: 1200 })],
      other_flights: [buildFlightOption({ price: 1400, total_duration: 900 })],
    });
    mockFetch.mockReturnValueOnce(makeOkResponse(response));

    const results = await searchCashFlights(buildSearchParams());

    expect(results).toHaveLength(2);
    expect(results[0]?.price).toBe(1200);
    expect(results[1]?.price).toBe(1400);
  });

  it('should calculate stops as flights.length - 1', async () => {
    const twoLegFlight = {
      flights: [
        buildFlightLeg({ departure_airport: { name: 'GRU', id: 'GRU', time: '2026-05-01 10:00' }, arrival_airport: { name: 'CDG', id: 'CDG', time: '2026-05-01 20:00' } }),
        buildFlightLeg({ departure_airport: { name: 'CDG', id: 'CDG', time: '2026-05-01 22:00' }, arrival_airport: { name: 'LIS', id: 'LIS', time: '2026-05-02 00:00' } }),
      ],
      total_duration: 840,
      price: 900,
    };
    mockFetch.mockReturnValueOnce(
      makeOkResponse(buildSerpApiResponse({ best_flights: [twoLegFlight] })),
    );

    const results = await searchCashFlights(buildSearchParams());

    expect(results[0]?.stops).toBe(1);
  });

  it('should use first leg departure and last leg arrival times for multi-leg flights', async () => {
    const twoLegFlight = {
      flights: [
        buildFlightLeg({
          departure_airport: { name: 'GRU', id: 'GRU', time: '2026-05-01 06:00' },
          arrival_airport: { name: 'CDG', id: 'CDG', time: '2026-05-01 18:00' },
        }),
        buildFlightLeg({
          departure_airport: { name: 'CDG', id: 'CDG', time: '2026-05-01 20:00' },
          arrival_airport: { name: 'LIS', id: 'LIS', time: '2026-05-01 21:30' },
        }),
      ],
      total_duration: 930,
      price: 800,
    };
    mockFetch.mockReturnValueOnce(
      makeOkResponse(buildSerpApiResponse({ best_flights: [twoLegFlight] })),
    );

    const results = await searchCashFlights(buildSearchParams());

    expect(results[0]?.departureTime).toBe('2026-05-01T06:00:00');
    expect(results[0]?.arrivalTime).toBe('2026-05-01T21:30:00');
  });

  it('should pass correct query params to SerpApi', async () => {
    mockFetch.mockReturnValueOnce(makeOkResponse(buildSerpApiResponse({ best_flights: [] })));

    await searchCashFlights(buildSearchParams({
      origin: 'GRU',
      destination: 'CDG',
      departureDate: '2026-06-15',
      passengers: 2,
      cabinClass: 'BUSINESS',
    }));

    expect(mockFetch).toHaveBeenCalledOnce();
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('engine=google_flights');
    expect(calledUrl).toContain('departure_id=GRU');
    expect(calledUrl).toContain('arrival_id=CDG');
    expect(calledUrl).toContain('outbound_date=2026-06-15');
    expect(calledUrl).toContain('currency=BRL');
    expect(calledUrl).toContain('hl=pt');
    expect(calledUrl).toContain('adults=2');
    expect(calledUrl).toContain('travel_class=3');
    expect(calledUrl).toContain('api_key=test-api-key');
  });

  it('should pass type=2 for one-way flights', async () => {
    mockFetch.mockReturnValueOnce(makeOkResponse(buildSerpApiResponse({ best_flights: [] })));

    await searchCashFlights(buildSearchParams({ returnDate: undefined }));

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('type=2');
    expect(calledUrl).not.toContain('return_date');
  });

  it('should pass type=1 and return_date for round-trip flights', async () => {
    mockFetch.mockReturnValueOnce(makeOkResponse(buildSerpApiResponse({ best_flights: [] })));

    await searchCashFlights(buildSearchParams({ returnDate: '2026-05-15' }));

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('type=1');
    expect(calledUrl).toContain('return_date=2026-05-15');
  });

  it('should map cabin classes to SerpApi travel_class codes', async () => {
    const cabinMappings: Array<[FlightSearchParams['cabinClass'], string]> = [
      ['ECONOMY', 'travel_class=1'],
      ['PREMIUM_ECONOMY', 'travel_class=2'],
      ['BUSINESS', 'travel_class=3'],
      ['FIRST', 'travel_class=4'],
    ];

    for (const [cabinClass, expectedParam] of cabinMappings) {
      mockFetch.mockReturnValueOnce(makeOkResponse(buildSerpApiResponse({ best_flights: [] })));

      await searchCashFlights(buildSearchParams({ cabinClass }));

      const calledUrl = mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0] as string;
      expect(calledUrl).toContain(expectedParam);
    }
  });

  it('should return empty array when no flights returned', async () => {
    mockFetch.mockReturnValueOnce(
      makeOkResponse(buildSerpApiResponse({ best_flights: [], other_flights: [] })),
    );

    const results = await searchCashFlights(buildSearchParams());

    expect(results).toHaveLength(0);
  });

  it('should return empty array when best_flights and other_flights are absent', async () => {
    mockFetch.mockReturnValueOnce(
      makeOkResponse({ search_metadata: { status: 'Success' } }),
    );

    const results = await searchCashFlights(buildSearchParams());

    expect(results).toHaveLength(0);
  });

  it('should throw SerpApiError when error field is present in response', async () => {
    mockFetch.mockReturnValueOnce(
      makeOkResponse({ error: 'Invalid API key.' }),
    );

    await expect(searchCashFlights(buildSearchParams())).rejects.toMatchObject({
      name: 'SerpApiError',
      message: expect.stringContaining('Invalid API key.'),
    });
  });

  it('should throw SerpApiError when API key is not configured', async () => {
    vi.resetModules();
    vi.doMock('@/lib/env', () => ({
      env: { SERPAPI_API_KEY: undefined },
    }));
    vi.doMock('@/lib/logger', () => ({
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    }));

    const { searchCashFlights: freshSearch } = await import('./serp-api');

    await expect(freshSearch(buildSearchParams())).rejects.toThrow('SerpApi API key not configured');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should throw SerpApiRequestError for 4xx HTTP errors without retrying', async () => {
    mockFetch.mockReturnValueOnce(makeErrorResponse(401, 'Unauthorized'));

    await expect(searchCashFlights(buildSearchParams())).rejects.toThrow(SerpApiRequestError);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should retry on 5xx server errors and succeed on retry', async () => {
    mockFetch
      .mockReturnValueOnce(makeErrorResponse(503, 'Service Unavailable'))
      .mockReturnValueOnce(makeOkResponse(buildSerpApiResponse({ best_flights: [] })));

    const searchPromise = searchCashFlights(buildSearchParams());
    await vi.runAllTimersAsync();
    const results = await searchPromise;

    expect(results).toHaveLength(0);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should retry on network errors and succeed on retry', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockReturnValueOnce(makeOkResponse(buildSerpApiResponse({ best_flights: [] })));

    const searchPromise = searchCashFlights(buildSearchParams());
    await vi.runAllTimersAsync();
    const results = await searchPromise;

    expect(results).toHaveLength(0);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should throw after all retry attempts are exhausted', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'));

    const searchPromise = searchCashFlights(buildSearchParams());
    const expectPromise = expect(searchPromise).rejects.toThrow();
    await vi.runAllTimersAsync();
    await expectPromise;

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  describe('cache', () => {
    it('should return cached results on second call without fetching', async () => {
      mockFetch.mockReturnValueOnce(makeOkResponse(buildSerpApiResponse()));

      const params = buildSearchParams();
      const first = await searchCashFlights(params);
      const second = await searchCashFlights(params);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(second).toEqual(first);
    });

    it('should use different cache keys for different routes', async () => {
      mockFetch
        .mockReturnValueOnce(makeOkResponse(buildSerpApiResponse({ best_flights: [buildFlightOption({ price: 1200 })] })))
        .mockReturnValueOnce(makeOkResponse(buildSerpApiResponse({ best_flights: [buildFlightOption({ price: 800 })] })));

      const results1 = await searchCashFlights(buildSearchParams({ origin: 'GRU', destination: 'LIS' }));
      const results2 = await searchCashFlights(buildSearchParams({ origin: 'GRU', destination: 'CDG' }));

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(results1[0]?.price).toBe(1200);
      expect(results2[0]?.price).toBe(800);
    });

    it('should use different cache keys for different cabin classes', async () => {
      mockFetch
        .mockReturnValueOnce(makeOkResponse(buildSerpApiResponse({ best_flights: [buildFlightOption({ price: 1200 })] })))
        .mockReturnValueOnce(makeOkResponse(buildSerpApiResponse({ best_flights: [buildFlightOption({ price: 5000 })] })));

      await searchCashFlights(buildSearchParams({ cabinClass: 'ECONOMY' }));
      await searchCashFlights(buildSearchParams({ cabinClass: 'BUSINESS' }));

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should re-fetch after cache TTL expires (6 hours)', async () => {
      mockFetch
        .mockReturnValueOnce(makeOkResponse(buildSerpApiResponse({ best_flights: [buildFlightOption({ price: 1200 })] })))
        .mockReturnValueOnce(makeOkResponse(buildSerpApiResponse({ best_flights: [buildFlightOption({ price: 1100 })] })));

      const params = buildSearchParams();
      const first = await searchCashFlights(params);
      expect(first[0]?.price).toBe(1200);

      // Advance time past 6h TTL
      vi.advanceTimersByTime(6 * 60 * 60 * 1_000 + 1);

      const second = await searchCashFlights(params);
      expect(second[0]?.price).toBe(1100);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not re-fetch before cache TTL expires', async () => {
      mockFetch.mockReturnValueOnce(makeOkResponse(buildSerpApiResponse()));

      const params = buildSearchParams();
      await searchCashFlights(params);

      // Advance time to just before 6h TTL
      vi.advanceTimersByTime(6 * 60 * 60 * 1_000 - 1);

      await searchCashFlights(params);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});

describe('SerpApiError', () => {
  it('should have correct name and message', () => {
    const error = new SerpApiError('test error');
    expect(error.name).toBe('SerpApiError');
    expect(error.message).toBe('test error');
  });
});

describe('SerpApiRequestError', () => {
  it('should have correct name, message, and statusCode', () => {
    const error = new SerpApiRequestError('Bad Request', 400);
    expect(error.name).toBe('SerpApiRequestError');
    expect(error.message).toBe('Bad Request');
    expect(error.statusCode).toBe(400);
  });

  it('should be an instance of SerpApiError', () => {
    const error = new SerpApiRequestError('test', 500);
    expect(error).toBeInstanceOf(SerpApiError);
  });
});
