import { z } from 'zod';
import { CABIN_CLASSES } from './flight-search.schema';

// ==================== Constants ====================

export const EXPLORE_REGIONS = [
  'BRAZIL',
  'SOUTH_AMERICA',
  'NORTH_AMERICA',
  'EUROPE',
  'CARIBBEAN',
] as const;

export type ExploreRegion = (typeof EXPLORE_REGIONS)[number];

export const EXPLORE_REGION_LABELS: Record<ExploreRegion, string> = {
  BRAZIL: 'Brazil',
  SOUTH_AMERICA: 'South America',
  NORTH_AMERICA: 'North America',
  EUROPE: 'Europe',
  CARIBBEAN: 'Caribbean',
};

export const EXPLORE_DATE_TYPES = ['WEEKENDS', 'HOLIDAYS', 'FLEXIBLE'] as const;

export type ExploreDateType = (typeof EXPLORE_DATE_TYPES)[number];

export const EXPLORE_DATE_TYPE_LABELS: Record<ExploreDateType, string> = {
  WEEKENDS: 'Upcoming Weekends',
  HOLIDAYS: 'Brazilian Holidays',
  FLEXIBLE: 'Next Month',
};

export const EXPLORE_SORT_OPTIONS = ['BEST_MILES_VALUE', 'LOWEST_CASH', 'LOWEST_MILES'] as const;

export type ExploreSortBy = (typeof EXPLORE_SORT_OPTIONS)[number];

export const EXPLORE_SORT_LABELS: Record<ExploreSortBy, string> = {
  BEST_MILES_VALUE: 'Best Miles Value',
  LOWEST_CASH: 'Lowest Cash Price',
  LOWEST_MILES: 'Lowest Miles Required',
};

// ==================== Schema ====================

// IATA airport code: 3 uppercase letters
const iataCodeSchema = z
  .string()
  .length(3, 'Airport code must be 3 characters')
  .regex(/^[A-Z]{3}$/, 'Airport code must be 3 uppercase letters');

export const exploreDestinationsParamsSchema = z.object({
  origin: iataCodeSchema,
  region: z.enum(EXPLORE_REGIONS),
  dateType: z.enum(EXPLORE_DATE_TYPES),
  cabinClass: z.enum(CABIN_CLASSES).default('ECONOMY'),
  sortBy: z.enum(EXPLORE_SORT_OPTIONS).default('BEST_MILES_VALUE'),
  /** For FLEXIBLE date type: YYYY-MM (defaults to next month if omitted) */
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM')
    .optional(),
});

export type ExploreDestinationsParams = z.infer<typeof exploreDestinationsParamsSchema>;
