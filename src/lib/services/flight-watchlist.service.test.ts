import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FlightWatchlist } from '@/generated/prisma/client';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    flightWatchlist: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('./flight-search.service', () => ({
  searchFlights: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { searchFlights } from './flight-search.service';
import {
  listWatchlistItems,
  listActiveWatchlistItems,
  getWatchlistItem,
  createWatchlistItem,
  updateWatchlistItem,
  toggleWatchlistItem,
  deleteWatchlistItem,
  checkWatchlistItemPrices,
  WatchlistItemNotFoundError,
} from './flight-watchlist.service';
import type { FlightSearchResult } from './flight-search.service';
import type { CreateWatchlistItemInput } from '@/lib/validators/watchlist.schema';

// ==================== Mocks ====================

const mockFindMany = vi.mocked(prisma.flightWatchlist.findMany);
const mockFindFirst = vi.mocked(prisma.flightWatchlist.findFirst);
const mockCreate = vi.mocked(prisma.flightWatchlist.create);
const mockUpdate = vi.mocked(prisma.flightWatchlist.update);
const mockDelete = vi.mocked(prisma.flightWatchlist.delete);
const mockNotificationCreate = vi.mocked(prisma.notification.create);
const mockSearchFlights = vi.mocked(searchFlights);

const MOCK_USER_ID = 'user-123';
const MOCK_WATCHLIST_ID = 'watchlist-456';

function buildMockWatchlistItem(
  overrides: Partial<FlightWatchlist> = {},
): FlightWatchlist {
  return {
    id: MOCK_WATCHLIST_ID,
    userId: MOCK_USER_ID,
    origin: 'GRU',
    destination: 'LIS',
    earliestDate: new Date('2027-01-15'),
    latestDate: new Date('2027-01-20'),
    cabinClass: 'ECONOMY',
    passengers: 1,
    targetMilesPrice: 50000,
    targetCashPrice: null,
    preferredProgram: null,
    isActive: true,
    lastCheckedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildMockFlightSearchResult(
  overrides: Partial<FlightSearchResult> = {},
): FlightSearchResult {
  return {
    params: {
      origin: 'GRU',
      destination: 'LIS',
      departureDate: '2027-01-15',
      passengers: 1,
      cabinClass: 'ECONOMY',
    },
    cashFlights: [],
    awardFlights: [],
    searchedAt: new Date(),
    ...overrides,
  };
}

// ==================== Tests ====================

describe('listWatchlistItems', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return watchlist items for a user ordered by active status and creation', async () => {
    const mockItem = buildMockWatchlistItem();
    mockFindMany.mockResolvedValue([mockItem]);

    const result = await listWatchlistItems(MOCK_USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].origin).toBe('GRU');
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: MOCK_USER_ID },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
  });

  it('should return empty array when user has no watchlist items', async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await listWatchlistItems(MOCK_USER_ID);

    expect(result).toHaveLength(0);
  });
});

describe('listActiveWatchlistItems', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return only active watchlist items ordered by lastCheckedAt', async () => {
    const mockItem = buildMockWatchlistItem();
    mockFindMany.mockResolvedValue([mockItem]);

    const result = await listActiveWatchlistItems();

    expect(result).toHaveLength(1);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { lastCheckedAt: 'asc' },
    });
  });
});

describe('getWatchlistItem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return the watchlist item when found', async () => {
    const mockItem = buildMockWatchlistItem();
    mockFindFirst.mockResolvedValue(mockItem);

    const result = await getWatchlistItem(MOCK_USER_ID, MOCK_WATCHLIST_ID);

    expect(result.id).toBe(MOCK_WATCHLIST_ID);
    expect(result.userId).toBe(MOCK_USER_ID);
  });

  it('should throw WatchlistItemNotFoundError when item does not exist', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(getWatchlistItem(MOCK_USER_ID, MOCK_WATCHLIST_ID)).rejects.toThrow(
      WatchlistItemNotFoundError,
    );
  });
});

