import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { AlertConfig, Promotion, AlertChannel } from '@/generated/prisma/client';
import type { PromotionWithPrograms } from './promotion.service';

// ==================== Types ====================

export interface AlertMatchResult {
  readonly alertConfigId: string;
  readonly userId: string;
  readonly promotionId: string;
  readonly channels: readonly AlertChannel[];
  readonly notificationTitle: string;
  readonly notificationBody: string;
}

export interface MatchAlertsResult {
  readonly promotionId: string;
  readonly matchCount: number;
  readonly matches: readonly AlertMatchResult[];
}

export interface ProcessNewPromotionsResult {
  readonly promotionsProcessed: number;
  readonly totalMatches: number;
  readonly notificationsCreated: number;
}

// ==================== Constants ====================

const MAX_NOTIFICATION_BODY_LENGTH = 500;

// ==================== Matching predicates ====================

/**
 * Returns true when the promotion matches the alert config's filter criteria.
 * An alert config with empty programNames or promoTypes matches any value.
 * Requires PromotionWithPrograms so that program names can be resolved.
 */
export function doesPromotionMatchAlert(
  promotion: PromotionWithPrograms,
  alertConfig: AlertConfig,
): boolean {
  if (!matchesPromoType(promotion, alertConfig)) {
    return false;
  }

  if (!matchesProgramNamesWithPrograms(promotion, alertConfig)) {
    return false;
  }

  if (!matchesMinBonusPercent(promotion, alertConfig)) {
    return false;
  }

  if (!matchesMaxCostPerMilheiro(promotion, alertConfig)) {
    return false;
  }

  return true;
}

function matchesPromoType(promotion: Promotion, alertConfig: AlertConfig): boolean {
  if (alertConfig.promoTypes.length === 0) {
    return true;
  }

  return alertConfig.promoTypes.includes(promotion.type);
}

/**
 * Matches program names using the promotion's resolved program names.
 * The promotion's source and destination program names are checked.
 */
function matchesProgramNamesWithPrograms(
  promotion: PromotionWithPrograms,
  alertConfig: AlertConfig,
): boolean {
  if (alertConfig.programNames.length === 0) {
    return true;
  }

  const lowerCaseNames = alertConfig.programNames.map((n) => n.toLowerCase());
  const sourceName = promotion.sourceProgram?.name.toLowerCase();
  const destName = promotion.destProgram?.name.toLowerCase();

  return (
    (sourceName != null && lowerCaseNames.includes(sourceName)) ||
    (destName != null && lowerCaseNames.includes(destName))
  );
}

function matchesMinBonusPercent(promotion: Promotion, alertConfig: AlertConfig): boolean {
  if (alertConfig.minBonusPercent == null) {
    return true;
  }

  if (promotion.bonusPercent == null) {
    return false;
  }

  return promotion.bonusPercent >= alertConfig.minBonusPercent;
}

function matchesMaxCostPerMilheiro(promotion: Promotion, alertConfig: AlertConfig): boolean {
  if (alertConfig.maxCostPerMilheiro == null) {
    return true;
  }

  if (promotion.costPerMilheiro == null) {
    return false;
  }

  return Number(promotion.costPerMilheiro) <= Number(alertConfig.maxCostPerMilheiro);
}

// ==================== Notification builders ====================

export function buildNotificationTitle(promotion: PromotionWithPrograms): string {
  if (promotion.type === 'TRANSFER_BONUS' && promotion.bonusPercent != null) {
    const sourceName = promotion.sourceProgram?.name ?? 'Unknown';
    const destName = promotion.destProgram?.name ?? 'Unknown';
    return `${promotion.bonusPercent}% transfer bonus: ${sourceName} → ${destName}`;
  }

  if (promotion.type === 'POINT_PURCHASE' && promotion.purchaseDiscount != null) {
    const programName = promotion.sourceProgram?.name ?? promotion.destProgram?.name ?? 'Unknown';
    return `${promotion.purchaseDiscount}% discount on ${programName} points`;
  }

  return promotion.title;
}

