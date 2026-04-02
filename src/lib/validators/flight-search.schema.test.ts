import { describe, it, expect } from 'vitest';
import { flightSearchParamsSchema } from './flight-search.schema';

describe('flightSearchParamsSchema', () => {
  it('should accept valid minimum params', () => {
    const result = flightSearchParamsSchema.safeParse({
      origin: 'GRU',
      destination: 'LIS',
      departureDate: '2026-04-15',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.origin).toBe('GRU');
      expect(result.data.destination).toBe('LIS');
      expect(result.data.passengers).toBe(1);
      expect(result.data.cabinClass).toBe('ECONOMY');
    }
  });

  it('should accept valid full params', () => {
    const result = flightSearchParamsSchema.safeParse({
      origin: 'GRU',
      destination: 'MIA',
      departureDate: '2026-05-01',
      returnDate: '2026-05-10',
      passengers: 2,
      cabinClass: 'BUSINESS',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.returnDate).toBe('2026-05-10');
      expect(result.data.passengers).toBe(2);
      expect(result.data.cabinClass).toBe('BUSINESS');
    }
  });

  it('should reject origin shorter than 3 chars', () => {
    const result = flightSearchParamsSchema.safeParse({
      origin: 'GR',
      destination: 'LIS',
      departureDate: '2026-04-15',
    });

    expect(result.success).toBe(false);
  });

  it('should reject origin longer than 3 chars', () => {
    const result = flightSearchParamsSchema.safeParse({
      origin: 'GRUG',
      destination: 'LIS',
      departureDate: '2026-04-15',
    });

    expect(result.success).toBe(false);
  });

  it('should reject lowercase IATA codes', () => {
    const result = flightSearchParamsSchema.safeParse({
      origin: 'gru',
      destination: 'lis',
      departureDate: '2026-04-15',
    });

    expect(result.success).toBe(false);
  });

  it('should reject invalid date format', () => {
    const result = flightSearchParamsSchema.safeParse({
      origin: 'GRU',
      destination: 'LIS',
      departureDate: '15/04/2026',
    });

    expect(result.success).toBe(false);
  });

  it('should reject passengers below 1', () => {
    const result = flightSearchParamsSchema.safeParse({
      origin: 'GRU',
      destination: 'LIS',
      departureDate: '2026-04-15',
      passengers: 0,
    });

    expect(result.success).toBe(false);
  });

  it('should reject passengers above 9', () => {
    const result = flightSearchParamsSchema.safeParse({
      origin: 'GRU',
      destination: 'LIS',
      departureDate: '2026-04-15',
      passengers: 10,
    });

    expect(result.success).toBe(false);
  });

  it('should reject invalid cabin class', () => {
    const result = flightSearchParamsSchema.safeParse({
      origin: 'GRU',
      destination: 'LIS',
      departureDate: '2026-04-15',
      cabinClass: 'PREMIUM',
    });

    expect(result.success).toBe(false);
  });

  it('should accept all valid cabin classes', () => {
    const cabins = ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'] as const;
    for (const cabinClass of cabins) {
      const result = flightSearchParamsSchema.safeParse({
        origin: 'GRU',
        destination: 'LIS',
        departureDate: '2026-04-15',
        cabinClass,
      });
      expect(result.success).toBe(true);
    }
  });

  it('should make returnDate optional', () => {
    const withReturn = flightSearchParamsSchema.safeParse({
      origin: 'GRU',
      destination: 'LIS',
      departureDate: '2026-04-15',
      returnDate: '2026-04-22',
    });
    const withoutReturn = flightSearchParamsSchema.safeParse({
      origin: 'GRU',
      destination: 'LIS',
      departureDate: '2026-04-15',
    });

    expect(withReturn.success).toBe(true);
    expect(withoutReturn.success).toBe(true);
    if (withoutReturn.success) {
      expect(withoutReturn.data.returnDate).toBeUndefined();
    }
  });

  it('should require departureDate', () => {
    const result = flightSearchParamsSchema.safeParse({
      origin: 'GRU',
      destination: 'LIS',
    });

    expect(result.success).toBe(false);
  });
});
