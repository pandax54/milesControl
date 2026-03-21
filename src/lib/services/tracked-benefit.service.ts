import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type {
  CreateBenefitInput,
  UpdateBenefitInput,
} from '@/lib/validators/benefit.schema';
import type { BenefitType } from '@/generated/prisma/client';

export async function listBenefits(userId: string) {
  return prisma.trackedBenefit.findMany({
    where: { userId },
    orderBy: [{ isUsed: 'asc' }, { expirationDate: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function listExpiringBenefits(userId: string, withinDays: number) {
  const now = new Date();
  const cutoff = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);

  return prisma.trackedBenefit.findMany({
    where: {
      userId,
      isUsed: false,
      expirationDate: {
        not: null,
        lte: cutoff,
        gte: now,
      },
    },
    orderBy: { expirationDate: 'asc' },
  });
}

export async function createBenefit(userId: string, input: CreateBenefitInput) {
  const benefit = await prisma.trackedBenefit.create({
    data: {
      userId,
      type: input.type as BenefitType,
      programOrCard: input.programOrCard,
      description: input.description,
      quantity: input.quantity,
      remainingQty: input.quantity,
      expirationDate: input.expirationDate ? new Date(input.expirationDate) : null,
      notes: input.notes ?? null,
    },
  });

  logger.info({ userId, benefitId: benefit.id, type: input.type }, 'Tracked benefit created');

  return benefit;
}

export async function updateBenefit(userId: string, input: UpdateBenefitInput) {
  const benefit = await prisma.trackedBenefit.findFirst({
    where: { id: input.benefitId, userId },
  });

  if (!benefit) {
    throw new BenefitNotFoundError(input.benefitId);
  }

  const updated = await prisma.trackedBenefit.update({
    where: { id: input.benefitId },
    data: {
      ...(input.type !== undefined && { type: input.type as BenefitType }),
      ...(input.programOrCard !== undefined && { programOrCard: input.programOrCard }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.quantity !== undefined && { quantity: input.quantity }),
      ...(input.remainingQty !== undefined && { remainingQty: input.remainingQty }),
      ...(input.expirationDate !== undefined && {
        expirationDate: input.expirationDate ? new Date(input.expirationDate) : null,
      }),
      ...(input.isUsed !== undefined && {
        isUsed: input.isUsed,
        ...(input.isUsed && { usedAt: new Date() }),
        ...(!input.isUsed && { usedAt: null }),
      }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
  });

  logger.info({ userId, benefitId: input.benefitId }, 'Tracked benefit updated');

  return updated;
}

export async function markBenefitUsed(userId: string, benefitId: string) {
  const benefit = await prisma.trackedBenefit.findFirst({
    where: { id: benefitId, userId },
  });

  if (!benefit) {
    throw new BenefitNotFoundError(benefitId);
  }

  if (benefit.isUsed) {
    throw new BenefitAlreadyUsedError(benefitId);
  }

  const newRemainingQty = Math.max(0, benefit.remainingQty - 1);
  const isFullyUsed = newRemainingQty === 0;

  const updated = await prisma.trackedBenefit.update({
    where: { id: benefitId },
    data: {
      remainingQty: newRemainingQty,
      isUsed: isFullyUsed,
      usedAt: isFullyUsed ? new Date() : null,
    },
  });

  logger.info({ userId, benefitId, remainingQty: newRemainingQty }, 'Tracked benefit usage recorded');

  return updated;
}

export async function deleteBenefit(userId: string, benefitId: string) {
  const benefit = await prisma.trackedBenefit.findFirst({
    where: { id: benefitId, userId },
  });

  if (!benefit) {
    throw new BenefitNotFoundError(benefitId);
  }

  await prisma.trackedBenefit.delete({ where: { id: benefitId } });

  logger.info({ userId, benefitId }, 'Tracked benefit deleted');
}

export class BenefitNotFoundError extends Error {
  constructor(benefitId: string) {
    super(`Tracked benefit not found: ${benefitId}`);
    this.name = 'BenefitNotFoundError';
  }
}

export class BenefitAlreadyUsedError extends Error {
  constructor(benefitId: string) {
    super(`Tracked benefit already fully used: ${benefitId}`);
    this.name = 'BenefitAlreadyUsedError';
  }
}
