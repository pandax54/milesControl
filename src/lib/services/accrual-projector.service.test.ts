import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    clubSubscription: {
      findMany: vi.fn(),
    },
    programEnrollment: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

import {
  calculateSubscriptionMonth,
  findPhaseForMonth,
  calculateMilesForMonth,
  projectAccrual,
  parseAccrualSchedule,
  fetchUserProjection,
} from './accrual-projector.service';
import type {
  SubscriptionForProjection,
} from './accrual-projector.service';
import type { AccrualPhase } from '@/lib/validators/subscription.schema';
import { prisma } from '@/lib/prisma';

const mockFindManySubscriptions = vi.mocked(prisma.clubSubscription.findMany);
const mockFindManyEnrollments = vi.mocked(prisma.programEnrollment.findMany);

describe('calculateSubscriptionMonth', () => {
  it('should return 1 for the same month as start date', () => {
    const start = new Date(2026, 0, 15); // Jan 2026
    const target = new Date(2026, 0, 20); // Jan 2026

    expect(calculateSubscriptionMonth(start, target)).toBe(1);
  });

  it('should return 2 for one month after start date', () => {
    const start = new Date(2026, 0, 1); // Jan 2026
    const target = new Date(2026, 1, 1); // Feb 2026

    expect(calculateSubscriptionMonth(start, target)).toBe(2);
  });

  it('should return 13 for one year after start date', () => {
    const start = new Date(2025, 0, 1); // Jan 2025
    const target = new Date(2026, 0, 1); // Jan 2026

    expect(calculateSubscriptionMonth(start, target)).toBe(13);
  });

  it('should return 0 for the month before start date', () => {
    const start = new Date(2026, 1, 1); // Feb 2026
    const target = new Date(2026, 0, 1); // Jan 2026

    expect(calculateSubscriptionMonth(start, target)).toBe(0);
  });

  it('should handle year boundaries correctly', () => {
    const start = new Date(2025, 10, 1); // Nov 2025
    const target = new Date(2026, 1, 1); // Feb 2026

    expect(calculateSubscriptionMonth(start, target)).toBe(4);
  });
});

describe('findPhaseForMonth', () => {
  it('should find the correct phase for a single-phase schedule', () => {
    const phases: AccrualPhase[] = [
      { fromMonth: 1, toMonth: null, milesPerMonth: 2000 },
    ];

    expect(findPhaseForMonth(phases, 1)).toEqual(phases[0]);
    expect(findPhaseForMonth(phases, 100)).toEqual(phases[0]);
  });

  it('should find the correct phase in a multi-phase schedule', () => {
    const phases: AccrualPhase[] = [
      { fromMonth: 1, toMonth: 6, milesPerMonth: 2000 },
      { fromMonth: 7, toMonth: null, milesPerMonth: 1000 },
    ];

    expect(findPhaseForMonth(phases, 1)).toEqual(phases[0]);
    expect(findPhaseForMonth(phases, 6)).toEqual(phases[0]);
    expect(findPhaseForMonth(phases, 7)).toEqual(phases[1]);
    expect(findPhaseForMonth(phases, 24)).toEqual(phases[1]);
  });

  it('should return null when no phase covers the month', () => {
    const phases: AccrualPhase[] = [
      { fromMonth: 1, toMonth: 6, milesPerMonth: 2000 },
    ];

    expect(findPhaseForMonth(phases, 7)).toBeNull();
  });

  it('should return null for empty phases array', () => {
    expect(findPhaseForMonth([], 1)).toBeNull();
  });

  it('should handle three-phase schedule', () => {
    const phases: AccrualPhase[] = [
      { fromMonth: 1, toMonth: 1, milesPerMonth: 5000 },
      { fromMonth: 2, toMonth: 6, milesPerMonth: 2000 },
      { fromMonth: 7, toMonth: null, milesPerMonth: 1000 },
    ];

    expect(findPhaseForMonth(phases, 1)?.milesPerMonth).toBe(5000);
    expect(findPhaseForMonth(phases, 3)?.milesPerMonth).toBe(2000);
    expect(findPhaseForMonth(phases, 12)?.milesPerMonth).toBe(1000);
  });
});

