'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import {
  createSubscriptionSchema,
  updateSubscriptionSchema,
  deleteSubscriptionSchema,
  type CreateSubscriptionInput,
  type UpdateSubscriptionInput,
} from '@/lib/validators/subscription.schema';
import {
  createSubscription as createSubscriptionService,
  updateSubscription as updateSubscriptionService,
  deleteSubscription as deleteSubscriptionService,
  ClubTierNotFoundError,
  SubscriptionNotFoundError,
} from '@/lib/services/club-subscription.service';
import {
  fetchUserProjection,
  type ProjectionSummary,
} from '@/lib/services/accrual-projector.service';

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

export async function addSubscription(input: CreateSubscriptionInput): Promise<ActionResult> {
  const parsed = createSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const userId = await requireUserId();
    await createSubscriptionService(userId, parsed.data);
    revalidatePath('/subscriptions');
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    if (error instanceof ClubTierNotFoundError) {
      return { success: false, error: 'Club tier not found' };
    }
    logger.error({ err: error }, 'Failed to create subscription');
    return { success: false, error: 'Failed to create subscription. Please try again.' };
  }
}

export async function editSubscription(input: UpdateSubscriptionInput): Promise<ActionResult> {
  const parsed = updateSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const userId = await requireUserId();
    await updateSubscriptionService(userId, parsed.data);
    revalidatePath('/subscriptions');
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    if (error instanceof SubscriptionNotFoundError) {
      return { success: false, error: 'Subscription not found' };
    }
    logger.error({ err: error }, 'Failed to update subscription');
    return { success: false, error: 'Failed to update subscription. Please try again.' };
  }
}

export async function removeSubscription(subscriptionId: string): Promise<ActionResult> {
  const parsed = deleteSubscriptionSchema.safeParse({ subscriptionId });
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const userId = await requireUserId();
    await deleteSubscriptionService(userId, parsed.data.subscriptionId);
    revalidatePath('/subscriptions');
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    if (error instanceof SubscriptionNotFoundError) {
      return { success: false, error: 'Subscription not found' };
    }
    logger.error({ err: error }, 'Failed to delete subscription');
    return { success: false, error: 'Failed to delete subscription. Please try again.' };
  }
}

interface ProjectionResult {
  success: boolean;
  error?: string;
  data?: ProjectionSummary;
}

export async function getAccrualProjection(monthsAhead?: number): Promise<ProjectionResult> {
  try {
    const userId = await requireUserId();
    const projection = await fetchUserProjection(userId, monthsAhead);
    return { success: true, data: projection };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    logger.error({ err: error }, 'Failed to fetch accrual projection');
    return { success: false, error: 'Failed to fetch projection. Please try again.' };
  }
}
