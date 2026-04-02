import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { CreateClientInput, UpdateClientInput } from '@/lib/validators/client.schema';

const SALT_ROUNDS = 12;
const DEFAULT_TEMP_PASSWORD = 'ChangeMe123!';

export interface ClientDetail {
  readonly id: string;
  readonly email: string;
  readonly name: string | null;
  readonly createdAt: Date;
  readonly totalMiles: number;
  readonly totalPoints: number;
  readonly enrollmentCount: number;
  readonly activeSubscriptionCount: number;
}

export interface ClientDashboardView {
  readonly client: {
    readonly id: string;
    readonly name: string | null;
    readonly email: string;
  };
  readonly enrollments: ReadonlyArray<{
    readonly id: string;
    readonly currentBalance: number;
    readonly balanceUpdatedAt: Date;
    readonly expirationDate: Date | null;
    readonly tier: string | null;
    readonly program: {
      readonly id: string;
      readonly name: string;
      readonly type: string;
      readonly currency: string;
      readonly website: string | null;
    };
  }>;
  readonly activeSubscriptions: ReadonlyArray<{
    readonly id: string;
    readonly status: string;
    readonly monthlyCost: number;
    readonly nextBillingDate: Date | null;
    readonly clubTier: {
      readonly name: string;
      readonly program: { readonly name: string };
    };
  }>;
  readonly recentTransfers: ReadonlyArray<{
    readonly id: string;
    readonly sourceProgramName: string;
    readonly destProgramName: string;
    readonly pointsTransferred: number;
    readonly bonusPercent: number;
    readonly milesReceived: number;
    readonly transferDate: Date;
  }>;
  readonly totalMiles: number;
  readonly totalPoints: number;
}

export class ClientNotFoundError extends Error {
  constructor(clientId: string) {
    super(`Client not found: ${clientId}`);
    this.name = 'ClientNotFoundError';
  }
}

export class ClientEmailAlreadyExistsError extends Error {
  constructor(email: string) {
    super(`Email already registered: ${email}`);
    this.name = 'ClientEmailAlreadyExistsError';
  }
}

export async function listClients(adminId: string): Promise<ClientDetail[]> {
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
    orderBy: { createdAt: 'desc' },
  });

  return clients.map((client) => {
    const airlineEnrollments = client.programEnrollments.filter(
      (e) => e.program.type === 'AIRLINE',
    );
    const bankingEnrollments = client.programEnrollments.filter(
      (e) => e.program.type === 'BANKING',
    );

    return {
      id: client.id,
      email: client.email,
      name: client.name,
      createdAt: client.createdAt,
      totalMiles: airlineEnrollments.reduce((sum, e) => sum + e.currentBalance, 0),
      totalPoints: bankingEnrollments.reduce((sum, e) => sum + e.currentBalance, 0),
      enrollmentCount: client.programEnrollments.length,
      activeSubscriptionCount: client.clubSubscriptions.length,
    };
  });
}

export async function getClient(adminId: string, clientId: string): Promise<ClientDetail> {
  const client = await prisma.user.findFirst({
    where: { id: clientId, managedById: adminId },
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

  if (!client) {
    throw new ClientNotFoundError(clientId);
  }

  const airlineEnrollments = client.programEnrollments.filter(
    (e) => e.program.type === 'AIRLINE',
  );
  const bankingEnrollments = client.programEnrollments.filter(
    (e) => e.program.type === 'BANKING',
  );

  return {
    id: client.id,
    email: client.email,
    name: client.name,
    createdAt: client.createdAt,
    totalMiles: airlineEnrollments.reduce((sum, e) => sum + e.currentBalance, 0),
    totalPoints: bankingEnrollments.reduce((sum, e) => sum + e.currentBalance, 0),
    enrollmentCount: client.programEnrollments.length,
    activeSubscriptionCount: client.clubSubscriptions.length,
  };
}

export async function createClient(
  adminId: string,
  input: CreateClientInput,
): Promise<ClientDetail> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });

  if (existing) {
    throw new ClientEmailAlreadyExistsError(input.email);
  }

  const rawPassword = input.password ?? DEFAULT_TEMP_PASSWORD;
  const passwordHash = await bcrypt.hash(rawPassword, SALT_ROUNDS);

  const client = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: 'USER',
      managedById: adminId,
    },
  });

  logger.info({ adminId, clientId: client.id }, 'Client created');

  return {
    id: client.id,
    email: client.email,
    name: client.name,
    createdAt: client.createdAt,
    totalMiles: 0,
    totalPoints: 0,
    enrollmentCount: 0,
    activeSubscriptionCount: 0,
  };
}

