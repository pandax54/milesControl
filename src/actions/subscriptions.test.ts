import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

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

vi.mock('@/lib/services/accrual-projector.service', () => ({
  fetchUserProjection: vi.fn(),
}));

vi.mock('@/lib/services/club-subscription.service', () => ({
  createSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  deleteSubscription: vi.fn(),
  ClubTierNotFoundError: class extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = 'ClubTierNotFoundError';
    }
  },
  SubscriptionNotFoundError: class extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = 'SubscriptionNotFoundError';
    }
  },
}));

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import {
  createSubscription,
  updateSubscription,
  deleteSubscription,
  ClubTierNotFoundError,
  SubscriptionNotFoundError,
} from '@/lib/services/club-subscription.service';
import { fetchUserProjection } from '@/lib/services/accrual-projector.service';
import { addSubscription, editSubscription, removeSubscription, getAccrualProjection } from './subscriptions';

const mockAuth = vi.mocked(auth);
const mockCreateSubscription = vi.mocked(createSubscription);
const mockUpdateSubscription = vi.mocked(updateSubscription);
const mockDeleteSubscription = vi.mocked(deleteSubscription);
const mockRevalidatePath = vi.mocked(revalidatePath);
const mockFetchUserProjection = vi.mocked(fetchUserProjection);

const MOCK_SESSION = {
  user: { id: 'user-123', email: 'test@example.com', role: 'USER' as const },
  expires: '2026-12-31',
};

const VALID_ACCRUAL_SCHEDULE = [{ fromMonth: 1, toMonth: null, milesPerMonth: 2000 }];

describe('addSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(MOCK_SESSION as never);
  });

  it('should create subscription successfully', async () => {
    mockCreateSubscription.mockResolvedValue({} as never);

    const result = await addSubscription({
      clubTierId: 'tier-123',
      startDate: '2026-01-01',
      monthlyCost: 73.8,
      accrualSchedule: VALID_ACCRUAL_SCHEDULE,
    });

    expect(result.success).toBe(true);
    expect(mockCreateSubscription).toHaveBeenCalledWith('user-123', {
      clubTierId: 'tier-123',
      startDate: '2026-01-01',
      monthlyCost: 73.8,
      accrualSchedule: VALID_ACCRUAL_SCHEDULE,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/subscriptions');
  });

  it('should return error for invalid input', async () => {
    const result = await addSubscription({
      clubTierId: '',
      startDate: '',
      monthlyCost: -1,
      accrualSchedule: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
    expect(mockCreateSubscription).not.toHaveBeenCalled();
  });

  it('should return error when club tier not found', async () => {
    mockCreateSubscription.mockRejectedValue(new ClubTierNotFoundError('tier-999'));

    const result = await addSubscription({
      clubTierId: 'tier-999',
      startDate: '2026-01-01',
      monthlyCost: 73.8,
      accrualSchedule: VALID_ACCRUAL_SCHEDULE,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Club tier not found');
  });

  it('should return generic error for unexpected failures', async () => {
    mockCreateSubscription.mockRejectedValue(new Error('DB connection failed'));

    const result = await addSubscription({
      clubTierId: 'tier-123',
      startDate: '2026-01-01',
      monthlyCost: 73.8,
      accrualSchedule: VALID_ACCRUAL_SCHEDULE,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to create subscription. Please try again.');
  });

  it('should return authentication error when not logged in', async () => {
    mockAuth.mockResolvedValue(null as never);

    const result = await addSubscription({
      clubTierId: 'tier-123',
      startDate: '2026-01-01',
      monthlyCost: 73.8,
      accrualSchedule: VALID_ACCRUAL_SCHEDULE,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be logged in to perform this action');
  });
});

describe('editSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(MOCK_SESSION as never);
  });

  it('should update subscription successfully', async () => {
    mockUpdateSubscription.mockResolvedValue({} as never);

    const result = await editSubscription({
      subscriptionId: 'sub-123',
      status: 'PAUSED',
    });

    expect(result.success).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/subscriptions');
  });

  it('should return error for invalid input', async () => {
    const result = await editSubscription({ subscriptionId: '' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
  });

  it('should return error when subscription not found', async () => {
    mockUpdateSubscription.mockRejectedValue(new SubscriptionNotFoundError('sub-999'));

    const result = await editSubscription({ subscriptionId: 'sub-999', status: 'CANCELLED' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Subscription not found');
  });

  it('should return generic error for unexpected failures', async () => {
    mockUpdateSubscription.mockRejectedValue(new Error('DB error'));

    const result = await editSubscription({ subscriptionId: 'sub-123', monthlyCost: 80 });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to update subscription. Please try again.');
  });

  it('should return authentication error when not logged in', async () => {
    mockAuth.mockResolvedValue(null as never);

    const result = await editSubscription({ subscriptionId: 'sub-123', status: 'PAUSED' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be logged in to perform this action');
  });
});

describe('removeSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(MOCK_SESSION as never);
  });

  it('should delete subscription successfully', async () => {
    mockDeleteSubscription.mockResolvedValue(undefined);

    const result = await removeSubscription('sub-123');

    expect(result.success).toBe(true);
    expect(mockDeleteSubscription).toHaveBeenCalledWith('user-123', 'sub-123');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/subscriptions');
  });

  it('should return error for empty subscriptionId', async () => {
    const result = await removeSubscription('');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
  });

  it('should return error when subscription not found', async () => {
    mockDeleteSubscription.mockRejectedValue(new SubscriptionNotFoundError('sub-999'));

    const result = await removeSubscription('sub-999');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Subscription not found');
  });

  it('should return generic error for unexpected failures', async () => {
    mockDeleteSubscription.mockRejectedValue(new Error('DB error'));

    const result = await removeSubscription('sub-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to delete subscription. Please try again.');
  });

  it('should return authentication error when not logged in', async () => {
    mockAuth.mockResolvedValue(null as never);

    const result = await removeSubscription('sub-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be logged in to perform this action');
  });
});

describe('getAccrualProjection', () => {
  const mockProjection = {
    months: [],
    totalProjectedMiles: 24000,
    balanceAt3Months: 14000,
    balanceAt6Months: 20000,
    balanceAt12Months: 32000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(MOCK_SESSION as never);
  });

  it('should return projection successfully', async () => {
    mockFetchUserProjection.mockResolvedValue(mockProjection);

    const result = await getAccrualProjection();

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockProjection);
    expect(mockFetchUserProjection).toHaveBeenCalledWith('user-123', undefined);
  });

  it('should pass custom monthsAhead parameter', async () => {
    mockFetchUserProjection.mockResolvedValue(mockProjection);

    await getAccrualProjection(6);

    expect(mockFetchUserProjection).toHaveBeenCalledWith('user-123', 6);
  });

  it('should return authentication error when not logged in', async () => {
    mockAuth.mockResolvedValue(null as never);

    const result = await getAccrualProjection();

    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be logged in to perform this action');
    expect(mockFetchUserProjection).not.toHaveBeenCalled();
  });

  it('should return generic error on unexpected failure', async () => {
    mockFetchUserProjection.mockRejectedValue(new Error('DB error'));

    const result = await getAccrualProjection();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to fetch projection. Please try again.');
  });
});
