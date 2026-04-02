import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ClientNotFoundError } from './client-management.service';

// ==================== Constants ====================

const EXPIRING_SOON_DAYS = 90;
const POINTS_PER_MILHEIRO = 1000;

/**
 * Market baseline cost per milheiro (R$20/k) — the "AVOID" threshold.
 * Savings vs market = (MARKET_RATE - user avg) * total_mileiros.
 * Positive savings means the user acquires miles cheaper than the market baseline.
 */
const MARKET_BASELINE_COST_PER_MILHEIRO = 20;

// ==================== Types ====================

export interface ExpirationItem {
  readonly programName: string;
  readonly balance: number;
  readonly expirationDate: Date;
  readonly daysUntilExpiration: number;
}

export interface ClientReport {
  readonly client: {
    readonly id: string;
    readonly name: string | null;
    readonly email: string;
  };
  readonly totalMiles: number;
  readonly totalPoints: number;
  readonly totalMilesManaged: number;
  readonly avgCostPerMilheiro: number | null;
  readonly marketBaselineCostPerMilheiro: number;
  /** Savings vs market rate. Null when avgCostPerMilheiro is unavailable. */
  readonly savingsVsMarket: number | null;
  readonly totalTransfers: number;
  readonly subscriptionMonthlySpend: number;
  readonly upcomingExpirations: readonly ExpirationItem[];
  readonly reportGeneratedAt: Date;
}

export interface ClientReportSummary {
  readonly clientId: string;
  readonly clientName: string | null;
  readonly clientEmail: string;
  readonly totalMilesManaged: number;
  readonly avgCostPerMilheiro: number | null;
  readonly savingsVsMarket: number | null;
  readonly expirationCount: number;
}

// ==================== Helpers ====================

function computeDaysUntilExpiration(expirationDate: Date, now: Date): number {
  const diffMs = expirationDate.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function computeAvgCostPerMilheiro(
  transfers: ReadonlyArray<{ costPerMilheiro: unknown; milesReceived: number }>,
): number | null {
  const validTransfers = transfers.filter(
    (t) => t.costPerMilheiro !== null && t.costPerMilheiro !== undefined && t.milesReceived > 0,
  );

  if (validTransfers.length === 0) return null;

  // Weighted average by miles received
  const totalMilesWeighted = validTransfers.reduce((sum, t) => sum + t.milesReceived, 0);
  const weightedCostSum = validTransfers.reduce(
    (sum, t) => sum + Number(t.costPerMilheiro) * (t.milesReceived / POINTS_PER_MILHEIRO),
    0,
  );

  const totalMilheiros = totalMilesWeighted / POINTS_PER_MILHEIRO;
  return totalMilheiros > 0 ? weightedCostSum / totalMilheiros : null;
}

function computeSavingsVsMarket(
  avgCostPerMilheiro: number | null,
  totalMiles: number,
): number | null {
  if (avgCostPerMilheiro === null) return null;
  const totalMilheiros = totalMiles / POINTS_PER_MILHEIRO;
  const savings = (MARKET_BASELINE_COST_PER_MILHEIRO - avgCostPerMilheiro) * totalMilheiros;
  return Math.round(savings * 100) / 100;
}

// ==================== Queries ====================

/**
 * Generate a full per-client report for the given client managed by the admin.
 *
 * PRD F5.8: total miles managed, average cost-per-milheiro achieved,
 * savings vs. market rate, upcoming expirations.
 */
export async function generateClientReport(
  adminId: string,
  clientId: string,
): Promise<ClientReport> {
  const client = await prisma.user.findFirst({
    where: { id: clientId, managedById: adminId },
    select: { id: true, name: true, email: true },
  });

  if (!client) {
    throw new ClientNotFoundError(clientId);
  }

  const now = new Date();
  const expiryThreshold = new Date(now.getTime() + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000);

  const [enrollments, transfers, subscriptions] = await Promise.all([
    prisma.programEnrollment.findMany({
      where: { userId: clientId },
      include: { program: { select: { name: true, type: true } } },
    }),
    prisma.transferLog.findMany({
      where: { userId: clientId },
      select: { costPerMilheiro: true, milesReceived: true },
    }),
    prisma.clubSubscription.findMany({
      where: { userId: clientId, status: 'ACTIVE' },
      select: { monthlyCost: true },
    }),
  ]);

  const airlineEnrollments = enrollments.filter((e) => e.program.type === 'AIRLINE');
  const bankingEnrollments = enrollments.filter((e) => e.program.type === 'BANKING');

  const totalMiles = airlineEnrollments.reduce((sum, e) => sum + e.currentBalance, 0);
  const totalPoints = bankingEnrollments.reduce((sum, e) => sum + e.currentBalance, 0);
  const totalMilesManaged = totalMiles + totalPoints;

  const avgCostPerMilheiro = computeAvgCostPerMilheiro(transfers);
  const savingsVsMarket = computeSavingsVsMarket(avgCostPerMilheiro, totalMiles);
  const subscriptionMonthlySpend = subscriptions.reduce((sum, s) => sum + Number(s.monthlyCost), 0);

  const upcomingExpirations: ExpirationItem[] = airlineEnrollments
    .filter(
      (e) =>
        e.expirationDate !== null &&
        e.expirationDate <= expiryThreshold &&
        e.currentBalance > 0,
    )
    .map((e) => ({
      programName: e.program.name,
      balance: e.currentBalance,
      expirationDate: e.expirationDate as Date,
      daysUntilExpiration: computeDaysUntilExpiration(e.expirationDate as Date, now),
    }))
    .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);

  logger.info(
    {
      adminId,
      clientId,
      totalMilesManaged,
      avgCostPerMilheiro,
      savingsVsMarket,
      expirationCount: upcomingExpirations.length,
    },
    'Generated client report',
  );

  return {
    client,
    totalMiles,
    totalPoints,
    totalMilesManaged,
    avgCostPerMilheiro:
      avgCostPerMilheiro !== null ? Math.round(avgCostPerMilheiro * 100) / 100 : null,
    marketBaselineCostPerMilheiro: MARKET_BASELINE_COST_PER_MILHEIRO,
    savingsVsMarket,
    totalTransfers: transfers.length,
    subscriptionMonthlySpend: Math.round(subscriptionMonthlySpend * 100) / 100,
    upcomingExpirations,
    reportGeneratedAt: now,
  };
}

