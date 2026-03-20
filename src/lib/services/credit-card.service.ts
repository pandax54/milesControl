import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type {
  CreateCreditCardInput,
  UpdateCreditCardInput,
} from '@/lib/validators/credit-card.schema';

export async function listCreditCards(userId: string) {
  return prisma.creditCard.findMany({
    where: { userId },
    orderBy: [{ bankName: 'asc' }, { cardName: 'asc' }],
  });
}

export async function createCreditCard(userId: string, input: CreateCreditCardInput) {
  const card = await prisma.creditCard.create({
    data: {
      userId,
      bankName: input.bankName,
      cardName: input.cardName,
      pointsProgram: input.pointsProgram,
      pointsPerReal: input.pointsPerReal,
      pointsPerDollar: input.pointsPerDollar ?? null,
      annualFee: input.annualFee,
      isWaivedFee: input.isWaivedFee,
      benefits: input.benefits ?? Prisma.JsonNull,
    },
  });

  logger.info({ userId, cardId: card.id }, 'Credit card created');

  return card;
}

export async function updateCreditCard(userId: string, input: UpdateCreditCardInput) {
  const card = await prisma.creditCard.findFirst({
    where: { id: input.cardId, userId },
  });

  if (!card) {
    throw new CreditCardNotFoundError(input.cardId);
  }

  const updated = await prisma.creditCard.update({
    where: { id: input.cardId },
    data: {
      ...(input.bankName !== undefined && { bankName: input.bankName }),
      ...(input.cardName !== undefined && { cardName: input.cardName }),
      ...(input.pointsProgram !== undefined && { pointsProgram: input.pointsProgram }),
      ...(input.pointsPerReal !== undefined && { pointsPerReal: input.pointsPerReal }),
      ...(input.pointsPerDollar !== undefined && { pointsPerDollar: input.pointsPerDollar }),
      ...(input.annualFee !== undefined && { annualFee: input.annualFee }),
      ...(input.isWaivedFee !== undefined && { isWaivedFee: input.isWaivedFee }),
      ...(input.benefits !== undefined && {
        benefits: input.benefits === null ? Prisma.JsonNull : input.benefits,
      }),
    },
  });

  logger.info({ userId, cardId: input.cardId }, 'Credit card updated');

  return updated;
}

export async function deleteCreditCard(userId: string, cardId: string) {
  const card = await prisma.creditCard.findFirst({
    where: { id: cardId, userId },
  });

  if (!card) {
    throw new CreditCardNotFoundError(cardId);
  }

  await prisma.creditCard.delete({ where: { id: cardId } });

  logger.info({ userId, cardId }, 'Credit card deleted');
}

export class CreditCardNotFoundError extends Error {
  constructor(cardId: string) {
    super(`Credit card not found: ${cardId}`);
    this.name = 'CreditCardNotFoundError';
  }
}