describe('calculateMilesForMonth', () => {
  const baseSubscription: SubscriptionForProjection = {
    startDate: new Date(2026, 0, 1), // Jan 2026
    endDate: null,
    status: 'ACTIVE',
    accrualSchedule: [{ fromMonth: 1, toMonth: null, milesPerMonth: 2000 }],
    programName: 'Smiles',
  };

  it('should return miles for an active subscription', () => {
    const target = new Date(2026, 2, 1); // Mar 2026

    expect(calculateMilesForMonth(baseSubscription, target)).toBe(2000);
  });

  it('should return 0 for a cancelled subscription', () => {
    const subscription: SubscriptionForProjection = {
      ...baseSubscription,
      status: 'CANCELLED',
    };

    expect(calculateMilesForMonth(subscription, new Date(2026, 2, 1))).toBe(0);
  });

  it('should return 0 for a paused subscription', () => {
    const subscription: SubscriptionForProjection = {
      ...baseSubscription,
      status: 'PAUSED',
    };

    expect(calculateMilesForMonth(subscription, new Date(2026, 2, 1))).toBe(0);
  });

  it('should return 0 for an expired subscription', () => {
    const subscription: SubscriptionForProjection = {
      ...baseSubscription,
      status: 'EXPIRED',
    };

    expect(calculateMilesForMonth(subscription, new Date(2026, 2, 1))).toBe(0);
  });

  it('should return 0 when target date is after end date', () => {
    const subscription: SubscriptionForProjection = {
      ...baseSubscription,
      endDate: new Date(2026, 5, 30), // Jun 2026
    };

    expect(calculateMilesForMonth(subscription, new Date(2026, 6, 1))).toBe(0);
  });

  it('should return miles when target date is before end date', () => {
    const subscription: SubscriptionForProjection = {
      ...baseSubscription,
      endDate: new Date(2026, 11, 31), // Dec 2026
    };

    expect(calculateMilesForMonth(subscription, new Date(2026, 5, 1))).toBe(2000);
  });

  it('should return 0 for target before subscription start', () => {
    expect(calculateMilesForMonth(baseSubscription, new Date(2025, 11, 1))).toBe(0);
  });

  it('should use correct phase for multi-phase schedule', () => {
    const subscription: SubscriptionForProjection = {
      ...baseSubscription,
      accrualSchedule: [
        { fromMonth: 1, toMonth: 6, milesPerMonth: 2000 },
        { fromMonth: 7, toMonth: null, milesPerMonth: 1000 },
      ],
    };

    // Month 3 of subscription (Mar 2026) → phase 1 → 2000
    expect(calculateMilesForMonth(subscription, new Date(2026, 2, 1))).toBe(2000);

    // Month 8 of subscription (Aug 2026) → phase 2 → 1000
    expect(calculateMilesForMonth(subscription, new Date(2026, 7, 1))).toBe(1000);
  });
});

