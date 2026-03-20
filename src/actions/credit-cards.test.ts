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

vi.mock('@/lib/services/credit-card.service', () => ({
  createCreditCard: vi.fn(),
  updateCreditCard: vi.fn(),
  deleteCreditCard: vi.fn(),
  CreditCardNotFoundError: class extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = 'CreditCardNotFoundError';
    }
  },
}));

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import {
  createCreditCard,
  updateCreditCard,
  deleteCreditCard,
  CreditCardNotFoundError,
} from '@/lib/services/credit-card.service';
import { addCreditCard, editCreditCard, removeCreditCard } from './credit-cards';
import type { Session } from 'next-auth';
import type { CreditCard } from '@/generated/prisma/client';
import { Prisma } from '@/generated/prisma/client';

const mockAuth = auth as unknown as ReturnType<typeof vi.fn<() => Promise<Session | null>>>;
const mockCreateCreditCard = vi.mocked(createCreditCard);
const mockUpdateCreditCard = vi.mocked(updateCreditCard);
const mockDeleteCreditCard = vi.mocked(deleteCreditCard);
const mockRevalidatePath = vi.mocked(revalidatePath);

const MOCK_SESSION: Session = {
  user: { id: 'user-123', email: 'test@example.com', role: 'USER' },
  expires: '2026-12-31',
};

function buildMockCard(overrides: Partial<CreditCard> = {}): CreditCard {
  return {
    id: 'card-123',
    userId: 'user-123',
    bankName: 'Itaú',
    cardName: 'Azul Infinite',
    pointsProgram: 'Livelo',
    pointsPerReal: 2.0,
    pointsPerDollar: null,
    annualFee: new Prisma.Decimal(1200),
    isWaivedFee: false,
    benefits: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

const VALID_CARD_INPUT = {
  bankName: 'Itaú',
  cardName: 'Azul Infinite',
  pointsProgram: 'Livelo',
  pointsPerReal: 2.0,
  annualFee: 1200,
  isWaivedFee: false,
};

describe('addCreditCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(MOCK_SESSION);
  });

  it('should create credit card successfully', async () => {
    mockCreateCreditCard.mockResolvedValue(buildMockCard());

    const result = await addCreditCard(VALID_CARD_INPUT);

    expect(result.success).toBe(true);
    expect(mockCreateCreditCard).toHaveBeenCalledWith('user-123', {
      bankName: 'Itaú',
      cardName: 'Azul Infinite',
      pointsProgram: 'Livelo',
      pointsPerReal: 2.0,
      annualFee: 1200,
      isWaivedFee: false,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/credit-cards');
  });

  it('should return error for invalid input', async () => {
    const result = await addCreditCard({
      bankName: '',
      cardName: '',
      pointsProgram: '',
      pointsPerReal: -1,
      annualFee: 0,
      isWaivedFee: false,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
    expect(mockCreateCreditCard).not.toHaveBeenCalled();
  });

  it('should return generic error for unexpected failures', async () => {
    mockCreateCreditCard.mockRejectedValue(new Error('DB connection failed'));

    const result = await addCreditCard(VALID_CARD_INPUT);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to create credit card. Please try again.');
  });

  it('should return authentication error when not logged in', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await addCreditCard(VALID_CARD_INPUT);

    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be logged in to perform this action');
  });
});

describe('editCreditCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(MOCK_SESSION);
  });

  it('should update credit card successfully', async () => {
    mockUpdateCreditCard.mockResolvedValue(buildMockCard());

    const result = await editCreditCard({
      cardId: 'card-123',
      bankName: 'Bradesco',
    });

    expect(result.success).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/credit-cards');
  });

  it('should return error for invalid input', async () => {
    const result = await editCreditCard({ cardId: '' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
  });

  it('should return error when credit card not found', async () => {
    mockUpdateCreditCard.mockRejectedValue(new CreditCardNotFoundError('card-999'));

    const result = await editCreditCard({ cardId: 'card-999', bankName: 'Test' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Credit card not found');
  });

  it('should return generic error for unexpected failures', async () => {
    mockUpdateCreditCard.mockRejectedValue(new Error('DB error'));

    const result = await editCreditCard({ cardId: 'card-123', bankName: 'Test' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to update credit card. Please try again.');
  });

  it('should return authentication error when not logged in', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await editCreditCard({ cardId: 'card-123', bankName: 'Test' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be logged in to perform this action');
  });
});

describe('removeCreditCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(MOCK_SESSION);
  });

  it('should delete credit card successfully', async () => {
    mockDeleteCreditCard.mockResolvedValue(undefined);

    const result = await removeCreditCard('card-123');

    expect(result.success).toBe(true);
    expect(mockDeleteCreditCard).toHaveBeenCalledWith('user-123', 'card-123');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/credit-cards');
  });

  it('should return error for empty cardId', async () => {
    const result = await removeCreditCard('');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
  });

  it('should return error when credit card not found', async () => {
    mockDeleteCreditCard.mockRejectedValue(new CreditCardNotFoundError('card-999'));

    const result = await removeCreditCard('card-999');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Credit card not found');
  });

  it('should return generic error for unexpected failures', async () => {
    mockDeleteCreditCard.mockRejectedValue(new Error('DB error'));

    const result = await removeCreditCard('card-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to delete credit card. Please try again.');
  });

  it('should return authentication error when not logged in', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await removeCreditCard('card-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be logged in to perform this action');
  });
});
