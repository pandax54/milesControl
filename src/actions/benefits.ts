'use server';

import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';
import {
  createBenefitSchema,
  updateBenefitSchema,
  deleteBenefitSchema,
  markBenefitUsedSchema,
  type CreateBenefitInput,
  type UpdateBenefitInput,
} from '@/lib/validators/benefit.schema';
import {
  createBenefit as createBenefitService,
  updateBenefit as updateBenefitService,
  deleteBenefit as deleteBenefitService,
  markBenefitUsed as markBenefitUsedService,
  BenefitNotFoundError,
  BenefitAlreadyUsedError,
} from '@/lib/services/tracked-benefit.service';
import { requireUserId, isAuthenticationError, type ActionResult } from './helpers';
import {
  assertPremiumFeatureAccess,
  PremiumFeatureRequiredError,
} from '@/lib/services/freemium.service';

export async function addBenefit(input: CreateBenefitInput): Promise<ActionResult> {
  const parsed = createBenefitSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const userId = await requireUserId();
    await assertPremiumFeatureAccess(userId, 'benefits');
    await createBenefitService(userId, parsed.data);
    revalidatePath('/benefits');
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    if (error instanceof PremiumFeatureRequiredError) {
      return { success: false, error: error.message };
    }
    logger.error({ err: error }, 'Failed to create benefit');
    return { success: false, error: 'Failed to create benefit. Please try again.' };
  }
}

export async function editBenefit(input: UpdateBenefitInput): Promise<ActionResult> {
  const parsed = updateBenefitSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const userId = await requireUserId();
    await assertPremiumFeatureAccess(userId, 'benefits');
    await updateBenefitService(userId, parsed.data);
    revalidatePath('/benefits');
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    if (error instanceof BenefitNotFoundError) {
      return { success: false, error: 'Benefit not found' };
    }
    if (error instanceof PremiumFeatureRequiredError) {
      return { success: false, error: error.message };
    }
    logger.error({ err: error }, 'Failed to update benefit');
    return { success: false, error: 'Failed to update benefit. Please try again.' };
  }
}

export async function removeBenefit(benefitId: string): Promise<ActionResult> {
  const parsed = deleteBenefitSchema.safeParse({ benefitId });
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const userId = await requireUserId();
    await assertPremiumFeatureAccess(userId, 'benefits');
    await deleteBenefitService(userId, parsed.data.benefitId);
    revalidatePath('/benefits');
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    if (error instanceof BenefitNotFoundError) {
      return { success: false, error: 'Benefit not found' };
    }
    if (error instanceof PremiumFeatureRequiredError) {
      return { success: false, error: error.message };
    }
    logger.error({ err: error }, 'Failed to delete benefit');
    return { success: false, error: 'Failed to delete benefit. Please try again.' };
  }
}

export async function useBenefit(benefitId: string): Promise<ActionResult> {
  const parsed = markBenefitUsedSchema.safeParse({ benefitId });
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const userId = await requireUserId();
    await assertPremiumFeatureAccess(userId, 'benefits');
    await markBenefitUsedService(userId, parsed.data.benefitId);
    revalidatePath('/benefits');
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    if (error instanceof BenefitNotFoundError) {
      return { success: false, error: 'Benefit not found' };
    }
    if (error instanceof BenefitAlreadyUsedError) {
      return { success: false, error: 'Benefit has already been fully used' };
    }
    if (error instanceof PremiumFeatureRequiredError) {
      return { success: false, error: error.message };
    }
    logger.error({ err: error }, 'Failed to mark benefit as used');
    return { success: false, error: 'Failed to use benefit. Please try again.' };
  }
}
