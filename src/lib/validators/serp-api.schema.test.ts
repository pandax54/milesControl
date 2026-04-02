import { describe, it, expect } from 'vitest';

import {
  serpApiFlightOptionSchema,
  serpApiSearchResponseSchema,
  serpApiFlightLegSchema,
} from './serp-api.schema';

// ==================== Helpers ====================

function buildFlightLeg(overrides?: Record<string, unknown>) {
  return {
    departure_airport: { name: 'São Paulo', id: 'GRU', time: '2026-05-01 10:00' },
    arrival_airport: { name: 'Lisbon', id: 'LIS', time: '2026-05-01 22:00' },
    duration: 720,
    airline: 'LATAM Airlines',
    ...overrides,
  };
}

function buildFlightOption(overrides?: Record<string, unknown>) {
  return {
    flights: [buildFlightLeg()],
    total_duration: 720,
    price: 1200,
    ...overrides,
  };
}

// ==================== Tests ====================

describe('serpApiFlightLegSchema', () => {
  it('should parse a valid flight leg', () => {
    const result = serpApiFlightLegSchema.safeParse(buildFlightLeg());
    expect(result.success).toBe(true);
  });

  it('should parse optional fields when present', () => {
    const leg = buildFlightLeg({
      airline_logo: 'https://example.com/logo.png',
      travel_class: 'Economy',
      flight_number: 'LA8009',
      airplane: 'A330',
      often_delayed_by_over_30_min: false,
    });
    const result = serpApiFlightLegSchema.safeParse(leg);
    expect(result.success).toBe(true);
  });

  it('should fail when airline is missing', () => {
    const leg = buildFlightLeg();
    delete (leg as Record<string, unknown>)['airline'];
    const result = serpApiFlightLegSchema.safeParse(leg);
    expect(result.success).toBe(false);
  });

  it('should fail when departure_airport is missing', () => {
    const leg = buildFlightLeg();
    delete (leg as Record<string, unknown>)['departure_airport'];
    const result = serpApiFlightLegSchema.safeParse(leg);
    expect(result.success).toBe(false);
  });
});

describe('serpApiFlightOptionSchema', () => {
  it('should parse a valid flight option', () => {
    const result = serpApiFlightOptionSchema.safeParse(buildFlightOption());
    expect(result.success).toBe(true);
  });

  it('should parse flight option with layovers', () => {
    const option = buildFlightOption({
      layovers: [{ duration: 90, name: 'Charles de Gaulle Airport', id: 'CDG' }],
    });
    const result = serpApiFlightOptionSchema.safeParse(option);
    expect(result.success).toBe(true);
  });

  it('should parse flight option with multiple legs', () => {
    const option = buildFlightOption({
      flights: [buildFlightLeg(), buildFlightLeg()],
    });
    const result = serpApiFlightOptionSchema.safeParse(option);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.flights).toHaveLength(2);
    }
  });

  it('should fail when price is missing', () => {
    const option = buildFlightOption();
    delete (option as Record<string, unknown>)['price'];
    const result = serpApiFlightOptionSchema.safeParse(option);
    expect(result.success).toBe(false);
  });

  it('should fail when total_duration is missing', () => {
    const option = buildFlightOption();
    delete (option as Record<string, unknown>)['total_duration'];
    const result = serpApiFlightOptionSchema.safeParse(option);
    expect(result.success).toBe(false);
  });
});

describe('serpApiSearchResponseSchema', () => {
  it('should parse a full valid response', () => {
    const response = {
      search_metadata: { id: 'abc123', status: 'Success' },
      best_flights: [buildFlightOption()],
      other_flights: [],
    };
    const result = serpApiSearchResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('should parse response with no flights (empty arrays)', () => {
    const response = {
      search_metadata: { id: 'abc123', status: 'Success' },
      best_flights: [],
      other_flights: [],
    };
    const result = serpApiSearchResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('should parse response without best_flights or other_flights', () => {
    const response = {
      search_metadata: { status: 'Success' },
    };
    const result = serpApiSearchResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.best_flights).toBeUndefined();
      expect(result.data.other_flights).toBeUndefined();
    }
  });

  it('should parse error response with error field', () => {
    const response = { error: 'Invalid API key.' };
    const result = serpApiSearchResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.error).toBe('Invalid API key.');
    }
  });

  it('should pass through unknown fields', () => {
    const response = {
      best_flights: [],
      unknown_field: 'some_value',
    };
    const result = serpApiSearchResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('should parse response with search_metadata including extra fields', () => {
    const response = {
      search_metadata: {
        id: 'abc123',
        status: 'Success',
        created_at: '2026-03-24',
        extra: 'data',
      },
      best_flights: [],
    };
    const result = serpApiSearchResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });
});