describe('projectAccrual', () => {
  const referenceDate = new Date(2026, 0, 15); // Jan 15, 2026

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(referenceDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should project zero miles with no subscriptions', () => {
    const result = projectAccrual({
      currentBalance: 10000,
      subscriptions: [],
      monthsAhead: 3,
      referenceDate,
    });

    expect(result.totalProjectedMiles).toBe(0);
    expect(result.balanceAt3Months).toBe(10000);
    expect(result.months).toHaveLength(3);
    expect(result.months[0].milesThisMonth).toBe(0);
  });

  it('should project miles for a single active subscription', () => {
    const result = projectAccrual({
      currentBalance: 5000,
      subscriptions: [
        {
          startDate: new Date(2025, 6, 1), // Jul 2025
          endDate: null,
          status: 'ACTIVE',
          accrualSchedule: [{ fromMonth: 1, toMonth: null, milesPerMonth: 2000 }],
          programName: 'Smiles',
        },
      ],
      monthsAhead: 3,
      referenceDate,
    });

    expect(result.months).toHaveLength(3);
    expect(result.months[0].milesThisMonth).toBe(2000);
    expect(result.months[0].cumulativeMiles).toBe(2000);
    expect(result.months[0].totalBalance).toBe(7000);
    expect(result.months[1].totalBalance).toBe(9000);
    expect(result.months[2].totalBalance).toBe(11000);
    expect(result.totalProjectedMiles).toBe(6000);
    expect(result.balanceAt3Months).toBe(11000);
  });

  it('should project miles for multiple subscriptions', () => {
    const result = projectAccrual({
      currentBalance: 0,
      subscriptions: [
        {
          startDate: new Date(2025, 0, 1),
          endDate: null,
          status: 'ACTIVE',
          accrualSchedule: [{ fromMonth: 1, toMonth: null, milesPerMonth: 2000 }],
          programName: 'Smiles',
        },
        {
          startDate: new Date(2025, 0, 1),
          endDate: null,
          status: 'ACTIVE',
          accrualSchedule: [{ fromMonth: 1, toMonth: null, milesPerMonth: 500 }],
          programName: 'Livelo',
        },
      ],
      monthsAhead: 3,
      referenceDate,
    });

    expect(result.months[0].milesThisMonth).toBe(2500);
    expect(result.months[0].breakdown).toEqual([
      { programName: 'Smiles', miles: 2000 },
      { programName: 'Livelo', miles: 500 },
    ]);
    expect(result.totalProjectedMiles).toBe(7500);
  });

  it('should skip cancelled subscriptions', () => {
    const result = projectAccrual({
      currentBalance: 0,
      subscriptions: [
        {
          startDate: new Date(2025, 0, 1),
          endDate: null,
          status: 'ACTIVE',
          accrualSchedule: [{ fromMonth: 1, toMonth: null, milesPerMonth: 2000 }],
          programName: 'Smiles',
        },
        {
          startDate: new Date(2025, 0, 1),
          endDate: null,
          status: 'CANCELLED',
          accrualSchedule: [{ fromMonth: 1, toMonth: null, milesPerMonth: 1000 }],
          programName: 'Livelo',
        },
      ],
      monthsAhead: 1,
      referenceDate,
    });

    expect(result.months[0].milesThisMonth).toBe(2000);
    expect(result.months[0].breakdown).toHaveLength(1);
  });

  it('should handle multi-phase accrual schedule correctly', () => {
    // Subscription started Jan 2026, phase 1: months 1-6 = 2000, phase 2: 7+ = 1000
    const result = projectAccrual({
      currentBalance: 0,
      subscriptions: [
        {
          startDate: new Date(2026, 0, 1), // Jan 2026
          endDate: null,
          status: 'ACTIVE',
          accrualSchedule: [
            { fromMonth: 1, toMonth: 6, milesPerMonth: 2000 },
            { fromMonth: 7, toMonth: null, milesPerMonth: 1000 },
          ],
          programName: 'Smiles',
        },
      ],
      monthsAhead: 12,
      referenceDate,
    });

    // Months 1-5 from reference (Feb-Jun 2026 = sub months 2-6) → 2000 each
    for (let i = 0; i < 5; i++) {
      expect(result.months[i].milesThisMonth).toBe(2000);
    }
    // Months 6-12 from reference (Jul 2026+ = sub months 7+) → 1000 each
    for (let i = 5; i < 12; i++) {
      expect(result.months[i].milesThisMonth).toBe(1000);
    }

    // 5 * 2000 + 7 * 1000 = 17000
    expect(result.totalProjectedMiles).toBe(17000);
  });

  it('should stop accruing after subscription end date', () => {
    const result = projectAccrual({
      currentBalance: 0,
      subscriptions: [
        {
          startDate: new Date(2025, 0, 1),
          endDate: new Date(2026, 2, 31), // Ends Mar 2026
          status: 'ACTIVE',
          accrualSchedule: [{ fromMonth: 1, toMonth: null, milesPerMonth: 2000 }],
          programName: 'Smiles',
        },
      ],
      monthsAhead: 6,
      referenceDate,
    });

    // Feb 2026 (sub month 14) → 2000, Mar 2026 (sub month 15) → 2000
    expect(result.months[0].milesThisMonth).toBe(2000);
    expect(result.months[1].milesThisMonth).toBe(2000);
    // Apr 2026 → after end date → 0
    expect(result.months[2].milesThisMonth).toBe(0);
    expect(result.months[3].milesThisMonth).toBe(0);

    expect(result.totalProjectedMiles).toBe(4000);
  });

  it('should provide correct balance summaries at 3/6/12 months', () => {
    const result = projectAccrual({
      currentBalance: 10000,
      subscriptions: [
        {
          startDate: new Date(2025, 0, 1),
          endDate: null,
          status: 'ACTIVE',
          accrualSchedule: [{ fromMonth: 1, toMonth: null, milesPerMonth: 1000 }],
          programName: 'Smiles',
        },
      ],
      monthsAhead: 12,
      referenceDate,
    });

    expect(result.balanceAt3Months).toBe(13000); // 10000 + 3*1000
    expect(result.balanceAt6Months).toBe(16000); // 10000 + 6*1000
    expect(result.balanceAt12Months).toBe(22000); // 10000 + 12*1000
  });

  it('should return currentBalance for summary months beyond projection range', () => {
    const result = projectAccrual({
      currentBalance: 5000,
      subscriptions: [],
      monthsAhead: 2,
      referenceDate,
    });

    expect(result.balanceAt3Months).toBe(5000);
    expect(result.balanceAt6Months).toBe(5000);
    expect(result.balanceAt12Months).toBe(5000);
  });

  it('should use current date when referenceDate is not provided', () => {
    const result = projectAccrual({
      currentBalance: 0,
      subscriptions: [
        {
          startDate: new Date(2025, 0, 1),
          endDate: null,
          status: 'ACTIVE',
          accrualSchedule: [{ fromMonth: 1, toMonth: null, milesPerMonth: 1000 }],
          programName: 'Smiles',
        },
      ],
      monthsAhead: 1,
    });

    // Should still work — uses faked system time (Jan 15 2026)
    expect(result.months).toHaveLength(1);
    expect(result.months[0].milesThisMonth).toBe(1000);
  });

  it('should handle subscription that starts in the future', () => {
    const result = projectAccrual({
      currentBalance: 0,
      subscriptions: [
        {
          startDate: new Date(2026, 5, 1), // Jun 2026 — starts in the future
          endDate: null,
          status: 'ACTIVE',
          accrualSchedule: [{ fromMonth: 1, toMonth: null, milesPerMonth: 2000 }],
          programName: 'Smiles',
        },
      ],
      monthsAhead: 12,
      referenceDate,
    });

    // Feb-May 2026 (months 1-4): before subscription starts → 0
    for (let i = 0; i < 4; i++) {
      expect(result.months[i].milesThisMonth).toBe(0);
    }
    // Jun 2026+ (months 5+): subscription month 1+ → 2000
    for (let i = 4; i < 12; i++) {
      expect(result.months[i].milesThisMonth).toBe(2000);
    }

    expect(result.totalProjectedMiles).toBe(16000); // 8 * 2000
  });

  it('should handle bonus first month scenario', () => {
    // Clube Smiles promo: 20k first month, then 2k/month
    const result = projectAccrual({
      currentBalance: 0,
      subscriptions: [
        {
          startDate: new Date(2026, 0, 1), // Jan 2026
          endDate: null,
          status: 'ACTIVE',
          accrualSchedule: [
            { fromMonth: 1, toMonth: 1, milesPerMonth: 20000 },
            { fromMonth: 2, toMonth: null, milesPerMonth: 2000 },
          ],
          programName: 'Smiles',
        },
      ],
      monthsAhead: 3,
      referenceDate,
    });

    // Month 1 from ref = Feb 2026 = sub month 2 → 2000
    expect(result.months[0].milesThisMonth).toBe(2000);
    expect(result.months[1].milesThisMonth).toBe(2000);
    expect(result.months[2].milesThisMonth).toBe(2000);
    expect(result.totalProjectedMiles).toBe(6000);
  });

  it('should include correct dates in projection months', () => {
    const result = projectAccrual({
      currentBalance: 0,
      subscriptions: [],
      monthsAhead: 3,
      referenceDate: new Date(2026, 0, 15), // Jan 15
    });

    expect(result.months[0].date).toEqual(new Date(2026, 1, 1)); // Feb 1
    expect(result.months[1].date).toEqual(new Date(2026, 2, 1)); // Mar 1
    expect(result.months[2].date).toEqual(new Date(2026, 3, 1)); // Apr 1
  });
});

