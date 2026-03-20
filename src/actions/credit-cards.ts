'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import {
  createCreditCardSchema,
  updateCreditCardSchema,
  deleteCreditCardSchema,
  type CreateCreditCardInput,
  type UpdateCreditCardInput,
} from '@/lib/validators/credit-card.schema';
import {
  createCreditCard as createCreditCardService,
  updateCreditCard as updateCreditCardService,
  deleteCreditCard as deleteCreditCardService,
  CreditCardNotFoundError,
} from '@/lib/services/credit-card.service';

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

export async function addCreditCard(input: CreateCreditCardInput): Promise<ActionResult> {
  const parsed = createCreditCardSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const userId = await requireUserId();
    await createCreditCardService(userId, parsed.data);
    revalidatePath('/credit-cards');
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    logger.error({ err: error }, 'Failed to create credit card');
    return { success: false, error: 'Failed to create credit card. Please try again.' };
  }
}

export async function editCreditCard(input: UpdateCreditCardInput): Promise<ActionResult> {
  const parsed = updateCreditCardSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const userId = await requireUserId();
    await updateCreditCardService(userId, parsed.data);
    revalidatePath('/credit-cards');
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    if (error instanceof CreditCardNotFoundError) {
      return { success: false, error: 'Credit card not found' };
    }
    logger.error({ err: error }, 'Failed to update credit card');
    return { success: false, error: 'Failed to update credit card. Please try again.' };
  }
}

export async function removeCreditCard(cardId: string): Promise<ActionResult> {
  const parsed = deleteCreditCardSchema.safeParse({ cardId });
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const userId = await requireUserId();
    await deleteCreditCardService(userId, parsed.data.cardId);
    revalidatePath('/credit-cards');
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    if (error instanceof CreditCardNotFoundError) {
      return { success: false, error: 'Credit card not found' };
    }
    logger.error({ err: error }, 'Failed to delete credit card');
    return { success: false, error: 'Failed to delete credit card. Please try again.' };
  }
}
