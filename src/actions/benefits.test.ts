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

vi.mock('@/lib/services/tracked-benefit.service', () => ({
  createBenefit: vi.fn(),
  updateBenefit: vi.fn(),
  deleteBenefit: vi.fn(),
  markBenefitUsed: vi.fn(),
  BenefitNotFoundError: class extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = 'BenefitNotFoundError';
    }
  },
  BenefitAlreadyUsedError: class extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = 'BenefitAlreadyUsedError';
    }
  },
}));

import { revalidatePath } from 'next/cache';
import {
  createBenefit,
  updateBenefit,
  deleteBenefit,
  markBenefitUsed,
  BenefitNotFoundError,
  BenefitAlreadyUsedError,
} from '@/lib/services/tracked-benefit.service';
import { requireUserId, AuthenticationError } from './helpers';
import { addBenefit, editBenefit, removeBenefit, useBenefit } from './benefits';
import type { TrackedBenefit, BenefitType } from '@/generated/prisma/client';

function buildMockBenefitReturn(overrides: Partial<TrackedBenefit> = {}): TrackedBenefit {
  return {
    id: 'benefit-123',
    userId: 'user-123',
    type: 'FREE_NIGHT' as BenefitType,
    programOrCard: 'Clube Smiles',
    description: 'Free night',
    quantity: 1,
    remainingQty: 1,
    expirationDate: null,
    isUsed: false,
    usedAt: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const mockRequireUserId = vi.mocked(requireUserId);
const mockCreateBenefit = vi.mocked(createBenefit);
const mockUpdateBenefit = vi.mocked(updateBenefit);
const mockDeleteBenefit = vi.mocked(deleteBenefit);
const mockMarkBenefitUsed = vi.mocked(markBenefitUsed);
const mockRevalidatePath = vi.mocked(revalidatePath);

describe('addBenefit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUserId.mockResolvedValue('user-123');
  });

  it('should create benefit successfully', async () => {
    mockCreateBenefit.mockResolvedValue(buildMockBenefitReturn());

    const result = await addBenefit({
      type: 'FREE_NIGHT',
      programOrCard: 'Clube Smiles',
      description: 'Free night at Marriott',
      quantity: 2,
      expirationDate: '2026-12-31',
    });

    expect(result.success).toBe(true);
    expect(mockCreateBenefit).toHaveBeenCalledWith('user-123', {
      type: 'FREE_NIGHT',
      programOrCard: 'Clube Smiles',
      description: 'Free night at Marriott',
      quantity: 2,
      expirationDate: '2026-12-31',
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/benefits');
  });

  it('should return error for invalid input', async () => {
    const result = await addBenefit({
      type: 'FREE_NIGHT',
      programOrCard: '',
      description: '',
      quantity: 0,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
    expect(mockCreateBenefit).not.toHaveBeenCalled();
  });

  it('should return generic error for unexpected failures', async () => {
    mockCreateBenefit.mockRejectedValue(new Error('DB connection failed'));

    const result = await addBenefit({
      type: 'FREE_NIGHT',
      programOrCard: 'Clube Smiles',
      description: 'Free night',
      quantity: 1,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to create benefit. Please try again.');
  });

  it('should return authentication error when not logged in', async () => {
    mockRequireUserId.mockRejectedValue(new AuthenticationError());

    const result = await addBenefit({
      type: 'FREE_NIGHT',
      programOrCard: 'Clube Smiles',
      description: 'Free night',
      quantity: 1,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be logged in to perform this action');
  });
});

describe('editBenefit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUserId.mockResolvedValue('user-123');
  });

  it('should update benefit successfully', async () => {
    mockUpdateBenefit.mockResolvedValue(buildMockBenefitReturn({ description: 'Updated description' }));

    const result = await editBenefit({
      benefitId: 'benefit-123',
      description: 'Updated description',
    });

    expect(result.success).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/benefits');
  });

  it('should return error for invalid input', async () => {
    const result = await editBenefit({ benefitId: '' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
  });

  it('should return error when benefit not found', async () => {
    mockUpdateBenefit.mockRejectedValue(new BenefitNotFoundError('benefit-999'));

    const result = await editBenefit({ benefitId: 'benefit-999', description: 'Test' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Benefit not found');
  });

  it('should return generic error for unexpected failures', async () => {
    mockUpdateBenefit.mockRejectedValue(new Error('DB error'));

    const result = await editBenefit({ benefitId: 'benefit-123', quantity: 5 });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to update benefit. Please try again.');
  });

  it('should return authentication error when not logged in', async () => {
    mockRequireUserId.mockRejectedValue(new AuthenticationError());

    const result = await editBenefit({ benefitId: 'benefit-123', description: 'Test' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be logged in to perform this action');
  });
});

describe('removeBenefit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUserId.mockResolvedValue('user-123');
  });

  it('should delete benefit successfully', async () => {
    mockDeleteBenefit.mockResolvedValue(undefined);

    const result = await removeBenefit('benefit-123');

    expect(result.success).toBe(true);
    expect(mockDeleteBenefit).toHaveBeenCalledWith('user-123', 'benefit-123');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/benefits');
  });

  it('should return error for empty benefitId', async () => {
    const result = await removeBenefit('');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
  });

  it('should return error when benefit not found', async () => {
    mockDeleteBenefit.mockRejectedValue(new BenefitNotFoundError('benefit-999'));

    const result = await removeBenefit('benefit-999');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Benefit not found');
  });

  it('should return generic error for unexpected failures', async () => {
    mockDeleteBenefit.mockRejectedValue(new Error('DB error'));

    const result = await removeBenefit('benefit-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to delete benefit. Please try again.');
  });

  it('should return authentication error when not logged in', async () => {
    mockRequireUserId.mockRejectedValue(new AuthenticationError());

    const result = await removeBenefit('benefit-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be logged in to perform this action');
  });
});

describe('useBenefit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUserId.mockResolvedValue('user-123');
  });

  it('should mark benefit as used successfully', async () => {
    mockMarkBenefitUsed.mockResolvedValue(buildMockBenefitReturn({ remainingQty: 0, isUsed: true, usedAt: new Date() }));

    const result = await useBenefit('benefit-123');

    expect(result.success).toBe(true);
    expect(mockMarkBenefitUsed).toHaveBeenCalledWith('user-123', 'benefit-123');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/benefits');
  });

  it('should return error for empty benefitId', async () => {
    const result = await useBenefit('');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
  });

  it('should return error when benefit not found', async () => {
    mockMarkBenefitUsed.mockRejectedValue(new BenefitNotFoundError('benefit-999'));

    const result = await useBenefit('benefit-999');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Benefit not found');
  });

  it('should return error when benefit already fully used', async () => {
    mockMarkBenefitUsed.mockRejectedValue(new BenefitAlreadyUsedError('benefit-123'));

    const result = await useBenefit('benefit-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Benefit has already been fully used');
  });

  it('should return generic error for unexpected failures', async () => {
    mockMarkBenefitUsed.mockRejectedValue(new Error('DB error'));

    const result = await useBenefit('benefit-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to use benefit. Please try again.');
  });

  it('should return authentication error when not logged in', async () => {
    mockRequireUserId.mockRejectedValue(new AuthenticationError());

    const result = await useBenefit('benefit-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be logged in to perform this action');
  });
});
