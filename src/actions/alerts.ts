'use server';

import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';
import {
  createAlertConfigSchema,
  updateAlertConfigSchema,
  deleteAlertConfigSchema,
  toggleAlertConfigSchema,
  type CreateAlertConfigInput,
  type UpdateAlertConfigInput,
} from '@/lib/validators/alert-config.schema';
import {
  createAlertConfig as createAlertConfigService,
  updateAlertConfig as updateAlertConfigService,
  deleteAlertConfig as deleteAlertConfigService,
  toggleAlertConfig as toggleAlertConfigService,
  AlertConfigNotFoundError,
} from '@/lib/services/alert-config.service';
import { requireUserId, isAuthenticationError, type ActionResult } from './helpers';

export async function addAlertConfig(input: CreateAlertConfigInput): Promise<ActionResult> {
  const parsed = createAlertConfigSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const userId = await requireUserId();
    await createAlertConfigService(userId, parsed.data);
    revalidatePath('/alerts');
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    logger.error({ err: error }, 'Failed to create alert config');
    return { success: false, error: 'Failed to create alert rule. Please try again.' };
  }
}

export async function editAlertConfig(input: UpdateAlertConfigInput): Promise<ActionResult> {
  const parsed = updateAlertConfigSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const userId = await requireUserId();
    await updateAlertConfigService(userId, parsed.data);
    revalidatePath('/alerts');
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    if (error instanceof AlertConfigNotFoundError) {
      return { success: false, error: 'Alert rule not found' };
    }
    logger.error({ err: error }, 'Failed to update alert config');
    return { success: false, error: 'Failed to update alert rule. Please try again.' };
  }
}

export async function removeAlertConfig(alertConfigId: string): Promise<ActionResult> {
  const parsed = deleteAlertConfigSchema.safeParse({ alertConfigId });
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const userId = await requireUserId();
    await deleteAlertConfigService(userId, parsed.data.alertConfigId);
    revalidatePath('/alerts');
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    if (error instanceof AlertConfigNotFoundError) {
      return { success: false, error: 'Alert rule not found' };
    }
    logger.error({ err: error }, 'Failed to delete alert config');
    return { success: false, error: 'Failed to delete alert rule. Please try again.' };
  }
}

export async function setAlertConfigActive(
  alertConfigId: string,
  isActive: boolean,
): Promise<ActionResult> {
  const parsed = toggleAlertConfigSchema.safeParse({ alertConfigId, isActive });
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const userId = await requireUserId();
    await toggleAlertConfigService(userId, parsed.data.alertConfigId, parsed.data.isActive);
    revalidatePath('/alerts');
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    if (error instanceof AlertConfigNotFoundError) {
      return { success: false, error: 'Alert rule not found' };
    }
    logger.error({ err: error }, 'Failed to toggle alert config');
    return { success: false, error: 'Failed to update alert rule. Please try again.' };
  }
}
