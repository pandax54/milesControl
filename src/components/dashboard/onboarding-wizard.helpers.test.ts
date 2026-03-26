import { describe, expect, it } from 'vitest';
import {
  buildQuickAddSubscriptionInput,
  buildStarterAlertConfig,
  getDefaultStartDate,
  getOnboardingStatus,
  getRecommendedClubTiers,
  getRecommendedPrograms,
  getRemainingPrograms,
  getTierPriceNumber,
  type OnboardingClubTierOption,
  type OnboardingProgramOption,
} from './onboarding-wizard.helpers';

const PROGRAMS: OnboardingProgramOption[] = [
  { id: 'smiles', name: 'Smiles', type: 'AIRLINE', currency: 'miles' },
  { id: 'livelo', name: 'Livelo', type: 'BANKING', currency: 'points' },
  { id: 'latam', name: 'Latam Pass', type: 'AIRLINE', currency: 'miles' },
  { id: 'azul', name: 'Azul Fidelidade', type: 'AIRLINE', currency: 'points' },
  { id: 'esfera', name: 'Esfera', type: 'BANKING', currency: 'points' },
];

const CLUB_TIERS: OnboardingClubTierOption[] = [
  {
    id: 'smiles-2000',
    name: 'Clube Smiles 2.000',
    monthlyPrice: 73.8,
    baseMonthlyMiles: 2000,
    minimumStayMonths: 6,
    program: { id: 'smiles', name: 'Smiles', type: 'AIRLINE' },
  },
  {
    id: 'smiles-1000',
    name: 'Clube Smiles 1.000',
    monthlyPrice: '42',
    baseMonthlyMiles: 1000,
    minimumStayMonths: 6,
    program: { id: 'smiles', name: 'Smiles', type: 'AIRLINE' },
  },
  {
    id: 'livelo-200',
    name: 'Clube Livelo 200',
    monthlyPrice: { toString: () => '15.9' },
    baseMonthlyMiles: 200,
    minimumStayMonths: 0,
    program: { id: 'livelo', name: 'Livelo', type: 'BANKING' },
  },
  {
    id: 'latam-500',
    name: 'Clube Latam Pass 500',
    monthlyPrice: 34.9,
    baseMonthlyMiles: 500,
    minimumStayMonths: 3,
    program: { id: 'latam', name: 'Latam Pass', type: 'AIRLINE' },
  },
  {
    id: 'azul-500',
    name: 'Clube TudoAzul 500',
    monthlyPrice: 29.9,
    baseMonthlyMiles: 500,
    minimumStayMonths: 3,
    program: { id: 'azul', name: 'Azul Fidelidade', type: 'AIRLINE' },
  },
];

describe('getOnboardingStatus', () => {
  it('should point to programs when the user has not added any enrollment', () => {
    expect(
      getOnboardingStatus({ enrollmentCount: 0, activeSubscriptionCount: 0, alertConfigCount: 0 }),
    ).toEqual({
      hasPrograms: false,
      hasSubscriptions: false,
      hasAlerts: false,
      firstIncompleteStep: 'programs',
    });
  });

  it('should point to alerts after programs and subscriptions are completed', () => {
    expect(
      getOnboardingStatus({ enrollmentCount: 2, activeSubscriptionCount: 1, alertConfigCount: 0 }),
    ).toEqual({
      hasPrograms: true,
      hasSubscriptions: true,
      hasAlerts: false,
      firstIncompleteStep: 'alerts',
    });
  });

  it('should return null when onboarding is complete', () => {
    expect(
      getOnboardingStatus({ enrollmentCount: 2, activeSubscriptionCount: 1, alertConfigCount: 3 })
        .firstIncompleteStep,
    ).toBeNull();
  });
});

describe('getRecommendedPrograms', () => {
  it('should keep the Brazilian quick-add order and map Azul Fidelidade to Azul', () => {
    const result = getRecommendedPrograms(PROGRAMS);

    expect(result.map((entry) => entry.displayName)).toEqual([
      'Smiles',
      'Livelo',
      'Latam Pass',
      'Azul',
    ]);
    expect(result[3]?.program.name).toBe('Azul Fidelidade');
  });

  it('should expose the non-priority programs separately', () => {
    const recommendedPrograms = getRecommendedPrograms(PROGRAMS);

    expect(getRemainingPrograms(PROGRAMS, recommendedPrograms)).toEqual([
      { id: 'esfera', name: 'Esfera', type: 'BANKING', currency: 'points' },
    ]);
  });
});

describe('getRecommendedClubTiers', () => {
  it('should pick the lowest-priced starter tier for each recommended program', () => {
    const result = getRecommendedClubTiers(CLUB_TIERS);

    expect(result.map((entry) => entry.tier.id)).toEqual([
      'smiles-1000',
      'livelo-200',
      'latam-500',
      'azul-500',
    ]);
  });

  it('should normalize club tier prices from different input types', () => {
    expect(getTierPriceNumber(CLUB_TIERS[1].monthlyPrice)).toBe(42);
    expect(getTierPriceNumber(CLUB_TIERS[2].monthlyPrice)).toBe(15.9);
  });
});

describe('quick-add builders', () => {
  it('should build a default subscription payload with a single ongoing accrual phase', () => {
    expect(buildQuickAddSubscriptionInput(CLUB_TIERS[0], '2026-03-26')).toEqual({
      clubTierId: 'smiles-2000',
      startDate: '2026-03-26',
      monthlyCost: 73.8,
      accrualSchedule: [{ fromMonth: 1, toMonth: null, milesPerMonth: 2000 }],
    });
  });

  it('should build the starter transfer alert for the user programs', () => {
    expect(buildStarterAlertConfig(['Smiles', 'Livelo'])).toEqual({
      name: 'Smiles 80%+ transfer alert',
      channels: ['IN_APP'],
      programNames: ['Smiles', 'Livelo'],
      promoTypes: ['TRANSFER_BONUS'],
      minBonusPercent: 80,
      maxCostPerMilheiro: null,
      telegramChatId: null,
    });
  });

  it('should derive the default start date from the supplied date', () => {
    expect(getDefaultStartDate(new Date('2026-03-26T12:00:00.000Z'))).toBe('2026-03-26');
  });
});
