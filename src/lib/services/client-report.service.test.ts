import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    programEnrollment: {
      findMany: vi.fn(),
    },
    transferLog: {
      findMany: vi.fn(),
    },
    clubSubscription: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { prisma } from '@/lib/prisma';
import { generateClientReport, listClientReportSummaries } from './client-report.service';
import { ClientNotFoundError } from './client-management.service';

const mockUserFindFirst = vi.mocked(prisma.user.findFirst);
const mockUserFindMany = vi.mocked(prisma.user.findMany);
const mockEnrollmentFindMany = vi.mocked(prisma.programEnrollment.findMany);
const mockTransferFindMany = vi.mocked(prisma.transferLog.findMany);
const mockSubscriptionFindMany = vi.mocked(prisma.clubSubscription.findMany);

const MOCK_ADMIN_ID = 'admin-1';
const MOCK_CLIENT_ID = 'client-1';

const MOCK_CLIENT = {
  id: MOCK_CLIENT_ID,
  name: 'Ana Oliveira',
  email: 'ana@example.com',
};

// ==================== Helpers ====================

function buildEnrollment(overrides: {
  id?: string;
  currentBalance?: number;
  type?: string;
  expirationDate?: Date | null;
  programName?: string;
}) {
  return {
    id: overrides.id ?? 'enr-1',
    userId: MOCK_CLIENT_ID,
    programId: 'prog-1',
    memberNumber: null,
    currentBalance: overrides.currentBalance ?? 10000,
    tier: null,
    balanceUpdatedAt: new Date(),
    expirationDate: overrides.expirationDate ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
    program: {
      name: overrides.programName ?? 'Smiles',
      type: overrides.type ?? 'AIRLINE',
    },
  };
}

function buildTransfer(overrides: {
  costPerMilheiro?: number | null;
  milesReceived?: number;
}) {
  return {
    costPerMilheiro: overrides.costPerMilheiro ?? null,
    milesReceived: overrides.milesReceived ?? 10000,
  };
}

function buildSubscription(monthlyCost: number) {
  return { monthlyCost };
}

type EnrollmentFindManyResult = Awaited<ReturnType<typeof mockEnrollmentFindMany>>;
type TransferFindManyResult = Awaited<ReturnType<typeof mockTransferFindMany>>;
type SubscriptionFindManyResult = Awaited<ReturnType<typeof mockSubscriptionFindMany>>;
type UserFindFirstResult = Awaited<ReturnType<typeof mockUserFindFirst>>;
type UserFindManyResult = Awaited<ReturnType<typeof mockUserFindMany>>;

// ==================== generateClientReport ====================

