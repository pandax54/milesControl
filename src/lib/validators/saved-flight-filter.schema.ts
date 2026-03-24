import { z } from 'zod';
import { CABIN_CLASSES } from './flight-search.schema';
import { EXPLORE_REGIONS, EXPLORE_DATE_TYPES } from './explore-destinations.schema';

// ==================== Constants ====================

const MAX_FILTER_NAME_LENGTH = 60;

// ==================== Helpers ====================

const iataCodeSchema = z
  .string()
  .length(3, 'Airport code must be 3 characters')
  .regex(/^[A-Z]{3}$/, 'Airport code must be 3 uppercase letters');

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

// ==================== Schemas ====================

export const createSavedFlightFilterSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Name is required')
      .max(MAX_FILTER_NAME_LENGTH, `Name must be at most ${MAX_FILTER_NAME_LENGTH} characters`)
      .trim(),
    origin: iataCodeSchema.optional(),
    destination: iataCodeSchema.optional(),
    region: z.enum(EXPLORE_REGIONS).optional(),
    cabinClass: z.enum(CABIN_CLASSES).optional(),
    dateType: z.enum(EXPLORE_DATE_TYPES).optional(),
    dateRangeStart: dateStringSchema.optional(),
    dateRangeEnd: dateStringSchema.optional(),
    maxMilesPrice: z.number().int().positive().optional(),
    maxCashPrice: z.number().positive().optional(),
  })
  .refine(
    (data) => {
      if (data.dateRangeStart && data.dateRangeEnd) {
        return data.dateRangeStart <= data.dateRangeEnd;
      }
      return true;
    },
    { message: 'dateRangeStart must be before dateRangeEnd', path: ['dateRangeEnd'] },
  );

export const deleteSavedFlightFilterSchema = z.object({
  filterId: z.string().min(1, 'Filter ID is required'),
});

// ==================== Types ====================

export type CreateSavedFlightFilterInput = z.infer<typeof createSavedFlightFilterSchema>;
export type DeleteSavedFlightFilterInput = z.infer<typeof deleteSavedFlightFilterSchema>;
