'use server';

import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';
import {
  createWatchlistItemSchema,
  updateWatchlistItemSchema,
  deleteWatchlistItemSchema,
  toggleWatchlistItemSchema,
  type CreateWatchlistItemInput,
  type UpdateWatchlistItemInput,
} from '@/lib/validators/watchlist.schema';
import {
  createWatchlistItem as createWatchlistItemService,
  updateWatchlistItem as updateWatchlistItemService,
  deleteWatchlistItem as deleteWatchlistItemService,
  toggleWatchlistItem as toggleWatchlistItemService,
  WatchlistItemNotFoundError,
} from '@/lib/services/flight-watchlist.service';
import { requireUserId, isAuthenticationError, type ActionResult } from './helpers';

export async function addWatchlistItem(input: CreateWatchlistItemInput): Promise<ActionResult> {
  const parsed = createWatchlistItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const userId = await requireUserId();
    await createWatchlistItemService(userId, parsed.data);
    revalidatePath('/flights/watchlist');
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    logger.error({ err: error }, 'Failed to create watchlist item');
    return { success: false, error: 'Failed to add to watchlist. Please try again.' };
  }
}

export async function editWatchlistItem(input: UpdateWatchlistItemInput): Promise<ActionResult> {
  const parsed = updateWatchlistItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const userId = await requireUserId();
    await updateWatchlistItemService(userId, parsed.data);
    revalidatePath('/flights/watchlist');
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    if (error instanceof WatchlistItemNotFoundError) {
      return { success: false, error: 'Watchlist item not found' };
    }
    logger.error({ err: error }, 'Failed to update watchlist item');
    return { success: false, error: 'Failed to update watchlist item. Please try again.' };
  }
}

export async function removeWatchlistItem(watchlistId: string): Promise<ActionResult> {
  const parsed = deleteWatchlistItemSchema.safeParse({ watchlistId });
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const userId = await requireUserId();
    await deleteWatchlistItemService(userId, parsed.data.watchlistId);
    revalidatePath('/flights/watchlist');
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    if (error instanceof WatchlistItemNotFoundError) {
      return { success: false, error: 'Watchlist item not found' };
    }
    logger.error({ err: error }, 'Failed to delete watchlist item');
    return { success: false, error: 'Failed to remove from watchlist. Please try again.' };
  }
}

export async function setWatchlistItemActive(
  watchlistId: string,
  isActive: boolean,
): Promise<ActionResult> {
  const parsed = toggleWatchlistItemSchema.safeParse({ watchlistId, isActive });
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const userId = await requireUserId();
    await toggleWatchlistItemService(userId, parsed.data.watchlistId, parsed.data.isActive);
    revalidatePath('/flights/watchlist');
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    if (error instanceof WatchlistItemNotFoundError) {
      return { success: false, error: 'Watchlist item not found' };
    }
    logger.error({ err: error }, 'Failed to toggle watchlist item');
    return { success: false, error: 'Failed to update watchlist item. Please try again.' };
  }
}