describe('createWatchlistItem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should create a watchlist item with miles target', async () => {
    const input: CreateWatchlistItemInput = {
      origin: 'GRU',
      destination: 'LIS',
      cabinClass: 'ECONOMY',
      passengers: 1,
      targetMilesPrice: 50000,
      earliestDate: '2027-01-15',
    };
    const mockItem = buildMockWatchlistItem();
    mockCreate.mockResolvedValue(mockItem);

    const result = await createWatchlistItem(MOCK_USER_ID, input);

    expect(result.id).toBe(MOCK_WATCHLIST_ID);
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: MOCK_USER_ID,
        origin: 'GRU',
        destination: 'LIS',
        targetMilesPrice: 50000,
      }),
    });
  });

  it('should create a watchlist item with cash target', async () => {
    const input: CreateWatchlistItemInput = {
      origin: 'GRU',
      destination: 'MIA',
      cabinClass: 'ECONOMY',
      passengers: 2,
      targetCashPrice: 1500,
    };
    const mockItem = buildMockWatchlistItem({
      destination: 'MIA',
      targetMilesPrice: null,
      targetCashPrice: 1500 as unknown as FlightWatchlist['targetCashPrice'],
    });
    mockCreate.mockResolvedValue(mockItem);

    const result = await createWatchlistItem(MOCK_USER_ID, input);

    expect(result.destination).toBe('MIA');
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        passengers: 2,
        targetCashPrice: 1500,
      }),
    });
  });
});

describe('updateWatchlistItem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should update a watchlist item when it belongs to the user', async () => {
    const existing = buildMockWatchlistItem();
    const updated = buildMockWatchlistItem({ targetMilesPrice: 40000 });
    mockFindFirst.mockResolvedValue(existing);
    mockUpdate.mockResolvedValue(updated);

    const result = await updateWatchlistItem(MOCK_USER_ID, {
      watchlistId: MOCK_WATCHLIST_ID,
      targetMilesPrice: 40000,
    });

    expect(result.targetMilesPrice).toBe(40000);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: MOCK_WATCHLIST_ID },
      data: { targetMilesPrice: 40000 },
    });
  });

  it('should throw WatchlistItemNotFoundError when item does not belong to user', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      updateWatchlistItem(MOCK_USER_ID, {
        watchlistId: MOCK_WATCHLIST_ID,
        targetMilesPrice: 40000,
      }),
    ).rejects.toThrow(WatchlistItemNotFoundError);
  });
});

describe('toggleWatchlistItem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should deactivate a watchlist item', async () => {
    const existing = buildMockWatchlistItem();
    const toggled = buildMockWatchlistItem({ isActive: false });
    mockFindFirst.mockResolvedValue(existing);
    mockUpdate.mockResolvedValue(toggled);

    const result = await toggleWatchlistItem(MOCK_USER_ID, MOCK_WATCHLIST_ID, false);

    expect(result.isActive).toBe(false);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: MOCK_WATCHLIST_ID },
      data: { isActive: false },
    });
  });

  it('should throw WatchlistItemNotFoundError when item does not exist', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      toggleWatchlistItem(MOCK_USER_ID, MOCK_WATCHLIST_ID, false),
    ).rejects.toThrow(WatchlistItemNotFoundError);
  });
});

describe('deleteWatchlistItem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should delete a watchlist item when it belongs to the user', async () => {
    const existing = buildMockWatchlistItem();
    mockFindFirst.mockResolvedValue(existing);
    mockDelete.mockResolvedValue(existing);

    await deleteWatchlistItem(MOCK_USER_ID, MOCK_WATCHLIST_ID);

    expect(mockDelete).toHaveBeenCalledWith({
      where: { id: MOCK_WATCHLIST_ID },
    });
  });

  it('should throw WatchlistItemNotFoundError when item does not belong to user', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      deleteWatchlistItem(MOCK_USER_ID, MOCK_WATCHLIST_ID),
    ).rejects.toThrow(WatchlistItemNotFoundError);
  });
});