describe('parseAccrualSchedule', () => {
  it('should parse valid accrual phases', () => {
    const raw = [
      { fromMonth: 1, toMonth: 6, milesPerMonth: 2000 },
      { fromMonth: 7, toMonth: null, milesPerMonth: 1000 },
    ];

    const result = parseAccrualSchedule(raw);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ fromMonth: 1, toMonth: 6, milesPerMonth: 2000 });
    expect(result[1]).toEqual({ fromMonth: 7, toMonth: null, milesPerMonth: 1000 });
  });

  it('should return empty array for non-array input', () => {
    expect(parseAccrualSchedule(null)).toEqual([]);
    expect(parseAccrualSchedule(undefined)).toEqual([]);
    expect(parseAccrualSchedule('string')).toEqual([]);
    expect(parseAccrualSchedule(42)).toEqual([]);
    expect(parseAccrualSchedule({})).toEqual([]);
  });

  it('should skip invalid phases and keep valid ones', () => {
    const raw = [
      { fromMonth: 1, toMonth: null, milesPerMonth: 2000 },
      { fromMonth: -1, toMonth: null, milesPerMonth: 500 }, // invalid: negative fromMonth
      { fromMonth: 'abc' }, // invalid: wrong types
    ];

    const result = parseAccrualSchedule(raw);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ fromMonth: 1, toMonth: null, milesPerMonth: 2000 });
  });

  it('should return empty array for empty array input', () => {
    expect(parseAccrualSchedule([])).toEqual([]);
  });
});