export function buildNotificationBody(promotion: PromotionWithPrograms): string {
  const parts: string[] = [];

  if (promotion.type === 'TRANSFER_BONUS') {
    if (promotion.minimumTransfer != null) {
      parts.push(`Min transfer: ${promotion.minimumTransfer.toLocaleString('pt-BR')} pts`);
    }
    if (promotion.maxBonusCap != null) {
      parts.push(`Cap: ${promotion.maxBonusCap.toLocaleString('pt-BR')} miles`);
    }
  }

  if (promotion.costPerMilheiro != null) {
    parts.push(`Cost: R$${Number(promotion.costPerMilheiro).toFixed(2)}/k`);
  }

  if (promotion.deadline != null) {
    const deadline = promotion.deadline.toLocaleDateString('pt-BR');
    parts.push(`Deadline: ${deadline}`);
  }

  parts.push(`Source: ${promotion.sourceSiteName}`);

  const body = parts.join(' · ');
  return body.length > MAX_NOTIFICATION_BODY_LENGTH
    ? body.slice(0, MAX_NOTIFICATION_BODY_LENGTH - 1) + '…'
    : body;
}

// ==================== Core matching ====================

/**
 * Match a single promotion against all active alert configs.
 * Returns the list of matches for all users whose alerts triggered.
 */
export function matchPromotionAgainstAlerts(
  promotion: PromotionWithPrograms,
  activeAlertConfigs: readonly AlertConfig[],
): AlertMatchResult[] {
  const matches: AlertMatchResult[] = [];

  for (const alertConfig of activeAlertConfigs) {
    if (!doesPromotionMatchAlert(promotion, alertConfig)) {
      continue;
    }

    matches.push({
      alertConfigId: alertConfig.id,
      userId: alertConfig.userId,
      promotionId: promotion.id,
      channels: alertConfig.channels,
      notificationTitle: buildNotificationTitle(promotion),
      notificationBody: buildNotificationBody(promotion),
    });
  }

  return matches;
}

// ==================== Notification persistence ====================

/**
 * Create IN_APP notification records for the given matches.
 * Other channels (EMAIL, TELEGRAM, WEB_PUSH) are handled by their respective
 * notification services in tasks 4.2–4.5; this only creates IN_APP records.
 */
export async function createInAppNotifications(
  matches: readonly AlertMatchResult[],
): Promise<number> {
  const inAppMatches = matches.filter((m) => m.channels.includes('IN_APP' as AlertChannel));

  if (inAppMatches.length === 0) {
    return 0;
  }

  const notifications = inAppMatches.map((match) => ({
    userId: match.userId,
    title: match.notificationTitle,
    body: match.notificationBody,
    channel: 'IN_APP' as AlertChannel,
    promotionId: match.promotionId,
  }));

  await prisma.notification.createMany({ data: notifications });

  return inAppMatches.length;
}

// ==================== Orchestrator ====================

/**
 * Match a batch of new promotions against all active alert configs and
 * persist IN_APP notifications for every match.
 *
 * Intended to be called after new promotions are stored (e.g. from the
 * scrape-promos cron job).
 */
export async function processNewPromotions(
  promotions: readonly PromotionWithPrograms[],
): Promise<ProcessNewPromotionsResult> {
  if (promotions.length === 0) {
    return { promotionsProcessed: 0, totalMatches: 0, notificationsCreated: 0 };
  }

  const activeAlertConfigs = await prisma.alertConfig.findMany({
    where: { isActive: true },
  });

  if (activeAlertConfigs.length === 0) {
    logger.debug(
      { promotionCount: promotions.length },
      'No active alert configs — skipping alert matching',
    );
    return { promotionsProcessed: promotions.length, totalMatches: 0, notificationsCreated: 0 };
  }

  const allMatches: AlertMatchResult[] = [];

  for (const promotion of promotions) {
    const matches = matchPromotionAgainstAlerts(promotion, activeAlertConfigs);
    allMatches.push(...matches);
  }

  let notificationsCreated = 0;

  if (allMatches.length > 0) {
    try {
      notificationsCreated = await createInAppNotifications(allMatches);
    } catch (error) {
      logger.error({ err: error, matchCount: allMatches.length }, 'Failed to create notifications');
    }

    logger.info(
      {
        promotionsProcessed: promotions.length,
        totalMatches: allMatches.length,
        notificationsCreated,
      },
      'Alert matching completed',
    );
  }

  return {
    promotionsProcessed: promotions.length,
    totalMatches: allMatches.length,
    notificationsCreated,
  };
}
