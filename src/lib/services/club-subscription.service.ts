import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type {
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
} from '@/lib/validators/subscription.schema';

export async function listClubTiers() {
  const tiers = await prisma.clubTier.findMany({
    include: {
      program: { select: { id: true, name: true, type: true } },
    },
    orderBy: [{ program: { name: 'asc' } }, { baseMonthlyMiles: 'asc' }],
  });

  return tiers.map((tier) => ({
    ...tier,
    monthlyPrice: Number(tier.monthlyPrice),
  }));
}

export async function listSubscriptions(userId: string) {
  const subscriptions = await prisma.clubSubscription.findMany({
    where: { userId },
    include: {
      clubTier: {
        include: {
          program: {
            select: { id: true, name: true, type: true, currency: true, website: true },
          },
        },
      },
    },
    orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
  });

  return subscriptions.map((sub) => ({
    ...sub,
    clubTier: {
      ...sub.clubTier,
      monthlyPrice: Number(sub.clubTier.monthlyPrice),
    },
  }));
}

export async function createSubscription(userId: string, input: CreateSubscriptionInput) {
  const clubTier = await prisma.clubTier.findUnique({ where: { id: input.clubTierId } });
  if (!clubTier) {
    throw new ClubTierNotFoundError(input.clubTierId);
  }

  const subscription = await prisma.clubSubscription.create({
    data: {
      userId,
      clubTierId: input.clubTierId,
      startDate: new Date(input.startDate),
      monthlyCost: input.monthlyCost,
      accrualSchedule: input.accrualSchedule,
      nextBillingDate: input.nextBillingDate ? new Date(input.nextBillingDate) : null,
    },
    include: {
      clubTier: {
        include: {
          program: { select: { id: true, name: true, type: true, currency: true } },
        },
      },
    },
  });

  logger.info({ userId, subscriptionId: subscription.id, clubTierId: input.clubTierId }, 'Club subscription created');

  return subscription;
}

export async function updateSubscription(userId: string, input: UpdateSubscriptionInput) {
  const subscription = await prisma.clubSubscription.findFirst({
    where: { id: input.subscriptionId, userId },
  });

  if (!subscription) {
    throw new SubscriptionNotFoundError(input.subscriptionId);
  }

  const updated = await prisma.clubSubscription.update({
    where: { id: input.subscriptionId },
    data: {
      ...(input.status !== undefined && { status: input.status }),
      ...(input.monthlyCost !== undefined && { monthlyCost: input.monthlyCost }),
      ...(input.accrualSchedule !== undefined && { accrualSchedule: input.accrualSchedule }),
      ...(input.endDate !== undefined && {
        endDate: input.endDate ? new Date(input.endDate) : null,
      }),
      ...(input.nextBillingDate !== undefined && {
        nextBillingDate: input.nextBillingDate ? new Date(input.nextBillingDate) : null,
      }),
    },
    include: {
      clubTier: {
        include: {
          program: { select: { id: true, name: true, type: true, currency: true } },
        },
      },
    },
  });

  logger.info({ userId, subscriptionId: input.subscriptionId }, 'Club subscription updated');

  return updated;
}

export async function deleteSubscription(userId: string, subscriptionId: string) {
  const subscription = await prisma.clubSubscription.findFirst({
    where: { id: subscriptionId, userId },
  });

  if (!subscription) {
    throw new SubscriptionNotFoundError(subscriptionId);
  }

  await prisma.clubSubscription.delete({ where: { id: subscriptionId } });

  logger.info({ userId, subscriptionId }, 'Club subscription deleted');
}

export class ClubTierNotFoundError extends Error {
  constructor(clubTierId: string) {
    super(`Club tier not found: ${clubTierId}`);
    this.name = 'ClubTierNotFoundError';
  }
}

export class SubscriptionNotFoundError extends Error {
  constructor(subscriptionId: string) {
    super(`Subscription not found: ${subscriptionId}`);
    this.name = 'SubscriptionNotFoundError';
  }
}
