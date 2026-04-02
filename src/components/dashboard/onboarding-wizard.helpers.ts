import type { CreateAlertConfigInput } from '@/lib/validators/alert-config.schema';
import type { CreateSubscriptionInput } from '@/lib/validators/subscription.schema';

export type OnboardingStepId = 'programs' | 'subscriptions' | 'alerts';

export interface OnboardingProgramOption {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly currency: string;
}

export interface OnboardingClubTierOption {
  readonly id: string;
  readonly name: string;
  readonly monthlyPrice: number | string | { toString(): string };
  readonly baseMonthlyMiles: number;
  readonly minimumStayMonths: number;
  readonly program: {
    readonly id: string;
    readonly name: string;
    readonly type: string;
  };
}

export interface RecommendedProgramOption {
  readonly displayName: string;
  readonly program: OnboardingProgramOption;
}

export interface RecommendedClubTierOption {
  readonly displayName: string;
  readonly tier: OnboardingClubTierOption;
}

export interface OnboardingStatus {
  readonly hasPrograms: boolean;
  readonly hasSubscriptions: boolean;
  readonly hasAlerts: boolean;
  readonly firstIncompleteStep: OnboardingStepId | null;
}

const RECOMMENDED_PROGRAMS = [
  { displayName: 'Smiles', aliases: ['smiles'] },
  { displayName: 'Livelo', aliases: ['livelo'] },
  { displayName: 'Latam Pass', aliases: ['latam pass'] },
  { displayName: 'Azul', aliases: ['azul fidelidade', 'tudoazul', 'azul'] },
] as const;

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase('en-US');
}

export function getOnboardingStatus(input: {
  enrollmentCount: number;
  activeSubscriptionCount: number;
  alertConfigCount: number;
}): OnboardingStatus {
  const hasPrograms = input.enrollmentCount > 0;
  const hasSubscriptions = input.activeSubscriptionCount > 0;
  const hasAlerts = input.alertConfigCount > 0;

  const firstIncompleteStep = !hasPrograms
    ? 'programs'
    : !hasSubscriptions
      ? 'subscriptions'
      : !hasAlerts
        ? 'alerts'
        : null;

  return {
    hasPrograms,
    hasSubscriptions,
    hasAlerts,
    firstIncompleteStep,
  };
}

export function getRecommendedPrograms(
  availablePrograms: readonly OnboardingProgramOption[],
): RecommendedProgramOption[] {
  return RECOMMENDED_PROGRAMS.flatMap((recommended) => {
    const match = availablePrograms.find((program) =>
      recommended.aliases.some((alias) => alias === normalizeName(program.name)),
    );

    return match
      ? [
          {
            displayName: recommended.displayName,
            program: match,
          },
        ]
      : [];
  });
}

export function getRemainingPrograms(
  availablePrograms: readonly OnboardingProgramOption[],
  recommendedPrograms: readonly RecommendedProgramOption[],
): OnboardingProgramOption[] {
  const recommendedIds = new Set(recommendedPrograms.map((entry) => entry.program.id));
  return availablePrograms.filter((program) => !recommendedIds.has(program.id));
}

export function getTierPriceNumber(
  monthlyPrice: OnboardingClubTierOption['monthlyPrice'],
): number {
  return typeof monthlyPrice === 'number'
    ? monthlyPrice
    : Number.parseFloat(monthlyPrice.toString());
}

export function getRecommendedClubTiers(
  clubTiers: readonly OnboardingClubTierOption[],
): RecommendedClubTierOption[] {
  return RECOMMENDED_PROGRAMS.flatMap((recommended) => {
    const matchingTiers = clubTiers.filter((tier) =>
      recommended.aliases.some((alias) => alias === normalizeName(tier.program.name)),
    );

    if (matchingTiers.length === 0) {
      return [];
    }

    const lowestTier = [...matchingTiers].sort(
      (left, right) => getTierPriceNumber(left.monthlyPrice) - getTierPriceNumber(right.monthlyPrice),
    )[0];

    return [
      {
        displayName: recommended.displayName,
        tier: lowestTier,
      },
    ];
  });
}

export function getDefaultStartDate(referenceDate: Date = new Date()): string {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, '0');
  const day = String(referenceDate.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function buildQuickAddSubscriptionInput(
  tier: OnboardingClubTierOption,
  startDate: string = getDefaultStartDate(),
): CreateSubscriptionInput {
  return {
    clubTierId: tier.id,
    startDate,
    monthlyCost: getTierPriceNumber(tier.monthlyPrice),
    accrualSchedule: [{ fromMonth: 1, toMonth: null, milesPerMonth: tier.baseMonthlyMiles }],
  };
}

export function buildStarterAlertConfig(
  programNames: readonly string[],
): CreateAlertConfigInput {
  const normalizedProgramNames = programNames
    .map((programName) => programName.trim())
    .filter((programName) => programName.length > 0);

  return {
    name:
      normalizedProgramNames.length > 0
        ? `${normalizedProgramNames[0]} 80%+ transfer alert`
        : '80%+ transfer alert',
    channels: ['IN_APP'],
    programNames: normalizedProgramNames,
    promoTypes: ['TRANSFER_BONUS'],
    minBonusPercent: 80,
    maxCostPerMilheiro: null,
    telegramChatId: null,
  };
}
