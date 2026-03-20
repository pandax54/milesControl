import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { CreateTransferInput, UpdateTransferInput } from '@/lib/validators/transfer.schema';

export function calculateCostPerMilheiro(totalCost: number, milesReceived: number): number {
  if (milesReceived <= 0) return 0;
  return totalCost / (milesReceived / 1000);
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

export class TransferNotFoundError extends Error {
  constructor(transferId: string) {
    super(`Transfer not found: ${transferId}`);
    this.name = 'TransferNotFoundError';
  }
}
