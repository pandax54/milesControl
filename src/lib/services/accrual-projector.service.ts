import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { accrualPhaseSchema, type AccrualPhase } from '@/lib/validators/subscription.schema';

const DEFAULT_MONTHS_AHEAD = 12;

interface SubscriptionForProjection {
  readonly startDate: Date;
  readonly endDate: Date | null;
  readonly status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PAUSED';
  readonly accrualSchedule: AccrualPhase[];
  readonly programName: string;
}

interface MonthlyAccrual {
  readonly date: Date;
  readonly milesThisMonth: number;
  readonly cumulativeMiles: number;
  readonly totalBalance: number;
  readonly breakdown: ReadonlyArray<{
    readonly programName: string;
    readonly miles: number;
  }>;
}

interface ProjectionInput {
  readonly currentBalance: number;
  readonly subscriptions: readonly SubscriptionForProjection[];
  readonly monthsAhead: number;
  readonly referenceDate?: Date;
}

interface ProjectionSummary {
  readonly months: readonly MonthlyAccrual[];
  readonly totalProjectedMiles: number;
  readonly balanceAt3Months: number;
  readonly balanceAt6Months: number;
  readonly balanceAt12Months: number;
}

export type {
  SubscriptionForProjection,
  MonthlyAccrual,
  ProjectionInput,
  ProjectionSummary,
};

/**
 * Determines the subscription month number (1-based) for a given date.
 * Month 1 = the month the subscription started.
 */
export function calculateSubscriptionMonth(startDate: Date, targetDate: Date): number {
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth();
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();

  return (targetYear - startYear) * 12 + (targetMonth - startMonth) + 1;
}

/**
 * Finds the accrual phase that applies for a given subscription month.
 * Returns null if no phase covers that month.
 */
export function findPhaseForMonth(
  phases: readonly AccrualPhase[],
  subscriptionMonth: number,
): AccrualPhase | null {
  for (const phase of phases) {
    const matchesStart = subscriptionMonth >= phase.fromMonth;
    const matchesEnd = phase.toMonth === null || subscriptionMonth <= phase.toMonth;

    if (matchesStart && matchesEnd) {
      return phase;
    }
  }

  return null;
}

/**
 * Calculates the miles accrued by a single subscription for a given target date.
 * Returns 0 if subscription is not active or has ended.
 */
export function calculateMilesForMonth(
  subscription: SubscriptionForProjection,
  targetDate: Date,
): number {
  if (subscription.status !== 'ACTIVE') {
    return 0;
  }

  if (subscription.endDate && targetDate > subscription.endDate) {
    return 0;
  }

  const subscriptionMonth = calculateSubscriptionMonth(subscription.startDate, targetDate);

  if (subscriptionMonth < 1) {
    return 0;
  }

  const phase = findPhaseForMonth(subscription.accrualSchedule, subscriptionMonth);

  if (!phase) {
    return 0;
  }

  return phase.milesPerMonth;
}

/**
 * Adds N months to a date, returning a new Date set to the 1st of that month.
 */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth() + months, 1);
  return result;
}

/**
 * Projects future miles balance based on active subscriptions and their accrual schedules.
 * Returns month-by-month forecast with per-subscription breakdown.
 */
export function projectAccrual(input: ProjectionInput): ProjectionSummary {
  const referenceDate = input.referenceDate ?? new Date();
  const months: MonthlyAccrual[] = [];
  let cumulativeMiles = 0;

  for (let i = 1; i <= input.monthsAhead; i++) {
    const targetDate = addMonths(referenceDate, i);
    let milesThisMonth = 0;
    const breakdown: Array<{ programName: string; miles: number }> = [];

    for (const subscription of input.subscriptions) {
      const miles = calculateMilesForMonth(subscription, targetDate);

      if (miles > 0) {
        milesThisMonth += miles;
        breakdown.push({ programName: subscription.programName, miles });
      }
    }

    cumulativeMiles += milesThisMonth;

    months.push({
      date: targetDate,
      milesThisMonth,
      cumulativeMiles,
      totalBalance: input.currentBalance + cumulativeMiles,
      breakdown,
    });
  }

  const findBalanceAtMonth = (monthIndex: number): number => {
    if (monthIndex > months.length || monthIndex < 1) {
      return input.currentBalance;
    }
    return months[monthIndex - 1].totalBalance;
  };

  return {
    months,
    totalProjectedMiles: cumulativeMiles,
    balanceAt3Months: findBalanceAtMonth(3),
    balanceAt6Months: findBalanceAtMonth(6),
    balanceAt12Months: findBalanceAtMonth(12),
  };
}

/**
 * Parses the JSON accrualSchedule stored in DB into typed AccrualPhase[].
 * Returns an empty array if parsing fails.
 */
export function parseAccrualSchedule(raw: unknown): AccrualPhase[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const result: AccrualPhase[] = [];

  for (const item of raw) {
    const parsed = accrualPhaseSchema.safeParse(item);
    if (parsed.success) {
      result.push(parsed.data);
    } else {
      logger.warn({ item, errors: parsed.error.flatten() }, 'Skipped invalid accrual phase');
    }
  }

  return result;
}

/**
 * Fetches user's active subscriptions and total enrollment balance from DB,
 * then runs the accrual projection.
 */
export async function fetchUserProjection(
  userId: string,
  monthsAhead: number = DEFAULT_MONTHS_AHEAD,
): Promise<ProjectionSummary> {
  const [subscriptions, enrollments] = await Promise.all([
    prisma.clubSubscription.findMany({
      where: { userId },
      include: {
        clubTier: {
          include: {
            program: { select: { name: true } },
          },
        },
      },
    }),
    prisma.programEnrollment.findMany({
      where: { userId },
      select: { currentBalance: true },
    }),
  ]);

  const totalBalance = enrollments.reduce(
    (sum, enrollment) => sum + enrollment.currentBalance,
    0,
  );

  const subscriptionsForProjection: SubscriptionForProjection[] = subscriptions.map(
    (sub) => ({
      startDate: sub.startDate,
      endDate: sub.endDate,
      status: sub.status,
      accrualSchedule: parseAccrualSchedule(sub.accrualSchedule),
      programName: sub.clubTier.program.name,
    }),
  );

  logger.info(
    { userId, subscriptionCount: subscriptionsForProjection.length, totalBalance, monthsAhead },
    'Computing accrual projection',
  );

  return projectAccrual({
    currentBalance: totalBalance,
    subscriptions: subscriptionsForProjection,
    monthsAhead,
  });
}
