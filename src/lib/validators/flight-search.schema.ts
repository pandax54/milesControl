import { z } from 'zod';

// ==================== Constants ====================

export const CABIN_CLASSES = ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'] as const;
export type CabinClass = (typeof CABIN_CLASSES)[number];

export const CABIN_CLASS_LABELS: Record<CabinClass, string> = {
  ECONOMY: 'Economy',
  PREMIUM_ECONOMY: 'Premium Economy',
  BUSINESS: 'Business',
  FIRST: 'First',
};

// ==================== Schema ====================

// IATA airport code: 3 uppercase letters
const iataCodeSchema = z
  .string()
  .length(3, 'Airport code must be 3 characters')
  .regex(/^[A-Z]{3}$/, 'Airport code must be 3 uppercase letters');

export const flightSearchParamsSchema = z.object({
  origin: iataCodeSchema,
  destination: iataCodeSchema,
  departureDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Departure date must be YYYY-MM-DD'),
  returnDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Return date must be YYYY-MM-DD')
    .optional(),
  passengers: z.number().int().min(1).max(9).default(1),
  cabinClass: z.enum(CABIN_CLASSES).default('ECONOMY'),
});

export type FlightSearchParams = z.infer<typeof flightSearchParamsSchema>;
