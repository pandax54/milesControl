import { FreemiumTier } from '@/generated/prisma/client';
import {
  FREE_TIER_FEATURES,
  PREMIUM_FEATURE_KEYS,
  PREMIUM_FEATURE_METADATA,
  PREMIUM_TIER_FEATURES,
  type PremiumFeatureKey,
} from '@/lib/freemium';
import { prisma } from '@/lib/prisma';

export const FREE_TIER_PROGRAM_LIMIT = 5;

type FeatureAccessMap = Record<PremiumFeatureKey, boolean>;

const FEATURE_ACCESS_BY_TIER: Record<FreemiumTier, FeatureAccessMap> = {
  FREE: {
    milesValueAdvisor: false,
    awardFlights: false,
    exploreDestinations: false,
    telegramAlerts: false,
    benefits: false,
  },
  PREMIUM: {
    milesValueAdvisor: true,
    awardFlights: true,
    exploreDestinations: true,
    telegramAlerts: true,
    benefits: true,
  },
};

export interface UserFreemiumAccessState {
  readonly tier: FreemiumTier;
  readonly programLimit: number | null;
  readonly programCount: number;
  readonly remainingProgramSlots: number | null;
  readonly features: FeatureAccessMap;
}

export class PremiumFeatureRequiredError extends Error {
  readonly feature: PremiumFeatureKey;

  constructor(feature: PremiumFeatureKey) {
    super(`${PREMIUM_FEATURE_METADATA[feature].title} is available on MilesControl Premium.`);
    this.name = 'PremiumFeatureRequiredError';
    this.feature = feature;
  }
}

export class ProgramEnrollmentLimitReachedError extends Error {
  constructor(limit: number) {
    super(`Free tier supports up to ${limit} programs. Upgrade to Premium for unlimited programs.`);
    this.name = 'ProgramEnrollmentLimitReachedError';
  }
}

export function getProgramLimitByTier(tier: FreemiumTier): number | null {
  return tier === 'FREE' ? FREE_TIER_PROGRAM_LIMIT : null;
}

export function getFeatureAccessByTier(tier: FreemiumTier): FeatureAccessMap {
  return FEATURE_ACCESS_BY_TIER[tier];
}

export async function getUserFreemiumTier(userId: string): Promise<FreemiumTier> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { freemiumTier: true },
  });

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  return user.freemiumTier;
}

export async function canAccessPremiumFeature(
  userId: string,
  feature: PremiumFeatureKey,
): Promise<boolean> {
  const tier = await getUserFreemiumTier(userId);
  return getFeatureAccessByTier(tier)[feature];
}

export async function assertPremiumFeatureAccess(
  userId: string,
  feature: PremiumFeatureKey,
): Promise<void> {
  const hasAccess = await canAccessPremiumFeature(userId, feature);

  if (!hasAccess) {
    throw new PremiumFeatureRequiredError(feature);
  }
}

export async function assertProgramEnrollmentAvailable(userId: string): Promise<void> {
  const tier = await getUserFreemiumTier(userId);

  if (tier === 'PREMIUM') {
    return;
  }

  const programCount = await prisma.programEnrollment.count({
    where: { userId },
  });

  if (programCount >= FREE_TIER_PROGRAM_LIMIT) {
    throw new ProgramEnrollmentLimitReachedError(FREE_TIER_PROGRAM_LIMIT);
  }
}

export async function getUserFreemiumAccessState(userId: string): Promise<UserFreemiumAccessState> {
  const [tier, programCount] = await Promise.all([
    getUserFreemiumTier(userId),
    prisma.programEnrollment.count({ where: { userId } }),
  ]);

  const programLimit = getProgramLimitByTier(tier);
  const remainingProgramSlots =
    programLimit === null ? null : Math.max(programLimit - programCount, 0);

  return {
    tier,
    programLimit,
    programCount,
    remainingProgramSlots,
    features: getFeatureAccessByTier(tier),
  };
}

export {
  FREE_TIER_FEATURES,
  PREMIUM_FEATURE_KEYS,
  PREMIUM_FEATURE_METADATA,
  PREMIUM_TIER_FEATURES,
};