export async function updateClient(adminId: string, input: UpdateClientInput): Promise<void> {
  const client = await prisma.user.findFirst({
    where: { id: input.clientId, managedById: adminId },
  });

  if (!client) {
    throw new ClientNotFoundError(input.clientId);
  }

  if (input.email && input.email !== client.email) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ClientEmailAlreadyExistsError(input.email);
    }
  }

  await prisma.user.update({
    where: { id: input.clientId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.email !== undefined && { email: input.email }),
    },
  });

  logger.info({ adminId, clientId: input.clientId }, 'Client updated');
}

export async function deleteClient(adminId: string, clientId: string): Promise<void> {
  const client = await prisma.user.findFirst({
    where: { id: clientId, managedById: adminId },
  });

  if (!client) {
    throw new ClientNotFoundError(clientId);
  }

  await prisma.user.delete({ where: { id: clientId } });

  logger.info({ adminId, clientId }, 'Client deleted');
}

export async function getClientDashboardView(
  adminId: string,
  clientId: string,
): Promise<ClientDashboardView> {
  const client = await prisma.user.findFirst({
    where: { id: clientId, managedById: adminId },
    select: { id: true, name: true, email: true },
  });

  if (!client) {
    throw new ClientNotFoundError(clientId);
  }

  const RECENT_TRANSFERS_LIMIT = 5;

  const [enrollments, subscriptions, transfers] = await Promise.all([
    prisma.programEnrollment.findMany({
      where: { userId: clientId },
      include: {
        program: {
          select: { id: true, name: true, type: true, currency: true, website: true },
        },
      },
      orderBy: { currentBalance: 'desc' },
    }),
    prisma.clubSubscription.findMany({
      where: { userId: clientId, status: 'ACTIVE' },
      include: {
        clubTier: {
          include: {
            program: { select: { name: true } },
          },
        },
      },
      orderBy: { nextBillingDate: 'asc' },
    }),
    prisma.transferLog.findMany({
      where: { userId: clientId },
      orderBy: { transferDate: 'desc' },
      take: RECENT_TRANSFERS_LIMIT,
    }),
  ]);

  const totalMiles = enrollments
    .filter((e) => e.program.type === 'AIRLINE')
    .reduce((sum, e) => sum + e.currentBalance, 0);

  const totalPoints = enrollments
    .filter((e) => e.program.type === 'BANKING')
    .reduce((sum, e) => sum + e.currentBalance, 0);

  logger.info({ adminId, clientId }, 'Fetched client dashboard view');

  return {
    client,
    enrollments: enrollments.map((e) => ({
      id: e.id,
      currentBalance: e.currentBalance,
      balanceUpdatedAt: e.balanceUpdatedAt,
      expirationDate: e.expirationDate,
      tier: e.tier,
      program: e.program,
    })),
    activeSubscriptions: subscriptions.map((s) => ({
      id: s.id,
      status: s.status,
      monthlyCost: Number(s.monthlyCost),
      nextBillingDate: s.nextBillingDate,
      clubTier: {
        name: s.clubTier.name,
        program: { name: s.clubTier.program.name },
      },
    })),
    recentTransfers: transfers.map((t) => ({
      id: t.id,
      sourceProgramName: t.sourceProgramName,
      destProgramName: t.destProgramName,
      pointsTransferred: t.pointsTransferred,
      bonusPercent: t.bonusPercent,
      milesReceived: t.milesReceived,
      transferDate: t.transferDate,
    })),
    totalMiles,
    totalPoints,
  };
}
