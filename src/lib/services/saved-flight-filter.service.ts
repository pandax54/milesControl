import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { SavedFlightFilter } from '@/generated/prisma/client';
import type {
  CreateSavedFlightFilterInput,
  DeleteSavedFlightFilterInput,
} from '@/lib/validators/saved-flight-filter.schema';

// ==================== Re-exports ====================

export type { SavedFlightFilter };

// ==================== Error classes ====================

export class SavedFlightFilterNotFoundError extends Error {
  constructor(filterId: string) {
    super(`Saved flight filter not found: ${filterId}`);
    this.name = 'SavedFlightFilterNotFoundError';
  }
}

// ==================== Queries ====================

export async function listSavedFlightFilters(userId: string): Promise<SavedFlightFilter[]> {
  return prisma.savedFlightFilter.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getSavedFlightFilter(
  userId: string,
  filterId: string,
): Promise<SavedFlightFilter> {
  const filter = await prisma.savedFlightFilter.findFirst({
    where: { id: filterId, userId },
  });

  if (!filter) {
    throw new SavedFlightFilterNotFoundError(filterId);
  }

  return filter;
}

// ==================== Mutations ====================

export async function createSavedFlightFilter(
  userId: string,
  input: CreateSavedFlightFilterInput,
): Promise<SavedFlightFilter> {
  const filter = await prisma.savedFlightFilter.create({
    data: {
      userId,
      name: input.name,
      origin: input.origin ?? null,
      destination: input.destination ?? null,
      region: input.region ?? null,
      cabinClass: input.cabinClass ?? null,
      dateType: input.dateType ?? null,
      dateRangeStart: input.dateRangeStart ? new Date(input.dateRangeStart) : null,
      dateRangeEnd: input.dateRangeEnd ? new Date(input.dateRangeEnd) : null,
      maxMilesPrice: input.maxMilesPrice ?? null,
      maxCashPrice: input.maxCashPrice ?? null,
    },
  });

  logger.info(
    { userId, filterId: filter.id, name: filter.name },
    'Saved flight filter created',
  );

  return filter;
}

export async function deleteSavedFlightFilter(
  userId: string,
  input: DeleteSavedFlightFilterInput,
): Promise<void> {
  const existing = await prisma.savedFlightFilter.findFirst({
    where: { id: input.filterId, userId },
  });

  if (!existing) {
    throw new SavedFlightFilterNotFoundError(input.filterId);
  }

  await prisma.savedFlightFilter.delete({
    where: { id: input.filterId },
  });

  logger.info({ userId, filterId: input.filterId }, 'Saved flight filter deleted');
}