describe('generateClientReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw ClientNotFoundError when client is not managed by admin', async () => {
    mockUserFindFirst.mockResolvedValue(null as unknown as UserFindFirstResult);

    await expect(generateClientReport(MOCK_ADMIN_ID, MOCK_CLIENT_ID)).rejects.toThrow(
      ClientNotFoundError,
    );
  });

  it('should return zero miles and null avgCost when client has no data', async () => {
    mockUserFindFirst.mockResolvedValue(MOCK_CLIENT as unknown as UserFindFirstResult);
    mockEnrollmentFindMany.mockResolvedValue([] as unknown as EnrollmentFindManyResult);
    mockTransferFindMany.mockResolvedValue([] as unknown as TransferFindManyResult);
    mockSubscriptionFindMany.mockResolvedValue([] as unknown as SubscriptionFindManyResult);

    const report = await generateClientReport(MOCK_ADMIN_ID, MOCK_CLIENT_ID);

    expect(report.totalMiles).toBe(0);
    expect(report.totalPoints).toBe(0);
    expect(report.totalMilesManaged).toBe(0);
    expect(report.avgCostPerMilheiro).toBeNull();
    expect(report.savingsVsMarket).toBeNull();
    expect(report.totalTransfers).toBe(0);
    expect(report.upcomingExpirations).toHaveLength(0);
    expect(report.subscriptionMonthlySpend).toBe(0);
  });

  it('should correctly separate airline miles from banking points', async () => {
    mockUserFindFirst.mockResolvedValue(MOCK_CLIENT as unknown as UserFindFirstResult);
    mockEnrollmentFindMany.mockResolvedValue([
      buildEnrollment({ id: 'enr-1', currentBalance: 40000, type: 'AIRLINE' }),
      buildEnrollment({ id: 'enr-2', currentBalance: 15000, type: 'BANKING' }),
    ] as unknown as EnrollmentFindManyResult);
    mockTransferFindMany.mockResolvedValue([] as unknown as TransferFindManyResult);
    mockSubscriptionFindMany.mockResolvedValue([] as unknown as SubscriptionFindManyResult);

    const report = await generateClientReport(MOCK_ADMIN_ID, MOCK_CLIENT_ID);

    expect(report.totalMiles).toBe(40000);
    expect(report.totalPoints).toBe(15000);
    expect(report.totalMilesManaged).toBe(55000);
  });

  it('should compute weighted average cost per milheiro from transfer logs', async () => {
    mockUserFindFirst.mockResolvedValue(MOCK_CLIENT as unknown as UserFindFirstResult);
    mockEnrollmentFindMany.mockResolvedValue([] as unknown as EnrollmentFindManyResult);
    mockTransferFindMany.mockResolvedValue([
      // 10,000 miles at R$10/k = R$100 total cost
      buildTransfer({ costPerMilheiro: 10, milesReceived: 10000 }),
      // 20,000 miles at R$20/k = R$400 total cost
      buildTransfer({ costPerMilheiro: 20, milesReceived: 20000 }),
    ] as unknown as TransferFindManyResult);
    mockSubscriptionFindMany.mockResolvedValue([] as unknown as SubscriptionFindManyResult);

    const report = await generateClientReport(MOCK_ADMIN_ID, MOCK_CLIENT_ID);

    // Weighted avg: (10*10 + 20*20) / (10+20) mileiros = (100+400)/30 = 500/30 ≈ 16.67
    expect(report.avgCostPerMilheiro).toBeCloseTo(16.67, 1);
    expect(report.totalTransfers).toBe(2);
  });

  it('should return null avgCostPerMilheiro when all transfers lack cost data', async () => {
    mockUserFindFirst.mockResolvedValue(MOCK_CLIENT as unknown as UserFindFirstResult);
    mockEnrollmentFindMany.mockResolvedValue([] as unknown as EnrollmentFindManyResult);
    mockTransferFindMany.mockResolvedValue([
      buildTransfer({ costPerMilheiro: null, milesReceived: 10000 }),
    ] as unknown as TransferFindManyResult);
    mockSubscriptionFindMany.mockResolvedValue([] as unknown as SubscriptionFindManyResult);

    const report = await generateClientReport(MOCK_ADMIN_ID, MOCK_CLIENT_ID);

    expect(report.avgCostPerMilheiro).toBeNull();
    expect(report.savingsVsMarket).toBeNull();
  });

  it('should compute positive savings when user avg cost is below market baseline', async () => {
    mockUserFindFirst.mockResolvedValue(MOCK_CLIENT as unknown as UserFindFirstResult);
    mockEnrollmentFindMany.mockResolvedValue([
      buildEnrollment({ id: 'enr-1', currentBalance: 50000, type: 'AIRLINE' }),
    ] as unknown as EnrollmentFindManyResult);
    mockTransferFindMany.mockResolvedValue([
      buildTransfer({ costPerMilheiro: 14, milesReceived: 10000 }),
    ] as unknown as TransferFindManyResult);
    mockSubscriptionFindMany.mockResolvedValue([] as unknown as SubscriptionFindManyResult);

    const report = await generateClientReport(MOCK_ADMIN_ID, MOCK_CLIENT_ID);

    // Savings = (20 - 14) * (50000 / 1000) = 6 * 50 = R$300
    expect(report.savingsVsMarket).toBe(300);
    expect(report.marketBaselineCostPerMilheiro).toBe(20);
  });

  it('should compute negative savings when user avg cost exceeds market baseline', async () => {
    mockUserFindFirst.mockResolvedValue(MOCK_CLIENT as unknown as UserFindFirstResult);
    mockEnrollmentFindMany.mockResolvedValue([
      buildEnrollment({ id: 'enr-1', currentBalance: 10000, type: 'AIRLINE' }),
    ] as unknown as EnrollmentFindManyResult);
    mockTransferFindMany.mockResolvedValue([
      buildTransfer({ costPerMilheiro: 25, milesReceived: 10000 }),
    ] as unknown as TransferFindManyResult);
    mockSubscriptionFindMany.mockResolvedValue([] as unknown as SubscriptionFindManyResult);

    const report = await generateClientReport(MOCK_ADMIN_ID, MOCK_CLIENT_ID);

    // Savings = (20 - 25) * 10 = -50
    expect(report.savingsVsMarket).toBe(-50);
  });

  it('should include upcoming expirations within 90 days sorted by days remaining', async () => {
    const nearExpiry = new Date();
    nearExpiry.setDate(nearExpiry.getDate() + 20);

    const farExpiry = new Date();
    farExpiry.setDate(farExpiry.getDate() + 60);

    const beyondThreshold = new Date();
    beyondThreshold.setDate(beyondThreshold.getDate() + 120);

    mockUserFindFirst.mockResolvedValue(MOCK_CLIENT as unknown as UserFindFirstResult);
    mockEnrollmentFindMany.mockResolvedValue([
      buildEnrollment({
        id: 'enr-1',
        currentBalance: 5000,
        expirationDate: farExpiry,
        programName: 'Latam Pass',
        type: 'AIRLINE',
      }),
      buildEnrollment({
        id: 'enr-2',
        currentBalance: 10000,
        expirationDate: nearExpiry,
        programName: 'Smiles',
        type: 'AIRLINE',
      }),
      buildEnrollment({
        id: 'enr-3',
        currentBalance: 8000,
        expirationDate: beyondThreshold,
        programName: 'Azul',
        type: 'AIRLINE',
      }),
    ] as unknown as EnrollmentFindManyResult);
    mockTransferFindMany.mockResolvedValue([] as unknown as TransferFindManyResult);
    mockSubscriptionFindMany.mockResolvedValue([] as unknown as SubscriptionFindManyResult);

    const report = await generateClientReport(MOCK_ADMIN_ID, MOCK_CLIENT_ID);

    expect(report.upcomingExpirations).toHaveLength(2);
    expect(report.upcomingExpirations[0].programName).toBe('Smiles');
    expect(report.upcomingExpirations[1].programName).toBe('Latam Pass');
  });

  it('should exclude zero-balance enrollments from upcoming expirations', async () => {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 10);

    mockUserFindFirst.mockResolvedValue(MOCK_CLIENT as unknown as UserFindFirstResult);
    mockEnrollmentFindMany.mockResolvedValue([
      buildEnrollment({
        id: 'enr-1',
        currentBalance: 0,
        expirationDate: expiry,
        type: 'AIRLINE',
      }),
    ] as unknown as EnrollmentFindManyResult);
    mockTransferFindMany.mockResolvedValue([] as unknown as TransferFindManyResult);
    mockSubscriptionFindMany.mockResolvedValue([] as unknown as SubscriptionFindManyResult);

    const report = await generateClientReport(MOCK_ADMIN_ID, MOCK_CLIENT_ID);

    expect(report.upcomingExpirations).toHaveLength(0);
  });

  it('should exclude banking enrollments from expiration tracking', async () => {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 10);

    mockUserFindFirst.mockResolvedValue(MOCK_CLIENT as unknown as UserFindFirstResult);
    mockEnrollmentFindMany.mockResolvedValue([
      buildEnrollment({
        id: 'enr-1',
        currentBalance: 10000,
        expirationDate: expiry,
        type: 'BANKING',
      }),
    ] as unknown as EnrollmentFindManyResult);
    mockTransferFindMany.mockResolvedValue([] as unknown as TransferFindManyResult);
    mockSubscriptionFindMany.mockResolvedValue([] as unknown as SubscriptionFindManyResult);

    const report = await generateClientReport(MOCK_ADMIN_ID, MOCK_CLIENT_ID);

    expect(report.upcomingExpirations).toHaveLength(0);
    expect(report.totalPoints).toBe(10000);
  });

  it('should aggregate monthly subscription spend', async () => {
    mockUserFindFirst.mockResolvedValue(MOCK_CLIENT as unknown as UserFindFirstResult);
    mockEnrollmentFindMany.mockResolvedValue([] as unknown as EnrollmentFindManyResult);
    mockTransferFindMany.mockResolvedValue([] as unknown as TransferFindManyResult);
    mockSubscriptionFindMany.mockResolvedValue([
      buildSubscription(42.9),
      buildSubscription(29.9),
    ] as unknown as SubscriptionFindManyResult);

    const report = await generateClientReport(MOCK_ADMIN_ID, MOCK_CLIENT_ID);

    expect(report.subscriptionMonthlySpend).toBeCloseTo(72.8, 1);
  });

  it('should include reportGeneratedAt timestamp', async () => {
    const before = new Date();

    mockUserFindFirst.mockResolvedValue(MOCK_CLIENT as unknown as UserFindFirstResult);
    mockEnrollmentFindMany.mockResolvedValue([] as unknown as EnrollmentFindManyResult);
    mockTransferFindMany.mockResolvedValue([] as unknown as TransferFindManyResult);
    mockSubscriptionFindMany.mockResolvedValue([] as unknown as SubscriptionFindManyResult);

    const report = await generateClientReport(MOCK_ADMIN_ID, MOCK_CLIENT_ID);

    const after = new Date();
    expect(report.reportGeneratedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(report.reportGeneratedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});

// ==================== listClientReportSummaries ====================

describe('listClientReportSummaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty array when admin has no clients', async () => {
    mockUserFindMany.mockResolvedValue([] as unknown as UserFindManyResult);

    const summaries = await listClientReportSummaries(MOCK_ADMIN_ID);

    expect(summaries).toHaveLength(0);
  });

  it('should return one summary per client with correct totals', async () => {
    const clients = [
      {
        id: 'client-1',
        name: 'Marina',
        email: 'marina@example.com',
        createdAt: new Date(),
        programEnrollments: [
          {
            currentBalance: 30000,
            expirationDate: null,
            program: { type: 'AIRLINE' },
          },
          {
            currentBalance: 5000,
            expirationDate: null,
            program: { type: 'BANKING' },
          },
        ],
        transferLogs: [buildTransfer({ costPerMilheiro: 14, milesReceived: 10000 })],
      },
    ];

    mockUserFindMany.mockResolvedValue(clients as unknown as UserFindManyResult);

    const summaries = await listClientReportSummaries(MOCK_ADMIN_ID);

    expect(summaries).toHaveLength(1);
    expect(summaries[0].clientId).toBe('client-1');
    expect(summaries[0].clientName).toBe('Marina');
    expect(summaries[0].totalMilesManaged).toBe(35000);
    expect(summaries[0].avgCostPerMilheiro).toBe(14);
    // Savings = (20 - 14) * (30000 / 1000) = 6 * 30 = 180
    expect(summaries[0].savingsVsMarket).toBe(180);
  });

  it('should count expiration items within 90 days', async () => {
    const nearExpiry = new Date();
    nearExpiry.setDate(nearExpiry.getDate() + 45);

    const farExpiry = new Date();
    farExpiry.setDate(farExpiry.getDate() + 200);

    const clients = [
      {
        id: 'client-1',
        name: 'Ricardo',
        email: 'ricardo@example.com',
        createdAt: new Date(),
        programEnrollments: [
          {
            currentBalance: 10000,
            expirationDate: nearExpiry,
            program: { type: 'AIRLINE' },
          },
          {
            currentBalance: 5000,
            expirationDate: farExpiry,
            program: { type: 'AIRLINE' },
          },
        ],
        transferLogs: [],
      },
    ];

    mockUserFindMany.mockResolvedValue(clients as unknown as UserFindManyResult);

    const summaries = await listClientReportSummaries(MOCK_ADMIN_ID);

    expect(summaries[0].expirationCount).toBe(1);
  });

  it('should return null avgCost and savingsVsMarket for clients without transfer logs', async () => {
    const clients = [
      {
        id: 'client-1',
        name: 'Casual',
        email: 'casual@example.com',
        createdAt: new Date(),
        programEnrollments: [
          {
            currentBalance: 10000,
            expirationDate: null,
            program: { type: 'AIRLINE' },
          },
        ],
        transferLogs: [],
      },
    ];

    mockUserFindMany.mockResolvedValue(clients as unknown as UserFindManyResult);

    const summaries = await listClientReportSummaries(MOCK_ADMIN_ID);

    expect(summaries[0].avgCostPerMilheiro).toBeNull();
    expect(summaries[0].savingsVsMarket).toBeNull();
  });
});