describe('checkWatchlistItemPrices', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should skip check and update lastCheckedAt when no future date is available', async () => {
    const item = buildMockWatchlistItem({
      earliestDate: new Date('2020-01-01'),
      latestDate: new Date('2020-01-05'),
    });
    mockUpdate.mockResolvedValue(item);

    const result = await checkWatchlistItemPrices(item);

    expect(result.alertsCreated).toBe(0);
    expect(result.milesAlertTriggered).toBe(false);
    expect(result.cashAlertTriggered).toBe(false);
    expect(mockSearchFlights).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: MOCK_WATCHLIST_ID },
      data: { lastCheckedAt: expect.any(Date) },
    });
  });

  it('should trigger miles alert when award flight is at or below target', async () => {
    const item = buildMockWatchlistItem({
      targetMilesPrice: 50000,
      earliestDate: new Date('2027-06-01'),
    });
    const searchResult = buildMockFlightSearchResult({
      awardFlights: [
        {
          airline: 'TAP Air Portugal',
          milesRequired: 45000,
          taxes: 300,
          program: 'Smiles',
          cabinClass: 'ECONOMY',
          seatsAvailable: 2,
          source: 'SEATS_AERO',
        },
      ],
    });
    mockSearchFlights.mockResolvedValue(searchResult);
    mockUpdate.mockResolvedValue(item);
    mockNotificationCreate.mockResolvedValue({} as never);

    const result = await checkWatchlistItemPrices(item);

    expect(result.milesAlertTriggered).toBe(true);
    expect(result.alertsCreated).toBe(1);
    expect(mockNotificationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: MOCK_USER_ID,
        channel: 'IN_APP',
        title: 'Miles price alert: GRU → LIS',
      }),
    });
  });

  it('should trigger cash alert when cash flight is at or below target', async () => {
    const item = buildMockWatchlistItem({
      targetMilesPrice: null,
      targetCashPrice: 2000 as unknown as FlightWatchlist['targetCashPrice'],
      earliestDate: new Date('2027-06-01'),
    });
    const searchResult = buildMockFlightSearchResult({
      cashFlights: [
        {
          airline: 'TAP Air Portugal',
          price: 1800,
          duration: 480,
          stops: 0,
          departureTime: '2027-06-01T10:00:00',
          arrivalTime: '2027-06-01T21:00:00',
          source: 'GOOGLE_FLIGHTS',
        },
      ],
    });
    mockSearchFlights.mockResolvedValue(searchResult);
    mockUpdate.mockResolvedValue(item);
    mockNotificationCreate.mockResolvedValue({} as never);

    const result = await checkWatchlistItemPrices(item);

    expect(result.cashAlertTriggered).toBe(true);
    expect(result.alertsCreated).toBe(1);
    expect(mockNotificationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: MOCK_USER_ID,
        channel: 'IN_APP',
        title: 'Cash price alert: GRU → LIS',
      }),
    });
  });

  it('should not trigger alert when award flight price is above target', async () => {
    const item = buildMockWatchlistItem({
      targetMilesPrice: 50000,
      earliestDate: new Date('2027-06-01'),
    });
    const searchResult = buildMockFlightSearchResult({
      awardFlights: [
        {
          airline: 'TAP Air Portugal',
          milesRequired: 70000,
          taxes: 300,
          program: 'Smiles',
          cabinClass: 'ECONOMY',
          seatsAvailable: 2,
          source: 'SEATS_AERO',
        },
      ],
    });
    mockSearchFlights.mockResolvedValue(searchResult);
    mockUpdate.mockResolvedValue(item);

    const result = await checkWatchlistItemPrices(item);

    expect(result.milesAlertTriggered).toBe(false);
    expect(result.alertsCreated).toBe(0);
    expect(mockNotificationCreate).not.toHaveBeenCalled();
  });

  it('should filter by preferred program when checking miles target', async () => {
    const item = buildMockWatchlistItem({
      targetMilesPrice: 50000,
      preferredProgram: 'smiles',
      earliestDate: new Date('2027-06-01'),
    });
    const searchResult = buildMockFlightSearchResult({
      awardFlights: [
        {
          airline: 'LATAM',
          milesRequired: 30000,
          taxes: 150,
          program: 'Latam Pass',
          cabinClass: 'ECONOMY',
          seatsAvailable: 4,
          source: 'SEATS_AERO',
        },
      ],
    });
    mockSearchFlights.mockResolvedValue(searchResult);
    mockUpdate.mockResolvedValue(item);

    const result = await checkWatchlistItemPrices(item);

    // Should not trigger because program is 'Latam Pass', not 'smiles'
    expect(result.milesAlertTriggered).toBe(false);
    expect(mockNotificationCreate).not.toHaveBeenCalled();
  });

  it('should update lastCheckedAt even when search fails', async () => {
    const item = buildMockWatchlistItem({
      earliestDate: new Date('2027-06-01'),
    });
    mockSearchFlights.mockRejectedValue(new Error('Search failed'));
    mockUpdate.mockResolvedValue(item);

    const result = await checkWatchlistItemPrices(item);

    expect(result.alertsCreated).toBe(0);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: MOCK_WATCHLIST_ID },
      data: { lastCheckedAt: expect.any(Date) },
    });
  });

  it('should use latestDate when earliestDate is in the past', async () => {
    const item = buildMockWatchlistItem({
      earliestDate: new Date('2020-01-01'),
      latestDate: new Date('2027-06-01'),
    });
    const searchResult = buildMockFlightSearchResult();
    mockSearchFlights.mockResolvedValue(searchResult);
    mockUpdate.mockResolvedValue(item);

    await checkWatchlistItemPrices(item);

    expect(mockSearchFlights).toHaveBeenCalledWith(
      expect.objectContaining({
        departureDate: '2027-06-01',
      }),
    );
  });
});
