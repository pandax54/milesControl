import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { searchFlights } from './flight-search.service';
import type { FlightSearchParams } from '@/lib/validators/flight-search.schema';

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

describe('searchFlights', () => {
  it('should return empty results (placeholder until 5.1/5.2)', async () => {
    const params = buildParams();
    const result = await searchFlights(params);

    expect(result.cashFlights).toHaveLength(0);
    expect(result.awardFlights).toHaveLength(0);
    expect(result.params).toEqual(params);
    expect(result.searchedAt).toBeInstanceOf(Date);
  });

  it('should include the search params in the result', async () => {
    const params = buildParams({ cabinClass: 'BUSINESS', passengers: 2 });
    const result = await searchFlights(params);

    expect(result.params.cabinClass).toBe('BUSINESS');
    expect(result.params.passengers).toBe(2);
  });

  it('should return a searchedAt date close to now', async () => {
    const before = new Date();
    const result = await searchFlights(buildParams());
    const after = new Date();

    expect(result.searchedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.searchedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should include returnDate when provided', async () => {
    const params = buildParams({ returnDate: '2026-05-10' });
    const result = await searchFlights(params);

    expect(result.params.returnDate).toBe('2026-05-10');
  });
});
