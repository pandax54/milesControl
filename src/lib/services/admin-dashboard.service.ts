import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

const EXPIRING_SOON_DAYS = 30;
const TOP_CLIENTS_LIMIT = 10;

interface ClientSummary {
  readonly id: string;
  readonly email: string;
  readonly name: string | null;
  readonly totalMiles: number;
  readonly totalPoints: number;
  readonly activeSubscriptionCount: number;
  readonly enrollmentCount: number;
  readonly expiringMiles: number;
}

interface AdminDashboardData {
  readonly totalClients: number;
  readonly totalMilesAggregated: number;
  readonly totalPointsAggregated: number;
  readonly activeSubscriptionCount: number;
  readonly clientsWithExpiringMiles: number;
  readonly topClients: readonly ClientSummary[];
}

export type { ClientSummary, AdminDashboardData };

export async function fetchAdminDashboardData(adminId: string): Promise<AdminDashboardData> {
  const now = new Date();
  const expiryThreshold = new Date(now.getTime() + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000);

  const clients = await prisma.user.findMany({
    where: { managedById: adminId },
    include: {
      programEnrollments: {
        include: {
          program: { select: { type: true } },
        },
      },
      clubSubscriptions: {
        where: { status: 'ACTIVE' },
        select: { id: true },
      },
    },
  });

  const clientSummaries: ClientSummary[] = clients.map((client) => {
    const airlineEnrollments = client.programEnrollments.filter(
      (e) => e.program.type === 'AIRLINE',
    );
    const bankingEnrollments = client.programEnrollments.filter(
      (e) => e.program.type === 'BANKING',
    );

    const totalMiles = airlineEnrollments.reduce((sum, e) => sum + e.currentBalance, 0);
    const totalPoints = bankingEnrollments.reduce((sum, e) => sum + e.currentBalance, 0);

    const expiringMiles = airlineEnrollments
      .filter(
        (e) =>
          e.expirationDate !== null &&
          e.expirationDate <= expiryThreshold &&
          e.currentBalance > 0,
      )
      .reduce((sum, e) => sum + e.currentBalance, 0);

    return {
      id: client.id,
      email: client.email,
      name: client.name,
      totalMiles,
      totalPoints,
      activeSubscriptionCount: client.clubSubscriptions.length,
      enrollmentCount: client.programEnrollments.length,
      expiringMiles,
    };
  });

  const totalMilesAggregated = clientSummaries.reduce((sum, c) => sum + c.totalMiles, 0);
  const totalPointsAggregated = clientSummaries.reduce((sum, c) => sum + c.totalPoints, 0);
  const activeSubscriptionCount = clientSummaries.reduce(
    (sum, c) => sum + c.activeSubscriptionCount,
    0,
  );
  const clientsWithExpiringMiles = clientSummaries.filter((c) => c.expiringMiles > 0).length;

  const topClients = [...clientSummaries]
    .sort((a, b) => b.totalMiles + b.totalPoints - (a.totalMiles + a.totalPoints))
    .slice(0, TOP_CLIENTS_LIMIT);

  logger.info(
    {
      adminId,
      totalClients: clients.length,
      totalMilesAggregated,
      totalPointsAggregated,
      activeSubscriptionCount,
      clientsWithExpiringMiles,
    },
    'Fetched admin dashboard data',
  );

  return {
    totalClients: clients.length,
    totalMilesAggregated,
    totalPointsAggregated,
    activeSubscriptionCount,
    clientsWithExpiringMiles,
    topClients,
  };
}
