import webpush from 'web-push';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

// ==================== Types ====================

export interface PushPayload {
  readonly title: string;
  readonly body: string;
  readonly icon?: string;
  readonly badge?: string;
  readonly tag?: string;
  readonly data?: Record<string, unknown>;
}

export interface PushSubscriptionKeys {
  readonly endpoint: string;
  readonly p256dh: string;
  readonly auth: string;
}

// ==================== VAPID setup ====================

let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) {
    return true;
  }

  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    logger.warn('VAPID keys not configured — web push notifications are disabled');
    return false;
  }

  webpush.setVapidDetails(
    env.VAPID_EMAIL,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY,
  );

  vapidConfigured = true;
  return true;
}

// ==================== Public key ====================

/**
 * Returns the VAPID public key for the client to use when subscribing.
 * Returns null if VAPID is not configured.
 */
export function getVapidPublicKey(): string | null {
  return env.VAPID_PUBLIC_KEY ?? null;
}

// ==================== Send ====================

/**
 * Send a web push notification to a single subscription endpoint.
 * Returns true on success, false on failure (including expired subscriptions).
 */
export async function sendPushNotification(
  subscription: PushSubscriptionKeys,
  payload: PushPayload,
): Promise<boolean> {
  if (!ensureVapidConfigured()) {
    return false;
  }

  const pushSubscription: webpush.PushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  try {
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    logger.debug({ endpoint: subscription.endpoint.slice(0, 50) }, 'Push notification sent');
    return true;
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;

    if (statusCode === 410 || statusCode === 404) {
      // Subscription expired or invalid — callers should remove it
      logger.info(
        { endpoint: subscription.endpoint.slice(0, 50), statusCode },
        'Push subscription expired or gone',
      );
      return false;
    }

    logger.error(
      { err: error, endpoint: subscription.endpoint.slice(0, 50) },
      'Failed to send push notification',
    );
    return false;
  }
}
