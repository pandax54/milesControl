import { z } from 'zod';

// ==================== Sub-schemas ====================

const serpApiAirportSchema = z.object({
  name: z.string(),
  id: z.string(),
  time: z.string(), // "YYYY-MM-DD HH:mm" local time
});

export const serpApiFlightLegSchema = z.object({
  departure_airport: serpApiAirportSchema,
  arrival_airport: serpApiAirportSchema,
  duration: z.number(),
  airline: z.string(),
  airline_logo: z.string().optional(),
  travel_class: z.string().optional(),
  flight_number: z.string().optional(),
  airplane: z.string().optional(),
  often_delayed_by_over_30_min: z.boolean().optional(),
});

export type SerpApiFlightLeg = z.infer<typeof serpApiFlightLegSchema>;

const serpApiLayoverSchema = z
  .object({
    duration: z.number(),
    name: z.string().optional(),
    id: z.string().optional(),
  })
  .passthrough();

export const serpApiFlightOptionSchema = z.object({
  flights: z.array(serpApiFlightLegSchema),
  layovers: z.array(serpApiLayoverSchema).optional(),
  total_duration: z.number(),
  price: z.number(),
  type: z.string().optional(),
  airline_logo: z.string().optional(),
  departure_token: z.string().optional(),
});

export type SerpApiFlightOption = z.infer<typeof serpApiFlightOptionSchema>;

// ==================== Top-level response ====================

export const serpApiSearchResponseSchema = z
  .object({
    // Present on error responses (HTTP 200 with error body)
    error: z.string().optional(),
    search_metadata: z
      .object({
        id: z.string().optional(),
        status: z.string().optional(),
      })
      .passthrough()
      .optional(),
    best_flights: z.array(serpApiFlightOptionSchema).optional(),
    other_flights: z.array(serpApiFlightOptionSchema).optional(),
  })
  .passthrough();

export type SerpApiSearchResponse = z.infer<typeof serpApiSearchResponseSchema>;

// ==================== Search params ====================

export const serpApiSearchParamsSchema = z.object({
  origin: z.string().length(3),
  destination: z.string().length(3),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  passengers: z.number().int().min(1).max(9),
  cabinClass: z.enum(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']),
});
