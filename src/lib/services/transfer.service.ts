import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { CreateTransferInput, UpdateTransferInput } from '@/lib/validators/transfer.schema';

const POINTS_PER_MILHEIRO = 1000;

export function calculateCostPerMilheiro(totalCost: number, milesReceived: number): number {
  if (milesReceived <= 0) return 0;
  return totalCost / (milesReceived / POINTS_PER_MILHEIRO);
}

export async function listTransfers(userId: string) {
  return prisma.transferLog.findMany({
    where: { userId },
    orderBy: { transferDate: 'desc' },
  });
}

export async function createTransfer(userId: string, input: CreateTransferInput) {
  const costPerMilheiro =
    input.totalCost != null && input.milesReceived > 0
      ? calculateCostPerMilheiro(input.totalCost, input.milesReceived)
      : null;

  const transfer = await prisma.transferLog.create({
    data: {
      userId,
      sourceProgramName: input.sourceProgramName,
      destProgramName: input.destProgramName,
      pointsTransferred: input.pointsTransferred,
      bonusPercent: input.bonusPercent ?? 0,
      milesReceived: input.milesReceived,
      totalCost: input.totalCost ?? null,
      costPerMilheiro,
      promotionId: input.promotionId || null,
      notes: input.notes || null,
      transferDate: input.transferDate ? new Date(input.transferDate) : new Date(),
    },
  });

  logger.info(
    { userId, transferId: transfer.id, source: input.sourceProgramName, dest: input.destProgramName },
    'Transfer logged',
  );

  return transfer;
}

export async function updateTransfer(userId: string, input: UpdateTransferInput) {
  const existing = await prisma.transferLog.findFirst({
    where: { id: input.transferId, userId },
  });

  if (!existing) {
    throw new TransferNotFoundError(input.transferId);
  }

  const pointsTransferred = input.pointsTransferred ?? existing.pointsTransferred;
  const bonusPercent = input.bonusPercent ?? existing.bonusPercent;
  const milesReceived = input.milesReceived ?? existing.milesReceived;
  const totalCost = input.totalCost !== undefined ? input.totalCost : (existing.totalCost ? Number(existing.totalCost) : null);

  const costPerMilheiro =
    totalCost != null && milesReceived > 0
      ? calculateCostPerMilheiro(totalCost, milesReceived)
      : null;

  const updated = await prisma.transferLog.update({
    where: { id: input.transferId },
    data: {
      ...(input.sourceProgramName !== undefined && { sourceProgramName: input.sourceProgramName }),
      ...(input.destProgramName !== undefined && { destProgramName: input.destProgramName }),
      ...(input.pointsTransferred !== undefined && { pointsTransferred }),
      ...(input.bonusPercent !== undefined && { bonusPercent }),
      ...(input.milesReceived !== undefined && { milesReceived }),
      ...(input.totalCost !== undefined && { totalCost: input.totalCost }),
      costPerMilheiro,
      ...(input.notes !== undefined && { notes: input.notes || null }),
      ...(input.promotionId !== undefined && { promotionId: input.promotionId || null }),
      ...(input.transferDate !== undefined && { transferDate: new Date(input.transferDate) }),
    },
  });

  logger.info({ userId, transferId: input.transferId }, 'Transfer updated');

  return updated;
}

export async function deleteTransfer(userId: string, transferId: string) {
  const existing = await prisma.transferLog.findFirst({
    where: { id: transferId, userId },
  });

  if (!existing) {
    throw new TransferNotFoundError(transferId);
  }

  await prisma.transferLog.delete({
    where: { id: transferId },
  });

  logger.info({ userId, transferId }, 'Transfer deleted');
}

/**
 * Calculate the user's weighted average cost-per-milheiro from their transfer history.
 * Only considers transfers that have both totalCost and costPerMilheiro recorded.
 * Weighted by miles received so larger transfers count more.
 * Optionally filters by destination program (e.g. 'Smiles').
 * Returns null if no qualifying transfers exist.
 */
export async function getUserAverageCostPerMilheiro(
  userId: string,
  program?: string,
): Promise<number | null> {
  const where: Prisma.TransferLogWhereInput = {
    userId,
    totalCost: { not: null },
    costPerMilheiro: { not: null },
    milesReceived: { gt: 0 },
    ...(program ? { destProgramName: program } : {}),
  };

  const transfers = await prisma.transferLog.findMany({
    where,
    select: {
      totalCost: true,
      milesReceived: true,
    },
  });

  if (transfers.length === 0) {
    logger.debug({ userId, program }, 'No qualifying transfers for average cost calculation');
    return null;
  }

  let totalCostSum = 0;
  let totalMilesSum = 0;

  for (const transfer of transfers) {
    totalCostSum += Number(transfer.totalCost);
    totalMilesSum += transfer.milesReceived;
  }

  if (totalMilesSum <= 0) return null;

  const avgCostPerMilheiro = totalCostSum / (totalMilesSum / POINTS_PER_MILHEIRO);

  logger.debug(
    { userId, program, avgCostPerMilheiro, transferCount: transfers.length },
    'Calculated user average cost per milheiro',
  );

  return Math.round(avgCostPerMilheiro * 100) / 100;
}

export class TransferNotFoundError extends Error {
  constructor(transferId: string) {
    super(`Transfer not found: ${transferId}`);
    this.name = 'TransferNotFoundError';
  }
}
