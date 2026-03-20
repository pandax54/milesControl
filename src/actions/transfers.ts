'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import {
  createTransferSchema,
  updateTransferSchema,
  deleteTransferSchema,
  type CreateTransferInput,
  type UpdateTransferInput,
} from '@/lib/validators/transfer.schema';
import {
  createTransfer as createTransferService,
  updateTransfer as updateTransferService,
  deleteTransfer as deleteTransferService,
  TransferNotFoundError,
} from '@/lib/services/transfer.service';

interface ActionResult {
  success: boolean;
  error?: string;
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
