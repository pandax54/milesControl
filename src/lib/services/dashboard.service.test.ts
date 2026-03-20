import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@/generated/prisma/client';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    programEnrollment: {
      findMany: vi.fn(),
    },
    clubSubscription: {
      findMany: vi.fn(),
    },
    transferLog: {
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

vi.mock('./accrual-projector.service', () => ({
  fetchUserProjection: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { fetchUserProjection } from './accrual-projector.service';
import {
  classifyStaleness,
  fetchDashboardData,
} from './dashboard.service';

const mockEnrollmentFindMany = vi.mocked(prisma.programEnrollment.findMany);
const mockSubscriptionFindMany = vi.mocked(prisma.clubSubscription.findMany);
const mockTransferFindMany = vi.mocked(prisma.transferLog.findMany);
const mockFetchProjection = vi.mocked(fetchUserProjection);

const MOCK_USER_ID = 'user-dash-1';

type EnrollmentFindManyResult = Awaited<ReturnType<typeof mockEnrollmentFindMany>>;
type SubscriptionFindManyResult = Awaited<ReturnType<typeof mockSubscriptionFindMany>>;
type TransferFindManyResult = Awaited<ReturnType<typeof mockTransferFindMany>>;

const mockProjection = {
  months: [],
  totalProjectedMiles: 6000,
  balanceAt3Months: 16000,
  balanceAt6Months: 22000,
  balanceAt12Months: 34000,
};

interface MockEnrollmentWithProgram {
  id: string;
  userId: string;
  programId: string;
  memberNumber: string | null;
  currentBalance: number;
  tier: string | null;
  balanceUpdatedAt: Date;
  expirationDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  program: {
    id: string;
    name: string;
    type: string;
    currency: string;
    website: string | null;
  };
}

interface MockSubscriptionWithTier {
  id: string;
  userId: string;
  clubTierId: string;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PAUSED';
  startDate: Date;
  endDate: Date | null;
  monthlyCost: Prisma.Decimal;
  accrualSchedule: unknown;
  totalMilesAccrued: number;
  nextBillingDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  clubTier: {
    id: string;
    name: string;
    programId: string;
    monthlyPrice: Prisma.Decimal;
    baseMonthlyMiles: number;
    minimumStayMonths: number;
    benefits: unknown;
    createdAt: Date;
    updatedAt: Date;
    program: {
      name: string;
      currency: string;
    };
  };
}

interface MockTransferLog {
  id: string;
  userId: string;
  sourceProgramName: string;
  destProgramName: string;
  pointsTransferred: number;
  bonusPercent: number;
  milesReceived: number;
  totalCost: Prisma.Decimal | null;
  costPerMilheiro: Prisma.Decimal | null;
  promotionId: string | null;
  notes: string | null;
  transferDate: Date;
  createdAt: Date;
}

function buildMockEnrollment(overrides: Partial<MockEnrollmentWithProgram> = {}): MockEnrollmentWithProgram {
  return {
    id: 'enr-1',
    userId: MOCK_USER_ID,
    programId: 'prog-1',
    memberNumber: '12345',
    currentBalance: 10000,
    tier: 'Gold',
    balanceUpdatedAt: new Date(),
    expirationDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    program: {
      id: 'prog-1',
      name: 'Smiles',
      type: 'AIRLINE',
      currency: 'miles',
      website: 'https://smiles.com.br',
    },
    ...overrides,
  };
}

function buildMockSubscription(overrides: Partial<MockSubscriptionWithTier> = {}): MockSubscriptionWithTier {
  return {
    id: 'sub-1',
    userId: MOCK_USER_ID,
    clubTierId: 'tier-1',
    status: 'ACTIVE',
    startDate: new Date(),
    endDate: null,
    monthlyCost: new Prisma.Decimal('39.90'),
    accrualSchedule: [],
    totalMilesAccrued: 0,
    nextBillingDate: new Date('2026-04-01'),
    createdAt: new Date(),
    updatedAt: new Date(),
    clubTier: {
      id: 'tier-1',
      name: 'Clube Smiles 2.000',
      programId: 'prog-1',
      monthlyPrice: new Prisma.Decimal('39.90'),
      baseMonthlyMiles: 2000,
      minimumStayMonths: 12,
      benefits: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      program: {
        name: 'Smiles',
        currency: 'miles',
      },
    },
    ...overrides,
  };
}

function buildMockTransfer(overrides: Partial<MockTransferLog> = {}): MockTransferLog {
  return {
    id: 'txr-1',
    userId: MOCK_USER_ID,
    sourceProgramName: 'Livelo',
    destProgramName: 'Smiles',
    pointsTransferred: 10000,
    bonusPercent: 80,
    milesReceived: 18000,
    totalCost: new Prisma.Decimal('280.00'),
    costPerMilheiro: new Prisma.Decimal('15.56'),
    promotionId: null,
    notes: null,
    transferDate: new Date('2026-03-15'),
    createdAt: new Date(),
    ...overrides,
  };
}

function mockEnrollments(data: MockEnrollmentWithProgram[]) {
  mockEnrollmentFindMany.mockResolvedValueOnce(data as unknown as EnrollmentFindManyResult);
}

function mockSubscriptions(data: MockSubscriptionWithTier[]) {
  mockSubscriptionFindMany.mockResolvedValueOnce(data as unknown as SubscriptionFindManyResult);
}

function mockTransfers(data: MockTransferLog[]) {
  mockTransferFindMany.mockResolvedValueOnce(data as unknown as TransferFindManyResult);
}

function mockEmptyPrisma() {
  mockEnrollments([]);
  mockSubscriptions([]);
  mockTransfers([]);
  mockFetchProjection.mockResolvedValueOnce(mockProjection);
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('classifyStaleness', () => {
  const now = new Date('2026-03-20T12:00:00Z');

  it('should return fresh when updated less than 7 days ago', () => {
    const updatedAt = new Date('2026-03-18T12:00:00Z');
    expect(classifyStaleness(updatedAt, now)).toBe('fresh');
  });

  it('should return warning when updated 7-30 days ago', () => {
    const updatedAt = new Date('2026-03-05T12:00:00Z');
    expect(classifyStaleness(updatedAt, now)).toBe('warning');
  });

  it('should return stale when updated more than 30 days ago', () => {
    const updatedAt = new Date('2026-02-01T12:00:00Z');
    expect(classifyStaleness(updatedAt, now)).toBe('stale');
  });

  it('should return fresh when updated exactly now', () => {
    expect(classifyStaleness(now, now)).toBe('fresh');
  });

  it('should return warning at exactly 7 days', () => {
    const updatedAt = new Date('2026-03-13T12:00:00Z');
    expect(classifyStaleness(updatedAt, now)).toBe('warning');
  });

  it('should return stale at exactly 30 days', () => {
    const updatedAt = new Date('2026-02-18T12:00:00Z');
    expect(classifyStaleness(updatedAt, now)).toBe('stale');
  });
});

describe('fetchDashboardData', () => {
  it('should aggregate airline miles and banking points separately', async () => {
    const airlineEnrollment = buildMockEnrollment({
      id: 'enr-airline',
      currentBalance: 25000,
      program: { id: 'p1', name: 'Smiles', type: 'AIRLINE', currency: 'miles', website: null },
    });
    const bankingEnrollment = buildMockEnrollment({
      id: 'enr-banking',
      currentBalance: 15000,
      program: { id: 'p2', name: 'Livelo', type: 'BANKING', currency: 'points', website: null },
    });

    mockEnrollments([airlineEnrollment, bankingEnrollment]);
    mockSubscriptions([]);
    mockTransfers([]);
    mockFetchProjection.mockResolvedValueOnce(mockProjection);

    const result = await fetchDashboardData(MOCK_USER_ID);

    expect(result.totalMiles).toBe(25000);
    expect(result.totalPoints).toBe(15000);
    expect(result.enrollments).toHaveLength(2);
  });

  it('should count active subscriptions', async () => {
    mockEnrollments([]);
    mockSubscriptions([
      buildMockSubscription({ id: 'sub-1' }),
      buildMockSubscription({ id: 'sub-2' }),
    ]);
    mockTransfers([]);
    mockFetchProjection.mockResolvedValueOnce(mockProjection);

    const result = await fetchDashboardData(MOCK_USER_ID);

    expect(result.activeSubscriptionCount).toBe(2);
    expect(result.activeSubscriptions).toHaveLength(2);
  });

  it('should return recent transfers with numeric cost fields', async () => {
    mockEnrollments([]);
    mockSubscriptions([]);
    mockTransfers([buildMockTransfer()]);
    mockFetchProjection.mockResolvedValueOnce(mockProjection);

    const result = await fetchDashboardData(MOCK_USER_ID);

    expect(result.recentTransfers).toHaveLength(1);
    expect(result.recentTransfers[0].totalCost).toBe(280);
    expect(result.recentTransfers[0].costPerMilheiro).toBe(15.56);
    expect(result.recentTransfers[0].sourceProgramName).toBe('Livelo');
    expect(result.recentTransfers[0].destProgramName).toBe('Smiles');
  });

  it('should handle null cost fields in transfers', async () => {
    mockEnrollments([]);
    mockSubscriptions([]);
    mockTransfers([buildMockTransfer({ totalCost: null, costPerMilheiro: null })]);
    mockFetchProjection.mockResolvedValueOnce(mockProjection);

    const result = await fetchDashboardData(MOCK_USER_ID);

    expect(result.recentTransfers[0].totalCost).toBeNull();
    expect(result.recentTransfers[0].costPerMilheiro).toBeNull();
  });

  it('should count stale enrollments', async () => {
    const freshDate = new Date();
    const staleDate = new Date('2025-12-01');

    mockEnrollments([
      buildMockEnrollment({ id: 'enr-fresh', balanceUpdatedAt: freshDate }),
      buildMockEnrollment({ id: 'enr-stale', balanceUpdatedAt: staleDate }),
    ]);
    mockSubscriptions([]);
    mockTransfers([]);
    mockFetchProjection.mockResolvedValueOnce(mockProjection);

    const result = await fetchDashboardData(MOCK_USER_ID);

    expect(result.staleEnrollmentCount).toBe(1);
    const staleEnrollment = result.enrollments.find((e) => e.id === 'enr-stale');
    expect(staleEnrollment?.stalenessLevel).toBe('stale');
  });

  it('should include projection data', async () => {
    mockEmptyPrisma();

    const result = await fetchDashboardData(MOCK_USER_ID);

    expect(result.projection).toEqual(mockProjection);
    expect(result.projection.balanceAt3Months).toBe(16000);
    expect(result.projection.balanceAt12Months).toBe(34000);
  });

  it('should convert subscription monthlyCost to number', async () => {
    mockEnrollments([]);
    mockSubscriptions([buildMockSubscription()]);
    mockTransfers([]);
    mockFetchProjection.mockResolvedValueOnce(mockProjection);

    const result = await fetchDashboardData(MOCK_USER_ID);

    expect(result.activeSubscriptions[0].monthlyCost).toBe(39.9);
  });

  it('should return empty arrays when user has no data', async () => {
    mockEmptyPrisma();

    const result = await fetchDashboardData(MOCK_USER_ID);

    expect(result.totalMiles).toBe(0);
    expect(result.totalPoints).toBe(0);
    expect(result.activeSubscriptionCount).toBe(0);
    expect(result.staleEnrollmentCount).toBe(0);
    expect(result.enrollments).toHaveLength(0);
    expect(result.activeSubscriptions).toHaveLength(0);
    expect(result.recentTransfers).toHaveLength(0);
  });

  it('should call prisma with correct filters', async () => {
    mockEmptyPrisma();

    await fetchDashboardData(MOCK_USER_ID);

    expect(mockEnrollmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: MOCK_USER_ID },
      }),
    );
    expect(mockSubscriptionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: MOCK_USER_ID, status: 'ACTIVE' },
      }),
    );
    expect(mockTransferFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: MOCK_USER_ID },
        take: 5,
        orderBy: { transferDate: 'desc' },
      }),
    );
    expect(mockFetchProjection).toHaveBeenCalledWith(MOCK_USER_ID);
  });
});
