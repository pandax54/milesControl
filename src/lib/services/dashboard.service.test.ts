import { describe, it, expect, vi, beforeEach } from 'vitest';

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

const mockProjection = {
  months: [],
  totalProjectedMiles: 6000,
  balanceAt3Months: 16000,
  balanceAt6Months: 22000,
  balanceAt12Months: 34000,
};

function buildMockEnrollment(overrides: Record<string, unknown> = {}) {
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

function buildMockSubscription(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub-1',
    userId: MOCK_USER_ID,
    clubTierId: 'tier-1',
    status: 'ACTIVE' as const,
    startDate: new Date(),
    endDate: null,
    monthlyCost: { toString: () => '39.90' } as unknown,
    accrualSchedule: [],
    totalMilesAccrued: 0,
    nextBillingDate: new Date('2026-04-01'),
    createdAt: new Date(),
    updatedAt: new Date(),
    clubTier: {
      id: 'tier-1',
      name: 'Clube Smiles 2.000',
      programId: 'prog-1',
      monthlyPrice: { toString: () => '39.90' } as unknown,
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

function buildMockTransfer(overrides: Record<string, unknown> = {}) {
  return {
    id: 'txr-1',
    userId: MOCK_USER_ID,
    sourceProgramName: 'Livelo',
    destProgramName: 'Smiles',
    pointsTransferred: 10000,
    bonusPercent: 80,
    milesReceived: 18000,
    totalCost: { toString: () => '280.00' } as unknown,
    costPerMilheiro: { toString: () => '15.56' } as unknown,
    promotionId: null,
    notes: null,
    transferDate: new Date('2026-03-15'),
    createdAt: new Date(),
    ...overrides,
  };
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

    mockEnrollmentFindMany.mockResolvedValueOnce([airlineEnrollment, bankingEnrollment] as never);
    mockSubscriptionFindMany.mockResolvedValueOnce([] as never);
    mockTransferFindMany.mockResolvedValueOnce([] as never);
    mockFetchProjection.mockResolvedValueOnce(mockProjection);

    const result = await fetchDashboardData(MOCK_USER_ID);

    expect(result.totalMiles).toBe(25000);
    expect(result.totalPoints).toBe(15000);
    expect(result.enrollments).toHaveLength(2);
  });

  it('should count active subscriptions', async () => {
    mockEnrollmentFindMany.mockResolvedValueOnce([] as never);
    mockSubscriptionFindMany.mockResolvedValueOnce([
      buildMockSubscription({ id: 'sub-1' }),
      buildMockSubscription({ id: 'sub-2' }),
    ] as never);
    mockTransferFindMany.mockResolvedValueOnce([] as never);
    mockFetchProjection.mockResolvedValueOnce(mockProjection);

    const result = await fetchDashboardData(MOCK_USER_ID);

    expect(result.activeSubscriptionCount).toBe(2);
    expect(result.activeSubscriptions).toHaveLength(2);
  });

  it('should return recent transfers with numeric cost fields', async () => {
    mockEnrollmentFindMany.mockResolvedValueOnce([] as never);
    mockSubscriptionFindMany.mockResolvedValueOnce([] as never);
    mockTransferFindMany.mockResolvedValueOnce([buildMockTransfer()] as never);
    mockFetchProjection.mockResolvedValueOnce(mockProjection);

    const result = await fetchDashboardData(MOCK_USER_ID);

    expect(result.recentTransfers).toHaveLength(1);
    expect(result.recentTransfers[0].totalCost).toBe(280);
    expect(result.recentTransfers[0].costPerMilheiro).toBe(15.56);
    expect(result.recentTransfers[0].sourceProgramName).toBe('Livelo');
    expect(result.recentTransfers[0].destProgramName).toBe('Smiles');
  });

  it('should handle null cost fields in transfers', async () => {
    mockEnrollmentFindMany.mockResolvedValueOnce([] as never);
    mockSubscriptionFindMany.mockResolvedValueOnce([] as never);
    mockTransferFindMany.mockResolvedValueOnce([
      buildMockTransfer({ totalCost: null, costPerMilheiro: null }),
    ] as never);
    mockFetchProjection.mockResolvedValueOnce(mockProjection);

    const result = await fetchDashboardData(MOCK_USER_ID);

    expect(result.recentTransfers[0].totalCost).toBeNull();
    expect(result.recentTransfers[0].costPerMilheiro).toBeNull();
  });

  it('should count stale enrollments', async () => {
    const freshDate = new Date();
    const staleDate = new Date('2025-12-01');

    mockEnrollmentFindMany.mockResolvedValueOnce([
      buildMockEnrollment({ id: 'enr-fresh', balanceUpdatedAt: freshDate }),
      buildMockEnrollment({ id: 'enr-stale', balanceUpdatedAt: staleDate }),
    ] as never);
    mockSubscriptionFindMany.mockResolvedValueOnce([] as never);
    mockTransferFindMany.mockResolvedValueOnce([] as never);
    mockFetchProjection.mockResolvedValueOnce(mockProjection);

    const result = await fetchDashboardData(MOCK_USER_ID);

    expect(result.staleEnrollmentCount).toBe(1);
    const staleEnrollment = result.enrollments.find((e) => e.id === 'enr-stale');
    expect(staleEnrollment?.stalenessLevel).toBe('stale');
  });

  it('should include projection data', async () => {
    mockEnrollmentFindMany.mockResolvedValueOnce([] as never);
    mockSubscriptionFindMany.mockResolvedValueOnce([] as never);
    mockTransferFindMany.mockResolvedValueOnce([] as never);
    mockFetchProjection.mockResolvedValueOnce(mockProjection);

    const result = await fetchDashboardData(MOCK_USER_ID);

    expect(result.projection).toEqual(mockProjection);
    expect(result.projection.balanceAt3Months).toBe(16000);
    expect(result.projection.balanceAt12Months).toBe(34000);
  });

  it('should convert subscription monthlyCost to number', async () => {
    mockEnrollmentFindMany.mockResolvedValueOnce([] as never);
    mockSubscriptionFindMany.mockResolvedValueOnce([buildMockSubscription()] as never);
    mockTransferFindMany.mockResolvedValueOnce([] as never);
    mockFetchProjection.mockResolvedValueOnce(mockProjection);

    const result = await fetchDashboardData(MOCK_USER_ID);

    expect(result.activeSubscriptions[0].monthlyCost).toBe(39.9);
  });

  it('should return empty arrays when user has no data', async () => {
    mockEnrollmentFindMany.mockResolvedValueOnce([] as never);
    mockSubscriptionFindMany.mockResolvedValueOnce([] as never);
    mockTransferFindMany.mockResolvedValueOnce([] as never);
    mockFetchProjection.mockResolvedValueOnce(mockProjection);

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
    mockEnrollmentFindMany.mockResolvedValueOnce([] as never);
    mockSubscriptionFindMany.mockResolvedValueOnce([] as never);
    mockTransferFindMany.mockResolvedValueOnce([] as never);
    mockFetchProjection.mockResolvedValueOnce(mockProjection);

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
