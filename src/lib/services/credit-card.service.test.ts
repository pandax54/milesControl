import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    creditCard: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
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

import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import {
  listCreditCards,
  createCreditCard,
  updateCreditCard,
  deleteCreditCard,
  CreditCardNotFoundError,
} from './credit-card.service';

const mockFindMany = vi.mocked(prisma.creditCard.findMany);
const mockFindFirst = vi.mocked(prisma.creditCard.findFirst);
const mockCreate = vi.mocked(prisma.creditCard.create);
const mockUpdate = vi.mocked(prisma.creditCard.update);
const mockDelete = vi.mocked(prisma.creditCard.delete);

const MOCK_USER_ID = 'user-123';
const MOCK_CARD_ID = 'card-456';

const mockCard = {
  id: MOCK_CARD_ID,
  userId: MOCK_USER_ID,
  bankName: 'Itaú',
  cardName: 'Azul Infinite',
  pointsProgram: 'Livelo',
  pointsPerReal: 2.0,
  pointsPerDollar: 4.0,
  annualFee: 1200,
  isWaivedFee: false,
  benefits: ['Sala VIP', 'Seguro viagem'],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('listCreditCards', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return credit cards for user ordered by bank and card name', async () => {
    mockFindMany.mockResolvedValue([mockCard] as never);

    const result = await listCreditCards(MOCK_USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].bankName).toBe('Itaú');
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: MOCK_USER_ID },
      orderBy: [{ bankName: 'asc' }, { cardName: 'asc' }],
    });
  });

  it('should return empty array when user has no credit cards', async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await listCreditCards(MOCK_USER_ID);

    expect(result).toEqual([]);
  });
});

describe('createCreditCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should create credit card successfully', async () => {
    mockCreate.mockResolvedValue(mockCard as never);

    const result = await createCreditCard(MOCK_USER_ID, {
      bankName: 'Itaú',
      cardName: 'Azul Infinite',
      pointsProgram: 'Livelo',
      pointsPerReal: 2.0,
      pointsPerDollar: 4.0,
      annualFee: 1200,
      isWaivedFee: false,
      benefits: ['Sala VIP', 'Seguro viagem'],
    });

    expect(result.bankName).toBe('Itaú');
    expect(mockCreate).toHaveBeenCalledOnce();
    const createCall = mockCreate.mock.calls[0][0];
    expect(createCall.data.userId).toBe(MOCK_USER_ID);
    expect(createCall.data.bankName).toBe('Itaú');
    expect(createCall.data.pointsPerReal).toBe(2.0);
    expect(createCall.data.pointsPerDollar).toBe(4.0);
  });

  it('should set pointsPerDollar to null when not provided', async () => {
    mockCreate.mockResolvedValue(mockCard as never);

    await createCreditCard(MOCK_USER_ID, {
      bankName: 'Bradesco',
      cardName: 'Smiles Platinum',
      pointsProgram: 'Livelo',
      pointsPerReal: 1.5,
      annualFee: 450,
      isWaivedFee: true,
    });

    const createCall = mockCreate.mock.calls[0][0];
    expect(createCall.data.pointsPerDollar).toBeNull();
  });

  it('should set benefits to null when not provided', async () => {
    mockCreate.mockResolvedValue(mockCard as never);

    await createCreditCard(MOCK_USER_ID, {
      bankName: 'Bradesco',
      cardName: 'Smiles Platinum',
      pointsProgram: 'Livelo',
      pointsPerReal: 1.5,
      annualFee: 0,
      isWaivedFee: false,
    });

    const createCall = mockCreate.mock.calls[0][0];
    expect(createCall.data.benefits).toBe(Prisma.JsonNull);
  });
});

describe('updateCreditCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should update credit card fields', async () => {
    mockFindFirst.mockResolvedValue(mockCard as never);
    const updated = { ...mockCard, bankName: 'Bradesco' };
    mockUpdate.mockResolvedValue(updated as never);

    const result = await updateCreditCard(MOCK_USER_ID, {
      cardId: MOCK_CARD_ID,
      bankName: 'Bradesco',
    });

    expect(result.bankName).toBe('Bradesco');
    expect(mockUpdate).toHaveBeenCalledOnce();
  });

  it('should only include provided fields in update', async () => {
    mockFindFirst.mockResolvedValue(mockCard as never);
    mockUpdate.mockResolvedValue(mockCard as never);

    await updateCreditCard(MOCK_USER_ID, {
      cardId: MOCK_CARD_ID,
      pointsPerReal: 3.0,
    });

    const updateCall = mockUpdate.mock.calls[0][0];
    expect(updateCall.data).toHaveProperty('pointsPerReal', 3.0);
    expect(updateCall.data).not.toHaveProperty('bankName');
    expect(updateCall.data).not.toHaveProperty('cardName');
    expect(updateCall.data).not.toHaveProperty('annualFee');
  });

  it('should allow clearing pointsPerDollar with null', async () => {
    mockFindFirst.mockResolvedValue(mockCard as never);
    mockUpdate.mockResolvedValue({ ...mockCard, pointsPerDollar: null } as never);

    await updateCreditCard(MOCK_USER_ID, {
      cardId: MOCK_CARD_ID,
      pointsPerDollar: null,
    });

    const updateCall = mockUpdate.mock.calls[0][0];
    expect(updateCall.data.pointsPerDollar).toBeNull();
  });

  it('should allow clearing benefits with null', async () => {
    mockFindFirst.mockResolvedValue(mockCard as never);
    mockUpdate.mockResolvedValue({ ...mockCard, benefits: null } as never);

    await updateCreditCard(MOCK_USER_ID, {
      cardId: MOCK_CARD_ID,
      benefits: null,
    });

    const updateCall = mockUpdate.mock.calls[0][0];
    expect(updateCall.data.benefits).toBe(Prisma.JsonNull);
  });

  it('should throw CreditCardNotFoundError when card does not exist', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      updateCreditCard(MOCK_USER_ID, {
        cardId: 'nonexistent',
        bankName: 'Test',
      })
    ).rejects.toThrow(CreditCardNotFoundError);

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('should throw CreditCardNotFoundError when card belongs to another user', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      updateCreditCard('other-user', {
        cardId: MOCK_CARD_ID,
        bankName: 'Test',
      })
    ).rejects.toThrow(CreditCardNotFoundError);
  });
});

describe('deleteCreditCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should delete credit card successfully', async () => {
    mockFindFirst.mockResolvedValue(mockCard as never);
    mockDelete.mockResolvedValue(mockCard as never);

    await deleteCreditCard(MOCK_USER_ID, MOCK_CARD_ID);

    expect(mockDelete).toHaveBeenCalledWith({
      where: { id: MOCK_CARD_ID },
    });
  });

  it('should throw CreditCardNotFoundError when card does not exist', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      deleteCreditCard(MOCK_USER_ID, 'nonexistent')
    ).rejects.toThrow(CreditCardNotFoundError);

    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('should throw CreditCardNotFoundError when card belongs to another user', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      deleteCreditCard('other-user', MOCK_CARD_ID)
    ).rejects.toThrow(CreditCardNotFoundError);

    expect(mockDelete).not.toHaveBeenCalled();
  });
});
