import { z } from 'zod';

import { CABIN_CLASSES } from '@/lib/validators/flight-search.schema';

// ==================== Input schemas ====================

// IATA airport code: 3 uppercase letters
const iataCodeSchema = z
  .string()
  .length(3, 'Airport code must be 3 characters')
  .regex(/^[A-Z]{3}$/, 'Airport code must be 3 uppercase letters');

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export const seatsAeroSearchParamsSchema = z
  .object({
    originAirport: iataCodeSchema,
    destinationAirport: iataCodeSchema,
    cabinClass: z.enum(CABIN_CLASSES),
    startDate: dateSchema,
    endDate: dateSchema,
  })
  .refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
    message: 'startDate must not be after endDate',
    path: ['startDate'],
  });

// ==================== API response schemas ====================

export const seatsAeroAvailabilitySchema = z.object({
  ID: z.string(),
  Route: z.string(),
  Date: z.string(),
  ParsedDate: z.string(),
  YAvailable: z.boolean(),
  WAvailable: z.boolean(),
  JAvailable: z.boolean(),
  FAvailable: z.boolean(),
  YMileage: z.number().int().nonnegative(),
  WMileage: z.number().int().nonnegative(),
  JMileage: z.number().int().nonnegative(),
  FMileage: z.number().int().nonnegative(),
  YTaxes: z.number().nonnegative(),
  WTaxes: z.number().nonnegative(),
  JTaxes: z.number().nonnegative(),
  FTaxes: z.number().nonnegative(),
  YSeat: z.number().int().nonnegative(),
  WSeat: z.number().int().nonnegative(),
  JSeat: z.number().int().nonnegative(),
  FSeat: z.number().int().nonnegative(),
  Source: z.string().min(1),
  UpdatedAt: z.string(),
});

export const seatsAeroSearchResponseSchema = z.object({
  count: z.number().int().nonnegative(),
  data: z.array(seatsAeroAvailabilitySchema),
});

export const seatsAeroSegmentSchema = z.object({
  Origin: z.string().length(3),
  Destination: z.string().length(3),
  Airline: z.string().min(1),
  FlightNumber: z.string().min(1),
  DepartureDateTime: z.string(),
  ArrivalDateTime: z.string(),
  Cabin: z.enum(['Y', 'W', 'J', 'F']),
});

export const seatsAeroTripSchema = z.object({
  ID: z.string(),
  Segments: z.array(seatsAeroSegmentSchema),
  Source: z.string().min(1),
  UpdatedAt: z.string(),
});

// ==================== Inferred types ====================

export type SeatsAeroAvailability = z.infer<typeof seatsAeroAvailabilitySchema>;
export type SeatsAeroSearchResponse = z.infer<typeof seatsAeroSearchResponseSchema>;
export type SeatsAeroSegment = z.infer<typeof seatsAeroSegmentSchema>;
export type SeatsAeroTrip = z.infer<typeof seatsAeroTripSchema>;
