'use server';

import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import {
  createSavedFlightFilterSchema,
  deleteSavedFlightFilterSchema,
  type CreateSavedFlightFilterInput,
} from '@/lib/validators/saved-flight-filter.schema';
import {
  listSavedFlightFilters,
  createSavedFlightFilter,
  deleteSavedFlightFilter,
  SavedFlightFilterNotFoundError,
  type SavedFlightFilter,
} from '@/lib/services/saved-flight-filter.service';

// ==================== Types ====================

interface ListFiltersResult {
  success: boolean;
  data?: SavedFlightFilter[];
  error?: string;
}

interface MutationResult {
  success: boolean;
  data?: SavedFlightFilter;
  error?: string;
}

interface DeleteResult {
  success: boolean;
  error?: string;
}

// ==================== Actions ====================

/**
 * List all saved flight filters for the authenticated user.
 *
 * PRD F4.9: Save favorite filters for quick reuse.
 */
export async function listSavedFlightFiltersAction(): Promise<ListFiltersResult> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    const filters = await listSavedFlightFilters(session.user.id);

    return { success: true, data: filters };
  } catch (error) {
    logger.error({ err: error }, 'Failed to list saved flight filters');
    return { success: false, error: 'Failed to load saved filters' };
  }
}

/**
 * Save a new flight filter for the authenticated user.
 *
 * PRD F4.9: Save common search patterns (e.g., "VIX → any Europe, business, weekends in September").
 */
export async function createSavedFlightFilterAction(
  input: CreateSavedFlightFilterInput,
): Promise<MutationResult> {
  const parsed = createSavedFlightFilterSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Invalid filter data' };
  }

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    const filter = await createSavedFlightFilter(session.user.id, parsed.data);

    logger.info(
      { userId: session.user.id, filterId: filter.id, name: filter.name },
      'Saved flight filter action completed',
    );

    return { success: true, data: filter };
  } catch (error) {
    logger.error({ err: error }, 'Failed to create saved flight filter');
    return { success: false, error: 'Failed to save filter' };
  }
}

/**
 * Delete a saved flight filter owned by the authenticated user.
 *
 * PRD F4.9: Manage saved search patterns.
 */
export async function deleteSavedFlightFilterAction(filterId: string): Promise<DeleteResult> {
  const parsed = deleteSavedFlightFilterSchema.safeParse({ filterId });
  if (!parsed.success) {
    return { success: false, error: 'Invalid filter ID' };
  }

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    await deleteSavedFlightFilter(session.user.id, parsed.data);

    logger.info(
      { userId: session.user.id, filterId: parsed.data.filterId },
      'Saved flight filter deleted via action',
    );

    return { success: true };
  } catch (error) {
    if (error instanceof SavedFlightFilterNotFoundError) {
      return { success: false, error: 'Filter not found' };
    }
    logger.error({ err: error }, 'Failed to delete saved flight filter');
    return { success: false, error: 'Failed to delete filter' };
  }
}
