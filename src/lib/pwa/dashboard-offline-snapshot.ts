import { z } from 'zod';
import type { DashboardData } from '@/lib/services/dashboard.service';

export const DASHBOARD_OFFLINE_SNAPSHOT_STORAGE_KEY = 'milescontrol.dashboard-offline-snapshot';

const dashboardOfflineEnrollmentSchema = z.object({
  id: z.string(),
  currentBalance: z.number().int(),
  balanceUpdatedAt: z.string().datetime(),
  expirationDate: z.string().datetime().nullable(),
  tier: z.string().nullable(),
  stalenessLevel: z.union([z.literal('fresh'), z.literal('warning'), z.literal('stale')]),
  program: z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    currency: z.string(),
    logoUrl: z.string().nullable(),
    website: z.string().nullable(),
  }),
});

const dashboardOfflineSubscriptionSchema = z.object({
  id: z.string(),
  status: z.string(),
  monthlyCost: z.number(),
  nextBillingDate: z.string().datetime().nullable(),
  clubTier: z.object({
    name: z.string(),
    program: z.object({
      name: z.string(),
      currency: z.string(),
    }),
  }),
});

const dashboardOfflineTransferSchema = z.object({
  id: z.string(),
  sourceProgramName: z.string(),
  destProgramName: z.string(),
  pointsTransferred: z.number().int(),
  bonusPercent: z.number(),
  milesReceived: z.number().int(),
  totalCost: z.number().nullable(),
  costPerMilheiro: z.number().nullable(),
  transferDate: z.string().datetime(),
});

const dashboardOfflineProjectionSchema = z.object({
  totalProjectedMiles: z.number().int(),
  balanceAt3Months: z.number().int(),
  balanceAt6Months: z.number().int(),
  balanceAt12Months: z.number().int(),
});

export const dashboardOfflineSnapshotSchema = z.object({
  capturedAt: z.string().datetime(),
  totalMiles: z.number().int(),
  totalPoints: z.number().int(),
  activeSubscriptionCount: z.number().int(),
  staleEnrollmentCount: z.number().int(),
  enrollments: z.array(dashboardOfflineEnrollmentSchema),
  subscriptions: z.array(dashboardOfflineSubscriptionSchema),
  transfers: z.array(dashboardOfflineTransferSchema),
  projection: dashboardOfflineProjectionSchema,
});

export type DashboardOfflineSnapshot = z.infer<typeof dashboardOfflineSnapshotSchema>;

export function createDashboardOfflineSnapshot(
  data: DashboardData,
  capturedAt: Date = new Date(),
): DashboardOfflineSnapshot {
  return {
    capturedAt: capturedAt.toISOString(),
    totalMiles: data.totalMiles,
    totalPoints: data.totalPoints,
    activeSubscriptionCount: data.activeSubscriptionCount,
    staleEnrollmentCount: data.staleEnrollmentCount,
    enrollments: data.enrollments.map((enrollment) => ({
      id: enrollment.id,
      currentBalance: enrollment.currentBalance,
      balanceUpdatedAt: enrollment.balanceUpdatedAt.toISOString(),
      expirationDate: enrollment.expirationDate?.toISOString() ?? null,
      tier: enrollment.tier,
      stalenessLevel: enrollment.stalenessLevel,
      program: {
        id: enrollment.program.id,
        name: enrollment.program.name,
        type: enrollment.program.type,
        currency: enrollment.program.currency,
        logoUrl: enrollment.program.logoUrl,
        website: enrollment.program.website,
      },
    })),
    subscriptions: data.activeSubscriptions.map((subscription) => ({
      id: subscription.id,
      status: subscription.status,
      monthlyCost: subscription.monthlyCost,
      nextBillingDate: subscription.nextBillingDate?.toISOString() ?? null,
      clubTier: {
        name: subscription.clubTier.name,
        program: {
          name: subscription.clubTier.program.name,
          currency: subscription.clubTier.program.currency,
        },
      },
    })),
    transfers: data.recentTransfers.map((transfer) => ({
      id: transfer.id,
      sourceProgramName: transfer.sourceProgramName,
      destProgramName: transfer.destProgramName,
      pointsTransferred: transfer.pointsTransferred,
      bonusPercent: transfer.bonusPercent,
      milesReceived: transfer.milesReceived,
      totalCost: transfer.totalCost,
      costPerMilheiro: transfer.costPerMilheiro,
      transferDate: transfer.transferDate.toISOString(),
    })),
    projection: {
      totalProjectedMiles: data.projection.totalProjectedMiles,
      balanceAt3Months: data.projection.balanceAt3Months,
      balanceAt6Months: data.projection.balanceAt6Months,
      balanceAt12Months: data.projection.balanceAt12Months,
    },
  };
}

export function serializeDashboardOfflineSnapshot(snapshot: DashboardOfflineSnapshot): string {
  return JSON.stringify(snapshot);
}

export function parseDashboardOfflineSnapshot(
  value: string | null | undefined,
): DashboardOfflineSnapshot | null {
  if (!value) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(value) as unknown;
    const result = dashboardOfflineSnapshotSchema.safeParse(parsedValue);

    if (!result.success) {
      return null;
    }

    return result.data;
  } catch {
    return null;
  }
}
