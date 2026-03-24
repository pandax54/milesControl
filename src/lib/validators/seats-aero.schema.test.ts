import { describe, it, expect } from 'vitest';

import {
  seatsAeroSearchParamsSchema,
  seatsAeroAvailabilitySchema,
  seatsAeroSearchResponseSchema,
  seatsAeroSegmentSchema,
  seatsAeroTripSchema,
} from './seats-aero.schema';

// ==================== seatsAeroSearchParamsSchema ====================

describe('seatsAeroSearchParamsSchema', () => {
  it('should accept valid search params', () => {
    const result = seatsAeroSearchParamsSchema.safeParse({
      originAirport: 'GRU',
      destinationAirport: 'LIS',
      cabinClass: 'ECONOMY',
      startDate: '2026-05-01',
      endDate: '2026-05-10',
    });

    expect(result.success).toBe(true);
  });

  it('should reject non-IATA origin airport codes', () => {
    const result = seatsAeroSearchParamsSchema.safeParse({
      originAirport: 'GR',
      destinationAirport: 'LIS',
      cabinClass: 'ECONOMY',
      startDate: '2026-05-01',
      endDate: '2026-05-10',
    });

    expect(result.success).toBe(false);
  });

  it('should reject lowercase airport codes', () => {
    const result = seatsAeroSearchParamsSchema.safeParse({
      originAirport: 'gru',
      destinationAirport: 'LIS',
      cabinClass: 'ECONOMY',
      startDate: '2026-05-01',
      endDate: '2026-05-10',
    });

    expect(result.success).toBe(false);
  });

  it('should reject invalid cabin class', () => {
    const result = seatsAeroSearchParamsSchema.safeParse({
      originAirport: 'GRU',
      destinationAirport: 'LIS',
      cabinClass: 'PREMIUM',
      startDate: '2026-05-01',
      endDate: '2026-05-10',
    });

    expect(result.success).toBe(false);
  });

  it('should accept all valid cabin classes', () => {
    for (const cabinClass of ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']) {
      const result = seatsAeroSearchParamsSchema.safeParse({
        originAirport: 'GRU',
        destinationAirport: 'LIS',
        cabinClass,
        startDate: '2026-05-01',
        endDate: '2026-05-10',
      });

      expect(result.success).toBe(true);
    }
  });

  it('should reject date not in YYYY-MM-DD format', () => {
    const result = seatsAeroSearchParamsSchema.safeParse({
      originAirport: 'GRU',
      destinationAirport: 'LIS',
      cabinClass: 'ECONOMY',
      startDate: '01/05/2026',
      endDate: '2026-05-10',
    });

    expect(result.success).toBe(false);
  });

  it('should reject startDate after endDate', () => {
    const result = seatsAeroSearchParamsSchema.safeParse({
      originAirport: 'GRU',
      destinationAirport: 'LIS',
      cabinClass: 'ECONOMY',
      startDate: '2026-05-10',
      endDate: '2026-05-01',
    });

    expect(result.success).toBe(false);
  });

  it('should accept startDate equal to endDate', () => {
    const result = seatsAeroSearchParamsSchema.safeParse({
      originAirport: 'GRU',
      destinationAirport: 'LIS',
      cabinClass: 'ECONOMY',
      startDate: '2026-05-01',
      endDate: '2026-05-01',
    });

    expect(result.success).toBe(true);
  });
});

// ==================== seatsAeroAvailabilitySchema ====================

describe('seatsAeroAvailabilitySchema', () => {
  const validAvailability = {
    ID: 'abc-123',
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
  };

  it('should accept valid availability data', () => {
    const result = seatsAeroAvailabilitySchema.safeParse(validAvailability);

    expect(result.success).toBe(true);
  });

  it('should reject negative mileage', () => {
    const result = seatsAeroAvailabilitySchema.safeParse({
      ...validAvailability,
      YMileage: -100,
    });

    expect(result.success).toBe(false);
  });

  it('should reject empty Source', () => {
    const result = seatsAeroAvailabilitySchema.safeParse({
      ...validAvailability,
      Source: '',
    });

    expect(result.success).toBe(false);
  });
});

// ==================== seatsAeroSearchResponseSchema ====================

describe('seatsAeroSearchResponseSchema', () => {
  it('should accept valid search response', () => {
    const result = seatsAeroSearchResponseSchema.safeParse({
      count: 0,
      data: [],
    });

    expect(result.success).toBe(true);
  });

  it('should reject missing data array', () => {
    const result = seatsAeroSearchResponseSchema.safeParse({ count: 0 });

    expect(result.success).toBe(false);
  });
});

// ==================== seatsAeroSegmentSchema ====================

describe('seatsAeroSegmentSchema', () => {
  const validSegment = {
    Origin: 'GRU',
    Destination: 'LIS',
    Airline: 'TP',
    FlightNumber: 'TP82',
    DepartureDateTime: '2026-05-01T23:55:00',
    ArrivalDateTime: '2026-05-02T13:30:00',
    Cabin: 'Y',
  };

  it('should accept valid segment', () => {
    const result = seatsAeroSegmentSchema.safeParse(validSegment);

    expect(result.success).toBe(true);
  });

  it('should reject invalid cabin code', () => {
    const result = seatsAeroSegmentSchema.safeParse({ ...validSegment, Cabin: 'X' });

    expect(result.success).toBe(false);
  });

  it('should accept all valid cabin codes', () => {
    for (const cabin of ['Y', 'W', 'J', 'F']) {
      const result = seatsAeroSegmentSchema.safeParse({ ...validSegment, Cabin: cabin });

      expect(result.success).toBe(true);
    }
  });
});

// ==================== seatsAeroTripSchema ====================

describe('seatsAeroTripSchema', () => {
  it('should accept valid trip', () => {
    const result = seatsAeroTripSchema.safeParse({
      ID: 'trip-123',
      Segments: [],
      Source: 'smiles',
      UpdatedAt: '2026-03-24T10:00:00Z',
    });

    expect(result.success).toBe(true);
  });

  it('should reject empty Source', () => {
    const result = seatsAeroTripSchema.safeParse({
      ID: 'trip-123',
      Segments: [],
      Source: '',
      UpdatedAt: '2026-03-24T10:00:00Z',
    });

    expect(result.success).toBe(false);
  });
});
