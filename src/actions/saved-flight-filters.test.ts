import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SavedFlightFilter } from '@/generated/prisma/client';

// ==================== Mocks ====================

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/services/saved-flight-filter.service', () => ({
  listSavedFlightFilters: vi.fn(),
  createSavedFlightFilter: vi.fn(),
  deleteSavedFlightFilter: vi.fn(),
  SavedFlightFilterNotFoundError: class SavedFlightFilterNotFoundError extends Error {
    constructor(id: string) {
      super(`Saved flight filter not found: ${id}`);
      this.name = 'SavedFlightFilterNotFoundError';
    }
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

import { auth } from '@/lib/auth';
import {
  listSavedFlightFilters,
  createSavedFlightFilter,
  deleteSavedFlightFilter,
  SavedFlightFilterNotFoundError,
} from '@/lib/services/saved-flight-filter.service';
import {
  listSavedFlightFiltersAction,
  createSavedFlightFilterAction,
  deleteSavedFlightFilterAction,
} from './saved-flight-filters';

// ==================== Fixtures ====================

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

describe('listSavedFlightFiltersAction', () => {
  const mockAuth = vi.mocked(auth);
  const mockListFilters = vi.mocked(listSavedFlightFilters);

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: MOCK_USER_ID, role: 'USER' } } as never);
    mockListFilters.mockResolvedValue([buildMockFilter()]);
  });

  it('should return list of filters for authenticated user', async () => {
    const result = await listSavedFlightFiltersAction();

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(mockListFilters).toHaveBeenCalledWith(MOCK_USER_ID);
  });

  it('should return error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as never);

    const result = await listSavedFlightFiltersAction();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Not authenticated');
    expect(mockListFilters).not.toHaveBeenCalled();
  });

  it('should return error when service throws', async () => {
    mockListFilters.mockRejectedValue(new Error('DB error'));

    const result = await listSavedFlightFiltersAction();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to load saved filters');
  });
});

describe('createSavedFlightFilterAction', () => {
  const mockAuth = vi.mocked(auth);
  const mockCreateFilter = vi.mocked(createSavedFlightFilter);

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: MOCK_USER_ID, role: 'USER' } } as never);
    mockCreateFilter.mockResolvedValue(buildMockFilter());
  });

  it('should create filter for authenticated user with valid input', async () => {
    const input = {
      name: 'Europe Business Weekends',
      origin: 'GRU',
      region: 'EUROPE' as const,
      cabinClass: 'BUSINESS' as const,
      dateType: 'WEEKENDS' as const,
    };

    const result = await createSavedFlightFilterAction(input);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(mockCreateFilter).toHaveBeenCalledWith(MOCK_USER_ID, expect.objectContaining({ name: 'Europe Business Weekends' }));
  });

  it('should return error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as never);

    const result = await createSavedFlightFilterAction({ name: 'Test Filter' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Not authenticated');
    expect(mockCreateFilter).not.toHaveBeenCalled();
  });

  it('should return error for invalid input', async () => {
    const result = await createSavedFlightFilterAction({ name: '' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid filter data');
    expect(mockCreateFilter).not.toHaveBeenCalled();
  });

  it('should return error when service throws', async () => {
    mockCreateFilter.mockRejectedValue(new Error('DB error'));

    const result = await createSavedFlightFilterAction({ name: 'Test Filter' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to save filter');
  });

  it('should trim whitespace from name', async () => {
    const result = await createSavedFlightFilterAction({ name: '  My Filter  ' });

    expect(result.success).toBe(true);
    expect(mockCreateFilter).toHaveBeenCalledWith(
      MOCK_USER_ID,
      expect.objectContaining({ name: 'My Filter' }),
    );
  });
});

describe('deleteSavedFlightFilterAction', () => {
  const mockAuth = vi.mocked(auth);
  const mockDeleteFilter = vi.mocked(deleteSavedFlightFilter);

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: MOCK_USER_ID, role: 'USER' } } as never);
    mockDeleteFilter.mockResolvedValue(undefined);
  });

  it('should delete filter for authenticated user', async () => {
    const result = await deleteSavedFlightFilterAction(MOCK_FILTER_ID);

    expect(result.success).toBe(true);
    expect(mockDeleteFilter).toHaveBeenCalledWith(
      MOCK_USER_ID,
      { filterId: MOCK_FILTER_ID },
    );
  });

  it('should return error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as never);

    const result = await deleteSavedFlightFilterAction(MOCK_FILTER_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Not authenticated');
    expect(mockDeleteFilter).not.toHaveBeenCalled();
  });

  it('should return error for invalid filter ID', async () => {
    const result = await deleteSavedFlightFilterAction('');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid filter ID');
    expect(mockDeleteFilter).not.toHaveBeenCalled();
  });

  it('should return not found error when filter does not exist', async () => {
    mockDeleteFilter.mockRejectedValue(new SavedFlightFilterNotFoundError('nonexistent'));

    const result = await deleteSavedFlightFilterAction('nonexistent');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Filter not found');
  });

  it('should return generic error when service throws unknown error', async () => {
    mockDeleteFilter.mockRejectedValue(new Error('DB error'));

    const result = await deleteSavedFlightFilterAction(MOCK_FILTER_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to delete filter');
  });
});
