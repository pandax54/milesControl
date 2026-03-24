import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { sendPushNotification } from '@/lib/integrations/web-push';
import type { AlertMatchResult } from './alert-matcher.service';

// ==================== Error classes ====================

export class PushSubscriptionNotFoundError extends Error {
  constructor(endpoint: string) {
    super(`Push subscription not found: ${endpoint}`);
    this.name = 'PushSubscriptionNotFoundError';
  }
}

// ==================== Types ====================

export interface RegisterPushSubscriptionInput {
  readonly userId: string;
  readonly endpoint: string;
  readonly p256dh: string;
  readonly auth: string;
  readonly userAgent?: string;
}

export interface SendWebPushAlertsResult {
  readonly attempted: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly expiredRemoved: number;
}

// ==================== Mutations ====================

/**
 * Register or update a push subscription for a user.
 * If a subscription with the same endpoint already exists, it is updated.
 */
export async function registerPushSubscription(
  input: RegisterPushSubscriptionInput,
): Promise<void> {
  await prisma.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    create: {
      userId: input.userId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      userAgent: input.userAgent,
    },
    update: {
      userId: input.userId,
      p256dh: input.p256dh,
      auth: input.auth,
      userAgent: input.userAgent,
    },
  });

  logger.info({ userId: input.userId }, 'Push subscription registered');
}

/**
 * Remove a push subscription by endpoint.
 * Throws PushSubscriptionNotFoundError if the subscription does not belong to the user.
 */
export async function unregisterPushSubscription(
  userId: string,
  endpoint: string,
): Promise<void> {
  const existing = await prisma.pushSubscription.findFirst({
    where: { endpoint, userId },
  });

  if (!existing) {
    throw new PushSubscriptionNotFoundError(endpoint);
  }

  await prisma.pushSubscription.delete({ where: { endpoint } });

  logger.info({ userId }, 'Push subscription unregistered');
}

/**
 * Remove an expired push subscription by endpoint (called after 410/404 responses).
 * Uses deleteMany to silently skip if it was already removed.
 */
export async function removeExpiredPushSubscription(endpoint: string): Promise<void> {
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  logger.info({ endpoint: endpoint.slice(0, 50) }, 'Expired push subscription removed');
}

// ==================== Queries ====================

/**
 * List all push subscriptions for a given user.
 */
export async function listPushSubscriptions(userId: string) {
  return prisma.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, userAgent: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
}

// ==================== Notifications ====================

/**
 * Send web push notifications for all matches that include the WEB_PUSH channel.
 * Fetches all push subscriptions for matching users in a single query.
 * Removes expired subscriptions automatically.
 */
export async function sendWebPushAlerts(
  matches: readonly AlertMatchResult[],
): Promise<SendWebPushAlertsResult> {
  const pushMatches = matches.filter((m) => m.channels.includes('WEB_PUSH'));

  if (pushMatches.length === 0) {
    return { attempted: 0, succeeded: 0, failed: 0, expiredRemoved: 0 };
  }

  const userIds = [...new Set(pushMatches.map((m) => m.userId))];

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
    select: { endpoint: true, p256dh: true, auth: true, userId: true },
  });

  if (subscriptions.length === 0) {
    logger.debug({ userCount: userIds.length }, 'No push subscriptions found for matched users');
    return { attempted: 0, succeeded: 0, failed: 0, expiredRemoved: 0 };
  }

  const subscriptionsByUserId = new Map<string, typeof subscriptions>();

  for (const sub of subscriptions) {
    const existing = subscriptionsByUserId.get(sub.userId) ?? [];
    existing.push(sub);
    subscriptionsByUserId.set(sub.userId, existing);
  }

  let attempted = 0;
  let succeeded = 0;
  let failed = 0;
  let expiredRemoved = 0;

  for (const match of pushMatches) {
    const userSubscriptions = subscriptionsByUserId.get(match.userId) ?? [];

    for (const sub of userSubscriptions) {
      attempted++;

      const sent = await sendPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        { title: match.notificationTitle, body: match.notificationBody, tag: match.promotionId },
      );

      if (sent) {
        succeeded++;
      } else {
        failed++;
        // Remove the subscription — it is likely expired (410/404)
        await removeExpiredPushSubscription(sub.endpoint);
        expiredRemoved++;
      }
    }
  }

  logger.info(
    { attempted, succeeded, failed, expiredRemoved },
    'Web push alerts dispatched',
  );

  return { attempted, succeeded, failed, expiredRemoved };
}
