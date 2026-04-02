'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import {
  createTransferSchema,
  updateTransferSchema,
  deleteTransferSchema,
  transferConversionSchema,
  type CreateTransferInput,
  type TransferConversionInput,
  type UpdateTransferInput,
} from '@/lib/validators/transfer.schema';
import {
  createTransfer as createTransferService,
  updateTransfer as updateTransferService,
  deleteTransfer as deleteTransferService,
  getUserAverageCostPerMilheiro,
  TransferNotFoundError,
} from '@/lib/services/transfer.service';
import {
  listPromotions,
  resolveProgramId,
} from '@/lib/services/promotion.service';
import type { PromotionWithPrograms } from '@/lib/services/promotion.service';

interface ActionResult {
  success: boolean;
  error?: string;
}

export interface TransferConversionPromotion {
  id: string;
  bonusPercent: number;
  title: string;
}

export interface TransferConversionData {
  sourceCpm: number | null;
  destCpm: number | null;
  activePromotion: TransferConversionPromotion | null;
}

class AuthenticationError extends Error {
  constructor() {
    super('Not authenticated');
    this.name = 'AuthenticationError';
  }
}

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthenticationError();
  }
  return session.user.id;
}

function isAuthenticationError(error: unknown): boolean {
  return error instanceof AuthenticationError;
}

function buildEmptyTransferConversionData(): TransferConversionData {
  return {
    sourceCpm: null,
    destCpm: null,
    activePromotion: null,
  };
}

function selectActivePromotion(
  promotions: readonly PromotionWithPrograms[],
  destProgramId: string,
): TransferConversionPromotion | null {
  const promotion = promotions.find((item) => item.destProgramId === destProgramId);

  if (!promotion || promotion.bonusPercent == null) {
    return null;
  }

  return {
    id: promotion.id,
    bonusPercent: promotion.bonusPercent,
    title: promotion.title,
  };
}

export async function logTransfer(input: CreateTransferInput): Promise<ActionResult> {
  const parsed = createTransferSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const userId = await requireUserId();
    await createTransferService(userId, parsed.data);
    revalidatePath('/transfers');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    logger.error({ err: error }, 'Failed to log transfer');
    return { success: false, error: 'Failed to log transfer. Please try again.' };
  }
}

export async function getTransferConversionData(
  input: TransferConversionInput,
): Promise<TransferConversionData> {
  const parsed = transferConversionSchema.safeParse(input);
  if (!parsed.success) {
    return buildEmptyTransferConversionData();
  }

  try {
    const userId = await requireUserId();
    const { sourceProgramName, destProgramName } = parsed.data;

    const [sourceCpm, destCpm, destProgramId] = await Promise.all([
      getUserAverageCostPerMilheiro(userId, sourceProgramName),
      getUserAverageCostPerMilheiro(userId, destProgramName),
      resolveProgramId(destProgramName),
    ]);

    if (sourceCpm == null) {
      logger.debug({ userId, program: sourceProgramName }, 'No CPM data available for conversion display');
    }

    if (destCpm == null) {
      logger.debug({ userId, program: destProgramName }, 'No CPM data available for conversion display');
    }

    if (!destProgramId) {
      return {
        sourceCpm,
        destCpm,
        activePromotion: null,
      };
    }

    const promotions = await listPromotions({
      status: 'ACTIVE',
      type: 'TRANSFER_BONUS',
      programId: destProgramId,
      sortBy: 'bonusPercent',
      sortOrder: 'desc',
    });

    return {
      sourceCpm,
      destCpm,
      activePromotion: selectActivePromotion(promotions, destProgramId),
    };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return buildEmptyTransferConversionData();
    }

    logger.error({ err: error, input: parsed.data }, 'Failed to fetch transfer conversion data');
    return buildEmptyTransferConversionData();
  }
}

export async function editTransfer(input: UpdateTransferInput): Promise<ActionResult> {
  const parsed = updateTransferSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const userId = await requireUserId();
    await updateTransferService(userId, parsed.data);
    revalidatePath('/transfers');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    if (error instanceof TransferNotFoundError) {
      return { success: false, error: 'Transfer not found' };
    }
    logger.error({ err: error }, 'Failed to update transfer');
    return { success: false, error: 'Failed to update transfer. Please try again.' };
  }
}

export async function removeTransfer(transferId: string): Promise<ActionResult> {
  const parsed = deleteTransferSchema.safeParse({ transferId });
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const userId = await requireUserId();
    await deleteTransferService(userId, parsed.data.transferId);
    revalidatePath('/transfers');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    if (error instanceof TransferNotFoundError) {
      return { success: false, error: 'Transfer not found' };
    }
    logger.error({ err: error }, 'Failed to delete transfer');
    return { success: false, error: 'Failed to delete transfer. Please try again.' };
  }
}