describe('fetchUserProjection', () => {
  function buildMockSubscription(overrides: {
    status?: string;
    startDate?: Date;
    endDate?: Date | null;
    accrualSchedule?: unknown;
    programName?: string;
  }) {
    return {
      id: 'sub-1',
      userId: 'user-1',
      clubTierId: 'tier-1',
      status: overrides.status ?? 'ACTIVE',
      startDate: overrides.startDate ?? new Date(2025, 6, 1),
      endDate: overrides.endDate ?? null,
      monthlyCost: 29.9,
      accrualSchedule: overrides.accrualSchedule ?? [{ fromMonth: 1, toMonth: null, milesPerMonth: 2000 }],
      totalMilesAccrued: 0,
      nextBillingDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      clubTier: {
        id: 'tier-1',
        programId: 'prog-1',
        name: 'Clube Smiles 2.000',
        monthlyPrice: 29.9,
        baseMonthlyMiles: 2000,
        minimumStayMonths: 12,
        benefits: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        program: { name: overrides.programName ?? 'Smiles' },
      },
    };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should return projection with zero miles when user has no subscriptions or enrollments', async () => {
    mockFindManySubscriptions.mockResolvedValue([] as never);
    mockFindManyEnrollments.mockResolvedValue([] as never);

    const result = await fetchUserProjection('user-1');

    expect(result.totalProjectedMiles).toBe(0);
    expect(result.balanceAt3Months).toBe(0);
    expect(result.balanceAt6Months).toBe(0);
    expect(result.balanceAt12Months).toBe(0);
    expect(result.months).toHaveLength(12);
  });

  it('should calculate projection from DB subscriptions and enrollments', async () => {
    mockFindManySubscriptions.mockResolvedValue([
      buildMockSubscription({}),
    ] as never);

    mockFindManyEnrollments.mockResolvedValue([
      { currentBalance: 5000 },
      { currentBalance: 3000 },
    ] as never);

    const result = await fetchUserProjection('user-1');

    // Total balance = 5000 + 3000 = 8000, each month accrues 2000
    expect(result.months).toHaveLength(12);
    expect(result.months[0].milesThisMonth).toBe(2000);
    expect(result.months[0].totalBalance).toBe(10000);
    expect(result.balanceAt3Months).toBe(14000);
    expect(result.balanceAt12Months).toBe(32000);
    expect(result.totalProjectedMiles).toBe(24000);
  });

  it('should use custom monthsAhead parameter', async () => {
    mockFindManySubscriptions.mockResolvedValue([] as never);
    mockFindManyEnrollments.mockResolvedValue([] as never);

    const result = await fetchUserProjection('user-1', 6);

    expect(result.months).toHaveLength(6);
  });

  it('should handle subscriptions with invalid accrual schedule gracefully', async () => {
    mockFindManySubscriptions.mockResolvedValue([
      buildMockSubscription({ accrualSchedule: 'not-an-array' }),
    ] as never);

    mockFindManyEnrollments.mockResolvedValue([
      { currentBalance: 1000 },
    ] as never);

    const result = await fetchUserProjection('user-1');

    expect(result.totalProjectedMiles).toBe(0);
    expect(result.balanceAt3Months).toBe(1000);
  });

  it('should skip cancelled subscriptions in projection', async () => {
    mockFindManySubscriptions.mockResolvedValue([
      buildMockSubscription({ status: 'CANCELLED', endDate: new Date(2026, 0, 1) }),
    ] as never);

    mockFindManyEnrollments.mockResolvedValue([
      { currentBalance: 5000 },
    ] as never);

    const result = await fetchUserProjection('user-1');

    expect(result.totalProjectedMiles).toBe(0);
    expect(result.balanceAt12Months).toBe(5000);
  });
});
