import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type {
  CreateAlertConfigInput,
  UpdateAlertConfigInput,
  AlertChannelValue,
  PromoTypeValue,
} from '@/lib/validators/alert-config.schema';
import type { AlertChannel, PromoType } from '@/generated/prisma/client';
import { assertPremiumFeatureAccess } from '@/lib/services/freemium.service';

// ==================== Error classes ====================

export class AlertConfigNotFoundError extends Error {
  constructor(alertConfigId: string) {
    super(`Alert config not found: ${alertConfigId}`);
    this.name = 'AlertConfigNotFoundError';
  }
}

// ==================== Queries ====================

export async function listAlertConfigs(userId: string) {
  return prisma.alertConfig.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getAlertConfig(userId: string, alertConfigId: string) {
  const config = await prisma.alertConfig.findFirst({
    where: { id: alertConfigId, userId },
  });

  if (!config) {
    throw new AlertConfigNotFoundError(alertConfigId);
  }

  return config;
}

// ==================== Mutations ====================

export async function createAlertConfig(userId: string, input: CreateAlertConfigInput) {
  if (input.channels.includes('TELEGRAM')) {
    await assertPremiumFeatureAccess(userId, 'telegramAlerts');
  }

  const config = await prisma.alertConfig.create({
    data: {
      userId,
      name: input.name,
      channels: input.channels as AlertChannel[],
      programNames: input.programNames ?? [],
      promoTypes: input.promoTypes as PromoType[],
      minBonusPercent: input.minBonusPercent ?? null,
      maxCostPerMilheiro: input.maxCostPerMilheiro ?? null,
      telegramChatId: input.telegramChatId ?? null,
    },
  });

  logger.info({ userId, alertConfigId: config.id, name: input.name }, 'Alert config created');

  return config;
}

export async function updateAlertConfig(userId: string, input: UpdateAlertConfigInput) {
  const existing = await prisma.alertConfig.findFirst({
    where: { id: input.alertConfigId, userId },
  });

  if (!existing) {
    throw new AlertConfigNotFoundError(input.alertConfigId);
  }

  const nextChannels = input.channels ?? existing.channels;
  if (nextChannels.includes('TELEGRAM')) {
    await assertPremiumFeatureAccess(userId, 'telegramAlerts');
  }

  const updated = await prisma.alertConfig.update({
    where: { id: input.alertConfigId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.channels !== undefined && { channels: input.channels as AlertChannel[] }),
      ...(input.programNames !== undefined && { programNames: input.programNames }),
      ...(input.promoTypes !== undefined && { promoTypes: input.promoTypes as PromoType[] }),
      ...(input.minBonusPercent !== undefined && { minBonusPercent: input.minBonusPercent }),
      ...(input.maxCostPerMilheiro !== undefined && {
        maxCostPerMilheiro: input.maxCostPerMilheiro,
      }),
      ...(input.telegramChatId !== undefined && { telegramChatId: input.telegramChatId }),
    },
  });

  logger.info({ userId, alertConfigId: input.alertConfigId }, 'Alert config updated');

  return updated;
}

export async function toggleAlertConfig(
  userId: string,
  alertConfigId: string,
  isActive: boolean,
) {
  const existing = await prisma.alertConfig.findFirst({
    where: { id: alertConfigId, userId },
  });

  if (!existing) {
    throw new AlertConfigNotFoundError(alertConfigId);
  }

  const updated = await prisma.alertConfig.update({
    where: { id: alertConfigId },
    data: { isActive },
  });

  logger.info({ userId, alertConfigId, isActive }, 'Alert config toggled');

  return updated;
}

export async function deleteAlertConfig(userId: string, alertConfigId: string) {
  const existing = await prisma.alertConfig.findFirst({
    where: { id: alertConfigId, userId },
  });

  if (!existing) {
    throw new AlertConfigNotFoundError(alertConfigId);
  }

  await prisma.alertConfig.delete({
    where: { id: alertConfigId },
  });

  logger.info({ userId, alertConfigId }, 'Alert config deleted');
}

// ==================== Alert matching helpers ====================

/**
 * Returns all active alert configs for a given user.
 * Used by the alert matching engine (task 4.1).
 */
export async function listActiveAlertConfigs(userId: string) {
  return prisma.alertConfig.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Returns all active alert configs across all users.
 * Used by the alert matching engine (task 4.1) when processing new promotions.
 */
export async function listAllActiveAlertConfigs() {
  return prisma.alertConfig.findMany({
    where: { isActive: true },
    include: { user: { select: { id: true, email: true, name: true } } },
  });
}

// ==================== Type helpers ====================

export function toAlertChannelValues(
  channels: AlertChannel[],
): AlertChannelValue[] {
  return channels as AlertChannelValue[];
}

export function toPromoTypeValues(promoTypes: PromoType[]): PromoTypeValue[] {
  return promoTypes as PromoTypeValue[];
}
