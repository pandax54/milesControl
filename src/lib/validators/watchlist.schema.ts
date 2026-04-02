import { z } from 'zod';
import { CABIN_CLASSES } from './flight-search.schema';

// ==================== Constants ====================

export const PREFERRED_PROGRAMS = ['smiles', 'azul', 'latam', 'any'] as const;
export type PreferredProgram = (typeof PREFERRED_PROGRAMS)[number];

const iataCodeSchema = z
  .string()
  .length(3, 'Airport code must be 3 characters')
  .regex(/^[A-Z]{3}$/, 'Airport code must be 3 uppercase letters');

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  .optional();

// ==================== Schemas ====================

export const createWatchlistItemSchema = z
  .object({
    origin: iataCodeSchema,
    destination: iataCodeSchema,
    earliestDate: dateStringSchema,
    latestDate: dateStringSchema,
    cabinClass: z.enum(CABIN_CLASSES).default('ECONOMY'),
    passengers: z.number().int().min(1).max(9).default(1),
    targetMilesPrice: z.number().int().min(1).optional(),
    targetCashPrice: z.number().min(0).optional(),
    preferredProgram: z.string().optional(),
  })
  .refine(
    (data) => data.targetMilesPrice != null || data.targetCashPrice != null,
    { message: 'At least one target price (miles or cash) is required' },
  );

export const updateWatchlistItemSchema = z.object({
  watchlistId: z.string().min(1, 'Watchlist ID is required'),
  origin: iataCodeSchema.optional(),
  destination: iataCodeSchema.optional(),
  earliestDate: dateStringSchema,
  latestDate: dateStringSchema,
  cabinClass: z.enum(CABIN_CLASSES).optional(),
  passengers: z.number().int().min(1).max(9).optional(),
  targetMilesPrice: z.number().int().min(1).nullable().optional(),
  targetCashPrice: z.number().min(0).nullable().optional(),
  preferredProgram: z.string().nullable().optional(),
});

export const deleteWatchlistItemSchema = z.object({
  watchlistId: z.string().min(1, 'Watchlist ID is required'),
});

export const toggleWatchlistItemSchema = z.object({
  watchlistId: z.string().min(1, 'Watchlist ID is required'),
  isActive: z.boolean(),
});

// ==================== Types ====================

export type CreateWatchlistItemInput = z.infer<typeof createWatchlistItemSchema>;
export type UpdateWatchlistItemInput = z.infer<typeof updateWatchlistItemSchema>;
export type DeleteWatchlistItemInput = z.infer<typeof deleteWatchlistItemSchema>;
export type ToggleWatchlistItemInput = z.infer<typeof toggleWatchlistItemSchema>;
