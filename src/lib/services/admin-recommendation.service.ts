import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { PromotionNotFoundError } from './promotion.service';
import { ClientNotFoundError } from './client-management.service';

// ==================== Types ====================

export interface SendRecommendationResult {
  readonly clientId: string;
  readonly success: boolean;
  readonly error?: string;
}

export interface SendBatchRecommendationsResult {
  readonly attempted: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly results: readonly SendRecommendationResult[];
}

// ==================== Error classes ====================

export class ClientNotManagedByAdminError extends Error {
  constructor(clientId: string) {
    super(`Client is not managed by this admin: ${clientId}`);
    this.name = 'ClientNotManagedByAdminError';
  }
}

// ==================== Internal helpers ====================

async function buildNotificationContent(
  promotionId: string,
  customMessage?: string,
): Promise<{ title: string; body: string }> {
  const promotion = await prisma.promotion.findUnique({
    where: { id: promotionId },
    select: { title: true, bonusPercent: true, sourceProgram: { select: { name: true } }, destProgram: { select: { name: true } } },
  });

  if (!promotion) {
    throw new PromotionNotFoundError(promotionId);
  }

  const title = `Recomendação: ${promotion.title}`;
  const body = customMessage ?? buildDefaultBody(promotion);

  return { title, body };
}

function buildDefaultBody(promotion: {
  bonusPercent: number | null;
  sourceProgram: { name: string } | null;
  destProgram: { name: string } | null;
}): string {
  const parts: string[] = ['Seu consultor recomenda esta promoção para você.'];

  if (promotion.sourceProgram && promotion.destProgram) {
    parts.push(`${promotion.sourceProgram.name} → ${promotion.destProgram.name}`);
  }

  if (promotion.bonusPercent) {
    parts.push(`Bônus: ${promotion.bonusPercent}%`);
  }

  return parts.join(' | ');
}

// ==================== Mutations ====================

/**
 * Send a promo recommendation notification to a single client.
 * Validates that the admin manages the target client.
 */
export async function sendRecommendation(
  adminId: string,
  clientId: string,
  promotionId: string,
  message?: string,
): Promise<void> {
  const client = await prisma.user.findFirst({
    where: { id: clientId, managedById: adminId },
    select: { id: true },
  });

  if (!client) {
    const exists = await prisma.user.findUnique({ where: { id: clientId }, select: { id: true } });
    if (!exists) {
      throw new ClientNotFoundError(clientId);
    }
    throw new ClientNotManagedByAdminError(clientId);
  }

  const { title, body } = await buildNotificationContent(promotionId, message);

  await prisma.notification.create({
    data: {
      userId: clientId,
      title,
      body,
      channel: 'IN_APP',
      promotionId,
    },
  });

  logger.info({ adminId, clientId, promotionId }, 'Promo recommendation sent');
}

/**
 * Send promo recommendation notifications to multiple clients in batch.
 * Skips clients not managed by the admin rather than failing the whole batch.
 */
export async function sendBatchRecommendations(
  adminId: string,
  clientIds: readonly string[],
  promotionId: string,
  message?: string,
): Promise<SendBatchRecommendationsResult> {
  const { title, body } = await buildNotificationContent(promotionId, message);

  const managedClients = await prisma.user.findMany({
    where: { id: { in: [...clientIds] }, managedById: adminId },
    select: { id: true },
  });

  const managedClientIds = new Set(managedClients.map((c) => c.id));

  const results: SendRecommendationResult[] = [];

  for (const clientId of clientIds) {
    if (!managedClientIds.has(clientId)) {
      results.push({ clientId, success: false, error: 'Client not managed by this admin' });
      continue;
    }

    try {
      await prisma.notification.create({
        data: {
          userId: clientId,
          title,
          body,
          channel: 'IN_APP',
          promotionId,
        },
      });
      results.push({ clientId, success: true });
    } catch (error) {
      logger.error({ err: error, adminId, clientId, promotionId }, 'Failed to create recommendation notification');
      results.push({ clientId, success: false, error: 'Failed to create notification' });
    }
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.length - succeeded;

  logger.info(
    { adminId, promotionId, attempted: results.length, succeeded, failed },
    'Batch recommendations sent',
  );

  return {
    attempted: results.length,
    succeeded,
    failed,
    results,
  };
}
