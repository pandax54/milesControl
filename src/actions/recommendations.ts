'use server';

import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';
import {
  sendRecommendationSchema,
  sendBatchRecommendationsSchema,
  type SendRecommendationInput,
  type SendBatchRecommendationsInput,
} from '@/lib/validators/recommendation.schema';
import {
  sendRecommendation as sendRecommendationService,
  sendBatchRecommendations as sendBatchRecommendationsService,
  ClientNotManagedByAdminError,
  type SendBatchRecommendationsResult,
} from '@/lib/services/admin-recommendation.service';
import { ClientNotFoundError } from '@/lib/services/client-management.service';
import { PromotionNotFoundError } from '@/lib/services/promotion.service';
import { logAuditAction, AUDIT_ACTIONS } from '@/lib/services/audit-log.service';
import {
  requireAdminRole,
  isAuthenticationError,
  isAuthorizationError,
  type ActionResult,
} from './helpers';

const PROMOTIONS_PATH = '/admin/promotions';

export interface BatchRecommendationActionResult extends ActionResult {
  summary?: SendBatchRecommendationsResult;
}

export async function sendPromoRecommendation(
  input: SendRecommendationInput,
): Promise<ActionResult> {
  const parsed = sendRecommendationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const adminId = await requireAdminRole();
    await sendRecommendationService(
      adminId,
      parsed.data.clientId,
      parsed.data.promotionId,
      parsed.data.message,
    );
    await logAuditAction(
      adminId,
      AUDIT_ACTIONS.SEND_RECOMMENDATION,
      { promotionId: parsed.data.promotionId },
      parsed.data.clientId,
    );
    revalidatePath(PROMOTIONS_PATH);
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    if (isAuthorizationError(error)) {
      return { success: false, error: 'Admin access required' };
    }
    if (error instanceof ClientNotFoundError) {
      return { success: false, error: 'Client not found' };
    }
    if (error instanceof ClientNotManagedByAdminError) {
      return { success: false, error: 'Client is not managed by you' };
    }
    if (error instanceof PromotionNotFoundError) {
      return { success: false, error: 'Promotion not found' };
    }
    logger.error({ err: error }, 'Failed to send promo recommendation');
    return { success: false, error: 'Failed to send recommendation. Please try again.' };
  }
}

export async function sendBatchPromoRecommendations(
  input: SendBatchRecommendationsInput,
): Promise<BatchRecommendationActionResult> {
  const parsed = sendBatchRecommendationsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const adminId = await requireAdminRole();
    const summary = await sendBatchRecommendationsService(
      adminId,
      parsed.data.clientIds,
      parsed.data.promotionId,
      parsed.data.message,
    );
    await logAuditAction(
      adminId,
      AUDIT_ACTIONS.SEND_BATCH_RECOMMENDATIONS,
      {
        promotionId: parsed.data.promotionId,
        clientCount: parsed.data.clientIds.length,
        succeeded: summary.succeeded,
        failed: summary.failed,
      },
    );
    revalidatePath(PROMOTIONS_PATH);
    return { success: true, summary };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    if (isAuthorizationError(error)) {
      return { success: false, error: 'Admin access required' };
    }
    if (error instanceof PromotionNotFoundError) {
      return { success: false, error: 'Promotion not found' };
    }
    logger.error({ err: error }, 'Failed to send batch promo recommendations');
    return { success: false, error: 'Failed to send recommendations. Please try again.' };
  }
}
