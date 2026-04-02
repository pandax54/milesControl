import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SavedFlightFilter } from '@/generated/prisma/client';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    savedFlightFilter: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
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

import { prisma } from '@/lib/prisma';
import {
  listSavedFlightFilters,
  getSavedFlightFilter,
  createSavedFlightFilter,
  deleteSavedFlightFilter,
  SavedFlightFilterNotFoundError,
} from './saved-flight-filter.service';

// ==================== Helpers ====================

const mockFindMany = vi.mocked(prisma.savedFlightFilter.findMany);
const mockFindFirst = vi.mocked(prisma.savedFlightFilter.findFirst);
const mockCreate = vi.mocked(prisma.savedFlightFilter.create);
const mockDelete = vi.mocked(prisma.savedFlightFilter.delete);

const MOCK_USER_ID = 'user-123';
const MOCK_FILTER_ID = 'filter-456';

function buildMockFilter(overrides: Partial<SavedFlightFilter> = {}): SavedFlightFilter {
  return {
    id: MOCK_FILTER_ID,
    userId: MOCK_USER_ID,
    name: 'Europe Business Weekends',
    origin: 'GRU',
    destination: null,
    region: 'EUROPE',
    cabinClass: 'BUSINESS',
    dateType: 'WEEKENDS',
    dateRangeStart: null,
    dateRangeEnd: null,
    maxMilesPrice: null,
    maxCashPrice: null,
    createdAt: new Date('2027-01-01'),
    ...overrides,
  };
}

// ==================== Tests ====================

describe('listSavedFlightFilters', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return all filters for a user ordered by createdAt desc', async () => {
    const filters = [buildMockFilter({ id: 'f1' }), buildMockFilter({ id: 'f2' })];
    mockFindMany.mockResolvedValue(filters);

    const result = await listSavedFlightFilters(MOCK_USER_ID);

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: MOCK_USER_ID },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual(filters);
  });

  it('should return an empty array when user has no saved filters', async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await listSavedFlightFilters(MOCK_USER_ID);

    expect(result).toEqual([]);
  });
});

describe('getSavedFlightFilter', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return the filter when found', async () => {
    const filter = buildMockFilter();
    mockFindFirst.mockResolvedValue(filter);

    const result = await getSavedFlightFilter(MOCK_USER_ID, MOCK_FILTER_ID);

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: MOCK_FILTER_ID, userId: MOCK_USER_ID },
    });
    expect(result).toEqual(filter);
  });

  it('should throw SavedFlightFilterNotFoundError when filter does not exist', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(getSavedFlightFilter(MOCK_USER_ID, 'nonexistent')).rejects.toThrow(
      SavedFlightFilterNotFoundError,
    );
  });

  it('should not return a filter belonging to another user', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(getSavedFlightFilter('other-user', MOCK_FILTER_ID)).rejects.toThrow(
      SavedFlightFilterNotFoundError,
    );
  });
});

describe('createSavedFlightFilter', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should create a filter with all provided fields', async () => {
    const input = {
      name: 'Europe Business Weekends',
      origin: 'GRU',
      region: 'EUROPE' as const,
      cabinClass: 'BUSINESS' as const,
      dateType: 'WEEKENDS' as const,
    };
    const created = buildMockFilter();
    mockCreate.mockResolvedValue(created);

    const result = await createSavedFlightFilter(MOCK_USER_ID, input);

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: MOCK_USER_ID,
        name: 'Europe Business Weekends',
        origin: 'GRU',
        region: 'EUROPE',
        cabinClass: 'BUSINESS',
        dateType: 'WEEKENDS',
      }),
    });
    expect(result).toEqual(created);
  });

  it('should store null for optional fields not provided', async () => {
    const input = { name: 'Simple Filter' };
    const created = buildMockFilter({ name: 'Simple Filter', origin: null, region: null });
    mockCreate.mockResolvedValue(created);

    await createSavedFlightFilter(MOCK_USER_ID, input);

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        origin: null,
        destination: null,
        region: null,
        cabinClass: null,
        dateType: null,
      }),
    });
  });

  it('should convert dateRangeStart string to Date object', async () => {
    const input = { name: 'Date Filter', dateRangeStart: '2027-06-01', dateRangeEnd: '2027-06-30' };
    const created = buildMockFilter();
    mockCreate.mockResolvedValue(created);

    await createSavedFlightFilter(MOCK_USER_ID, input);

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        dateRangeStart: new Date('2027-06-01'),
        dateRangeEnd: new Date('2027-06-30'),
      }),
    });
  });
});

describe('deleteSavedFlightFilter', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should delete the filter when it belongs to the user', async () => {
    const filter = buildMockFilter();
    mockFindFirst.mockResolvedValue(filter);
    mockDelete.mockResolvedValue(filter);

    await deleteSavedFlightFilter(MOCK_USER_ID, { filterId: MOCK_FILTER_ID });

    expect(mockDelete).toHaveBeenCalledWith({ where: { id: MOCK_FILTER_ID } });
  });

  it('should throw SavedFlightFilterNotFoundError when filter does not exist', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      deleteSavedFlightFilter(MOCK_USER_ID, { filterId: 'nonexistent' }),
    ).rejects.toThrow(SavedFlightFilterNotFoundError);
  });

  it('should not delete a filter belonging to another user', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      deleteSavedFlightFilter('other-user', { filterId: MOCK_FILTER_ID }),
    ).rejects.toThrow(SavedFlightFilterNotFoundError);

    expect(mockDelete).not.toHaveBeenCalled();
  });
});

describe('SavedFlightFilterNotFoundError', () => {
  it('should have correct name and message', () => {
    const error = new SavedFlightFilterNotFoundError('test-id');

    expect(error.name).toBe('SavedFlightFilterNotFoundError');
    expect(error.message).toContain('test-id');
  });
});
