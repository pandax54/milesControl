import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./helpers', () => {
  class AuthenticationError extends Error {
    constructor() {
      super('Not authenticated');
      this.name = 'AuthenticationError';
    }
  }
  return {
    requireUserId: vi.fn(),
    isAuthenticationError: (error: unknown) => error instanceof AuthenticationError,
    AuthenticationError,
  };
});

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/services/flight-watchlist.service', () => ({
  createWatchlistItem: vi.fn(),
  updateWatchlistItem: vi.fn(),
  deleteWatchlistItem: vi.fn(),
  toggleWatchlistItem: vi.fn(),
  WatchlistItemNotFoundError: class extends Error {
    constructor(id: string) {
      super(id);
      this.name = 'WatchlistItemNotFoundError';
    }
  },
}));

import { revalidatePath } from 'next/cache';
import {
  createWatchlistItem,
  updateWatchlistItem,
  deleteWatchlistItem,
  toggleWatchlistItem,
  WatchlistItemNotFoundError,
} from '@/lib/services/flight-watchlist.service';
import { requireUserId, AuthenticationError } from './helpers';
import {
  addWatchlistItem,
  editWatchlistItem,
  removeWatchlistItem,
  setWatchlistItemActive,
} from './watchlist';

const mockRequireUserId = vi.mocked(requireUserId);
const mockCreate = vi.mocked(createWatchlistItem);
const mockUpdate = vi.mocked(updateWatchlistItem);
const mockDelete = vi.mocked(deleteWatchlistItem);
const mockToggle = vi.mocked(toggleWatchlistItem);
const mockRevalidate = vi.mocked(revalidatePath);

const MOCK_USER_ID = 'user-123';
const MOCK_WATCHLIST_ID = 'watchlist-456';

describe('addWatchlistItem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should add a watchlist item successfully', async () => {
    mockRequireUserId.mockResolvedValue(MOCK_USER_ID);
    mockCreate.mockResolvedValue({} as never);

    const result = await addWatchlistItem({
      origin: 'GRU',
      destination: 'LIS',
      cabinClass: 'ECONOMY',
      passengers: 1,
      targetMilesPrice: 50000,
    });

    expect(result.success).toBe(true);
    expect(mockCreate).toHaveBeenCalledWith(
      MOCK_USER_ID,
      expect.objectContaining({ origin: 'GRU', destination: 'LIS', targetMilesPrice: 50000 }),
    );
    expect(mockRevalidate).toHaveBeenCalledWith('/flights/watchlist');
  });

  it('should return error for invalid input', async () => {
    const result = await addWatchlistItem({
      origin: 'INVALID',
      destination: 'LIS',
      cabinClass: 'ECONOMY',
      passengers: 1,
      targetMilesPrice: 50000,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('should return error when no target price is provided', async () => {
    const result = await addWatchlistItem({
      origin: 'GRU',
      destination: 'LIS',
      cabinClass: 'ECONOMY',
      passengers: 1,
    } as never);

    expect(result.success).toBe(false);
  });

  it('should return authentication error when user is not logged in', async () => {
    mockRequireUserId.mockRejectedValue(new AuthenticationError());

    const result = await addWatchlistItem({
      origin: 'GRU',
      destination: 'LIS',
      cabinClass: 'ECONOMY',
      passengers: 1,
      targetMilesPrice: 50000,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be logged in to perform this action');
  });
});

describe('editWatchlistItem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should update a watchlist item successfully', async () => {
    mockRequireUserId.mockResolvedValue(MOCK_USER_ID);
    mockUpdate.mockResolvedValue({} as never);

    const result = await editWatchlistItem({
      watchlistId: MOCK_WATCHLIST_ID,
      targetMilesPrice: 40000,
    });

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      MOCK_USER_ID,
      expect.objectContaining({ watchlistId: MOCK_WATCHLIST_ID, targetMilesPrice: 40000 }),
    );
    expect(mockRevalidate).toHaveBeenCalledWith('/flights/watchlist');
  });

  it('should return error when watchlist item not found', async () => {
    mockRequireUserId.mockResolvedValue(MOCK_USER_ID);
    mockUpdate.mockRejectedValue(new WatchlistItemNotFoundError(MOCK_WATCHLIST_ID));

    const result = await editWatchlistItem({
      watchlistId: MOCK_WATCHLIST_ID,
      targetMilesPrice: 40000,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Watchlist item not found');
  });

  it('should return error for invalid watchlist ID', async () => {
    const result = await editWatchlistItem({
      watchlistId: '',
      targetMilesPrice: 40000,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
  });
});

describe('removeWatchlistItem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should remove a watchlist item successfully', async () => {
    mockRequireUserId.mockResolvedValue(MOCK_USER_ID);
    mockDelete.mockResolvedValue(undefined);

    const result = await removeWatchlistItem(MOCK_WATCHLIST_ID);

    expect(result.success).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith(MOCK_USER_ID, MOCK_WATCHLIST_ID);
    expect(mockRevalidate).toHaveBeenCalledWith('/flights/watchlist');
  });

  it('should return error when watchlist item not found', async () => {
    mockRequireUserId.mockResolvedValue(MOCK_USER_ID);
    mockDelete.mockRejectedValue(new WatchlistItemNotFoundError(MOCK_WATCHLIST_ID));

    const result = await removeWatchlistItem(MOCK_WATCHLIST_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Watchlist item not found');
  });

  it('should return error for invalid watchlist ID', async () => {
    const result = await removeWatchlistItem('');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
  });
});

describe('setWatchlistItemActive', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should deactivate a watchlist item', async () => {
    mockRequireUserId.mockResolvedValue(MOCK_USER_ID);
    mockToggle.mockResolvedValue({} as never);

    const result = await setWatchlistItemActive(MOCK_WATCHLIST_ID, false);

    expect(result.success).toBe(true);
    expect(mockToggle).toHaveBeenCalledWith(MOCK_USER_ID, MOCK_WATCHLIST_ID, false);
    expect(mockRevalidate).toHaveBeenCalledWith('/flights/watchlist');
  });

  it('should activate a watchlist item', async () => {
    mockRequireUserId.mockResolvedValue(MOCK_USER_ID);
    mockToggle.mockResolvedValue({} as never);

    const result = await setWatchlistItemActive(MOCK_WATCHLIST_ID, true);

    expect(result.success).toBe(true);
    expect(mockToggle).toHaveBeenCalledWith(MOCK_USER_ID, MOCK_WATCHLIST_ID, true);
  });

  it('should return error when watchlist item not found', async () => {
    mockRequireUserId.mockResolvedValue(MOCK_USER_ID);
    mockToggle.mockRejectedValue(new WatchlistItemNotFoundError(MOCK_WATCHLIST_ID));

    const result = await setWatchlistItemActive(MOCK_WATCHLIST_ID, false);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Watchlist item not found');
  });

  it('should return authentication error when user is not logged in', async () => {
    mockRequireUserId.mockRejectedValue(new AuthenticationError());

    const result = await setWatchlistItemActive(MOCK_WATCHLIST_ID, false);

    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be logged in to perform this action');
  });
});
