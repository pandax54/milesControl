import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { sendAlertNotification } from '@/lib/integrations/telegram';
import type { AlertMatchResult } from './alert-matcher.service';
import type { User, AlertConfig } from '@/generated/prisma/client';

// ==================== Constants ====================

const TOP_PROMOS_LIMIT = 5;

// ==================== Types ====================

export interface UserWithAlertConfigs extends User {
  readonly alertConfigs: readonly AlertConfig[];
}

export interface SendTelegramAlertsResult {
  readonly attempted: number;
  readonly succeeded: number;
  readonly failed: number;
}

// ==================== User lookup ====================

/**
 * Find a user by their Telegram chat ID.
 * Looks up via AlertConfig.telegramChatId since that is where chat IDs are stored.
 * Returns the first matched user with their alert configs, or null if not found.
 */
export async function findUserByChatId(
  chatId: string,
): Promise<UserWithAlertConfigs | null> {
  const alertConfig = await prisma.alertConfig.findFirst({
    where: { telegramChatId: chatId },
    include: {
      user: {
        include: {
          alertConfigs: true,
        },
      },
    },
  });

  if (!alertConfig) {
    return null;
  }

  return alertConfig.user as UserWithAlertConfigs;
}

// ==================== Notifications ====================

/**
 * Send Telegram alert notifications for all matches that include the TELEGRAM channel.
 * Skips matches where no telegramChatId is configured on the alert config.
 */
export async function sendTelegramAlerts(
  matches: readonly AlertMatchResult[],
): Promise<SendTelegramAlertsResult> {
  const telegramMatches = matches.filter((m) => m.channels.includes('TELEGRAM'));

  if (telegramMatches.length === 0) {
    return { attempted: 0, succeeded: 0, failed: 0 };
  }

  const alertConfigIds = [...new Set(telegramMatches.map((m) => m.alertConfigId))];

  const alertConfigs = await prisma.alertConfig.findMany({
    where: { id: { in: alertConfigIds }, telegramChatId: { not: null } },
    select: { id: true, telegramChatId: true },
  });

  const chatIdByAlertConfigId = new Map(
    alertConfigs
      .filter((ac) => ac.telegramChatId != null)
      .map((ac) => [ac.id, ac.telegramChatId as string]),
  );

  let succeeded = 0;
  let failed = 0;

  for (const match of telegramMatches) {
    const chatId = chatIdByAlertConfigId.get(match.alertConfigId);

    if (!chatId) {
      logger.warn(
        { alertConfigId: match.alertConfigId },
        'Telegram alert skipped — no chatId configured on alert config',
      );
      failed++;
      continue;
    }

    const sent = await sendAlertNotification(chatId, match.notificationTitle, match.notificationBody);

    if (sent) {
      succeeded++;
    } else {
      failed++;
    }
  }

  logger.info(
    { attempted: telegramMatches.length, succeeded, failed },
    'Telegram alerts dispatched',
  );

  return { attempted: telegramMatches.length, succeeded, failed };
}

// ==================== Bot command helpers ====================

/**
 * Get the top N active promotions sorted by cost per milheiro ascending (best deals first).
 * Used by the /promos bot command.
 */
export async function getTopPromotionsForBot(limit = TOP_PROMOS_LIMIT) {
  return prisma.promotion.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { costPerMilheiro: 'asc' },
    take: limit,
    include: {
      sourceProgram: { select: { name: true } },
      destProgram: { select: { name: true } },
    },
  });
}

/**
 * Get active alert configs for a user.
 * Used by the /alerts bot command.
 */
export async function getUserAlertConfigs(userId: string) {
  return prisma.alertConfig.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });
}
