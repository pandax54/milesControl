import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { fetchUserProjection, type ProjectionSummary } from './accrual-projector.service';

const STALENESS_FRESH_DAYS = 7;
const STALENESS_WARNING_DAYS = 30;
const RECENT_TRANSFERS_LIMIT = 5;

type StalenessLevel = 'fresh' | 'warning' | 'stale';

interface EnrollmentSummary {
  readonly id: string;
  readonly currentBalance: number;
  readonly balanceUpdatedAt: Date;
  readonly expirationDate: Date | null;
  readonly tier: string | null;
  readonly memberNumber: string | null;
  readonly stalenessLevel: StalenessLevel;
  readonly program: {
    readonly id: string;
    readonly name: string;
    readonly type: string;
    readonly currency: string;
    readonly website: string | null;
  };
}

interface SubscriptionSummary {
  readonly id: string;
  readonly status: string;
  readonly monthlyCost: number;
  readonly nextBillingDate: Date | null;
  readonly clubTier: {
    readonly name: string;
    readonly program: {
      readonly name: string;
      readonly currency: string;
    };
  };
}

interface TransferSummary {
  readonly id: string;
  readonly sourceProgramName: string;
  readonly destProgramName: string;
  readonly pointsTransferred: number;
  readonly bonusPercent: number;
  readonly milesReceived: number;
  readonly totalCost: number | null;
  readonly costPerMilheiro: number | null;
  readonly transferDate: Date;
}

interface DashboardData {
  readonly totalMiles: number;
  readonly totalPoints: number;
  readonly activeSubscriptionCount: number;
  readonly staleEnrollmentCount: number;
  readonly enrollments: readonly EnrollmentSummary[];
  readonly activeSubscriptions: readonly SubscriptionSummary[];
  readonly recentTransfers: readonly TransferSummary[];
  readonly projection: ProjectionSummary;
}

export type {
  StalenessLevel,
  EnrollmentSummary,
  SubscriptionSummary,
  TransferSummary,
  DashboardData,
};

export function classifyStaleness(updatedAt: Date, now: Date = new Date()): StalenessLevel {
  const diffMs = now.getTime() - updatedAt.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < STALENESS_FRESH_DAYS) return 'fresh';
  if (diffDays < STALENESS_WARNING_DAYS) return 'warning';
  return 'stale';
}

export async function fetchDashboardData(userId: string): Promise<DashboardData> {
  const [enrollments, subscriptions, transfers, projection] = await Promise.all([
    prisma.programEnrollment.findMany({
      where: { userId },
      include: {
        program: {
          select: { id: true, name: true, type: true, currency: true, website: true },
        },
      },
      orderBy: { currentBalance: 'desc' },
    }),
    prisma.clubSubscription.findMany({
      where: { userId, status: 'ACTIVE' },
      include: {
        clubTier: {
          include: {
            program: { select: { name: true, currency: true } },
          },
        },
      },
      orderBy: { nextBillingDate: 'asc' },
    }),
    prisma.transferLog.findMany({
      where: { userId },
      orderBy: { transferDate: 'desc' },
      take: RECENT_TRANSFERS_LIMIT,
    }),
    fetchUserProjection(userId),
  ]);

  const now = new Date();

  const enrichedEnrollments: EnrollmentSummary[] = enrollments.map((e) => ({
    id: e.id,
    currentBalance: e.currentBalance,
    balanceUpdatedAt: e.balanceUpdatedAt,
    expirationDate: e.expirationDate,
    tier: e.tier,
    memberNumber: e.memberNumber,
    stalenessLevel: classifyStaleness(e.balanceUpdatedAt, now),
    program: e.program,
  }));

  const enrichedSubscriptions: SubscriptionSummary[] = subscriptions.map((s) => ({
    id: s.id,
    status: s.status,
    monthlyCost: Number(s.monthlyCost),
    nextBillingDate: s.nextBillingDate,
    clubTier: {
      name: s.clubTier.name,
      program: s.clubTier.program,
    },
  }));

  const enrichedTransfers: TransferSummary[] = transfers.map((t) => ({
    id: t.id,
    sourceProgramName: t.sourceProgramName,
    destProgramName: t.destProgramName,
    pointsTransferred: t.pointsTransferred,
    bonusPercent: t.bonusPercent,
    milesReceived: t.milesReceived,
    totalCost: t.totalCost ? Number(t.totalCost) : null,
    costPerMilheiro: t.costPerMilheiro ? Number(t.costPerMilheiro) : null,
    transferDate: t.transferDate,
  }));

  const totalMiles = enrichedEnrollments
    .filter((e) => e.program.type === 'AIRLINE')
    .reduce((sum, e) => sum + e.currentBalance, 0);

  const totalPoints = enrichedEnrollments
    .filter((e) => e.program.type === 'BANKING')
    .reduce((sum, e) => sum + e.currentBalance, 0);

  const staleEnrollmentCount = enrichedEnrollments.filter(
    (e) => e.stalenessLevel === 'stale',
  ).length;

  logger.info(
    {
      userId,
      enrollmentCount: enrichedEnrollments.length,
      activeSubscriptionCount: enrichedSubscriptions.length,
      transferCount: enrichedTransfers.length,
      staleEnrollmentCount,
    },
    'Fetched dashboard data',
  );

  return {
    totalMiles,
    totalPoints,
    activeSubscriptionCount: enrichedSubscriptions.length,
    staleEnrollmentCount,
    enrollments: enrichedEnrollments,
    activeSubscriptions: enrichedSubscriptions,
    recentTransfers: enrichedTransfers,
    projection,
  };
}