/**
 * List report summaries for all clients managed by the admin.
 * Useful for a quick overview table across all clients.
 */
export async function listClientReportSummaries(
  adminId: string,
): Promise<ClientReportSummary[]> {
  const clients = await prisma.user.findMany({
    where: { managedById: adminId },
    select: {
      id: true,
      name: true,
      email: true,
      programEnrollments: {
        include: { program: { select: { type: true } } },
      },
      transferLogs: {
        select: { costPerMilheiro: true, milesReceived: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const now = new Date();
  const expiryThreshold = new Date(now.getTime() + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000);

  const summaries: ClientReportSummary[] = clients.map((client) => {
    const airlineEnrollments = client.programEnrollments.filter(
      (e) => e.program.type === 'AIRLINE',
    );
    const bankingEnrollments = client.programEnrollments.filter(
      (e) => e.program.type === 'BANKING',
    );

    const totalMiles = airlineEnrollments.reduce((sum, e) => sum + e.currentBalance, 0);
    const totalPoints = bankingEnrollments.reduce((sum, e) => sum + e.currentBalance, 0);
    const totalMilesManaged = totalMiles + totalPoints;

    const avgCostPerMilheiro = computeAvgCostPerMilheiro(client.transferLogs);
    const roundedAvg =
      avgCostPerMilheiro !== null ? Math.round(avgCostPerMilheiro * 100) / 100 : null;
    const savingsVsMarket = computeSavingsVsMarket(roundedAvg, totalMiles);

    const expirationCount = airlineEnrollments.filter(
      (e) =>
        e.expirationDate !== null &&
        e.expirationDate <= expiryThreshold &&
        e.currentBalance > 0,
    ).length;

    return {
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      totalMilesManaged,
      avgCostPerMilheiro: roundedAvg,
      savingsVsMarket,
      expirationCount,
    };
  });

  logger.info({ adminId, clientCount: summaries.length }, 'Listed client report summaries');

  return summaries;
}
