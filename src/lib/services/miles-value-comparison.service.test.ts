import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  findLowestCashPrice,
  computeFlightMilesValue,
  computeFlightMilesValues,
} from './miles-value-comparison.service';
import type { AwardFlight, CashFlight } from './flight-search.service';

// ==================== Helpers ====================

function buildAwardFlight(overrides?: Partial<AwardFlight>): AwardFlight {
  return {
    airline: 'LATAM Airlines',
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

// ==================== findLowestCashPrice ====================

describe('findLowestCashPrice', () => {
  it('should return undefined for empty array', () => {
    expect(findLowestCashPrice([])).toBeUndefined();
  });

  it('should return single price when one flight', () => {
    const flights = [buildCashFlight({ price: 1500 })];
    expect(findLowestCashPrice(flights)).toBe(1500);
  });

  it('should return the lowest price from multiple flights', () => {
    const flights = [
      buildCashFlight({ price: 1500 }),
      buildCashFlight({ price: 900 }),
      buildCashFlight({ price: 2100 }),
    ];
    expect(findLowestCashPrice(flights)).toBe(900);
  });

  it('should return price when all flights have same price', () => {
    const flights = [buildCashFlight({ price: 1000 }), buildCashFlight({ price: 1000 })];
    expect(findLowestCashPrice(flights)).toBe(1000);
  });
});

// ==================== computeFlightMilesValue ====================

describe('computeFlightMilesValue', () => {
  it('should compute milesValuePerK as (cashPrice - taxes) / (miles / 1000)', () => {
    // (1200 - 250) / (30000 / 1000) = 950 / 30 = 31.67
    const flight = buildAwardFlight({ milesRequired: 30000, taxes: 250 });
    const result = computeFlightMilesValue(flight, 1200);

    expect(result.milesValuePerK).toBeCloseTo(31.67, 1);
  });

  it('should include the cashPriceBRL in the result', () => {
    const flight = buildAwardFlight();
    const result = computeFlightMilesValue(flight, 1500);

    expect(result.cashPriceBRL).toBe(1500);
  });

  it('should rate EXCELLENT when miles value is very high', () => {
    // 60,000 cash / 5,000 miles = R$12,000/k (way above any threshold — let's be realistic)
    // To get EXCELLENT (> R$60/k): e.g. 6000 cash / (100000/1000) = R$60/k
    const flight = buildAwardFlight({ milesRequired: 10000, taxes: 0 });
    const result = computeFlightMilesValue(flight, 1200);

    // (1200 - 0) / (10000 / 1000) = 120/k — EXCELLENT
    expect(result.rating).toBe('EXCELLENT');
  });

  it('should rate AVOID when miles value is very low', () => {
    // Low redemption: 500 cash / 30000 miles = ~16.67/k → below 15 threshold
    const flight = buildAwardFlight({ milesRequired: 60000, taxes: 200 });
    const result = computeFlightMilesValue(flight, 500);

    // (500 - 200) / 60 = 5/k — AVOID
    expect(result.rating).toBe('AVOID');
  });

  it('should flag isUsingPersonalData true when userAvgCostPerMilheiro provided', () => {
    const flight = buildAwardFlight();
    const result = computeFlightMilesValue(flight, 1200, 14);

    expect(result.isUsingPersonalData).toBe(true);
  });

  it('should flag isUsingPersonalData false when userAvgCostPerMilheiro is absent', () => {
    const flight = buildAwardFlight();
    const result = computeFlightMilesValue(flight, 1200);

    expect(result.isUsingPersonalData).toBe(false);
  });

  it('should compute positive cashSavings when miles are worth more than their cost', () => {
    // Flight: 30k miles, taxes 250, cash 1200, user avg 14/k
    // equivalentCashCost = 30 * 14 = 420
    // cashSavings = 1200 - 420 - 250 = 530
    const flight = buildAwardFlight({ milesRequired: 30000, taxes: 250 });
    const result = computeFlightMilesValue(flight, 1200, 14);

    expect(result.cashSavings).toBeCloseTo(530, 0);
  });

  it('should compute negative cashSavings when miles are worth less than their cost', () => {
    // Flight: 30k miles, taxes 100, cash 500, user avg 14/k
    // equivalentCashCost = 30 * 14 = 420
    // cashSavings = 500 - 420 - 100 = -20
    const flight = buildAwardFlight({ milesRequired: 30000, taxes: 100 });
    const result = computeFlightMilesValue(flight, 500, 14);

    expect(result.cashSavings).toBeLessThan(0);
  });

  it('should use market average when no user cost data is available', () => {
    const flight = buildAwardFlight();
    const withPersonal = computeFlightMilesValue(flight, 1200, 15);
    const withMarket = computeFlightMilesValue(flight, 1200);

    // Both use R$15/k (one personal, one market default), so equivalentCashCost should match
    expect(withPersonal.equivalentCashCost).toBeCloseTo(withMarket.equivalentCashCost, 1);
  });

  it('should include a recommendation string', () => {
    const flight = buildAwardFlight();
    const result = computeFlightMilesValue(flight, 1200, 14);

    expect(typeof result.recommendation).toBe('string');
    expect(result.recommendation.length).toBeGreaterThan(0);
  });
});

// ==================== computeFlightMilesValues ====================

describe('computeFlightMilesValues', () => {
  it('should return all nulls when no cash flights are available', () => {
    const awardFlights = [buildAwardFlight(), buildAwardFlight({ program: 'Azul Fidelidade' })];
    const result = computeFlightMilesValues(awardFlights, []);

    expect(result).toHaveLength(2);
    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();
  });

  it('should return null array matching award flights length when no cash', () => {
    const result = computeFlightMilesValues([buildAwardFlight()], []);
    expect(result).toHaveLength(1);
  });

  it('should return empty array when no award flights', () => {
    const cashFlights = [buildCashFlight()];
    const result = computeFlightMilesValues([], cashFlights);

    expect(result).toHaveLength(0);
  });

  it('should compute comparison for each award flight using the lowest cash price', () => {
    const awardFlight = buildAwardFlight({ milesRequired: 30000, taxes: 0 });
    const cashFlights = [buildCashFlight({ price: 1500 }), buildCashFlight({ price: 1000 })];

    const result = computeFlightMilesValues([awardFlight], cashFlights);

    // Should use lowest price: 1000
    // (1000 - 0) / 30 = 33.33/k
    expect(result[0]).not.toBeNull();
    expect(result[0]!.cashPriceBRL).toBe(1000);
    expect(result[0]!.milesValuePerK).toBeCloseTo(33.33, 1);
  });

  it('should compute separate comparisons for multiple award flights', () => {
    const flights = [
      buildAwardFlight({ milesRequired: 20000, taxes: 0 }),
      buildAwardFlight({ milesRequired: 40000, taxes: 0 }),
    ];
    const cashFlights = [buildCashFlight({ price: 1200 })];

    const result = computeFlightMilesValues(flights, cashFlights);

    expect(result).toHaveLength(2);
    // Flight 1: 1200 / 20 = 60/k
    expect(result[0]!.milesValuePerK).toBeCloseTo(60, 0);
    // Flight 2: 1200 / 40 = 30/k
    expect(result[1]!.milesValuePerK).toBeCloseTo(30, 0);
  });

  it('should pass userAvgCostPerMilheiro to each comparison', () => {
    const awardFlight = buildAwardFlight();
    const cashFlights = [buildCashFlight()];

    const result = computeFlightMilesValues([awardFlight], cashFlights, 13);

    expect(result[0]!.isUsingPersonalData).toBe(true);
  });

  it('should mark isUsingPersonalData false when no user avg cost provided', () => {
    const awardFlight = buildAwardFlight();
    const cashFlights = [buildCashFlight()];

    const result = computeFlightMilesValues([awardFlight], cashFlights);

    expect(result[0]!.isUsingPersonalData).toBe(false);
  });

  it('should return all non-null values when cash flights are present', () => {
    const awardFlights = [buildAwardFlight(), buildAwardFlight({ program: 'Azul Fidelidade' })];
    const cashFlights = [buildCashFlight({ price: 1200 })];

    const result = computeFlightMilesValues(awardFlights, cashFlights);

    expect(result.every((r) => r !== null)).toBe(true);
  });
});
