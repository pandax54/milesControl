import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
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
import { fetchAdminDashboardData } from './admin-dashboard.service';

const mockUserFindMany = vi.mocked(prisma.user.findMany);

const MOCK_ADMIN_ID = 'admin-1';

interface MockProgramEnrollment {
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
  program: { type: string };
}

interface MockClubSubscription {
  id: string;
}

interface MockClientUser {
  id: string;
  email: string;
  name: string | null;
  programEnrollments: MockProgramEnrollment[];
  clubSubscriptions: MockClubSubscription[];
}

function buildMockEnrollment(
  overrides: Partial<MockProgramEnrollment> = {},
): MockProgramEnrollment {
  return {
    id: 'enr-1',
    userId: 'client-1',
    programId: 'prog-1',
    memberNumber: null,
    currentBalance: 10000,
    tier: null,
    balanceUpdatedAt: new Date(),
    expirationDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    program: { type: 'AIRLINE' },
    ...overrides,
  };
}

function buildMockClient(overrides: Partial<MockClientUser> = {}): MockClientUser {
  return {
    id: 'client-1',
    email: 'client@example.com',
    name: 'Test Client',
    programEnrollments: [],
    clubSubscriptions: [],
    ...overrides,
  };
}

// Use unknown cast to avoid needing to mock the full Prisma User type
type UserFindManyResult = Awaited<ReturnType<typeof mockUserFindMany>>;

describe('fetchAdminDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return zero totals when admin has no clients', async () => {
    mockUserFindMany.mockResolvedValue([] as unknown as UserFindManyResult);

    const result = await fetchAdminDashboardData(MOCK_ADMIN_ID);

    expect(result.totalClients).toBe(0);
    expect(result.totalMilesAggregated).toBe(0);
    expect(result.totalPointsAggregated).toBe(0);
    expect(result.activeSubscriptionCount).toBe(0);
    expect(result.clientsWithExpiringMiles).toBe(0);
    expect(result.topClients).toHaveLength(0);
  });

  it('should aggregate miles and points across all clients', async () => {
    const clients = [
      buildMockClient({
        id: 'client-1',
        programEnrollments: [
          buildMockEnrollment({ id: 'enr-1', currentBalance: 50000, program: { type: 'AIRLINE' } }),
          buildMockEnrollment({ id: 'enr-2', currentBalance: 10000, program: { type: 'BANKING' } }),
        ],
      }),
      buildMockClient({
        id: 'client-2',
        email: 'client2@example.com',
        programEnrollments: [
          buildMockEnrollment({ id: 'enr-3', currentBalance: 30000, program: { type: 'AIRLINE' } }),
          buildMockEnrollment({ id: 'enr-4', currentBalance: 20000, program: { type: 'BANKING' } }),
        ],
      }),
    ];

    mockUserFindMany.mockResolvedValue(clients as unknown as UserFindManyResult);

    const result = await fetchAdminDashboardData(MOCK_ADMIN_ID);

    expect(result.totalClients).toBe(2);
    expect(result.totalMilesAggregated).toBe(80000);
    expect(result.totalPointsAggregated).toBe(30000);
  });

  it('should count active subscriptions across all clients', async () => {
    const clients = [
      buildMockClient({
        id: 'client-1',
        clubSubscriptions: [{ id: 'sub-1' }, { id: 'sub-2' }],
      }),
      buildMockClient({
        id: 'client-2',
        email: 'client2@example.com',
        clubSubscriptions: [{ id: 'sub-3' }],
      }),
    ];

    mockUserFindMany.mockResolvedValue(clients as unknown as UserFindManyResult);

    const result = await fetchAdminDashboardData(MOCK_ADMIN_ID);

    expect(result.activeSubscriptionCount).toBe(3);
  });

  it('should count clients with expiring miles within 30 days', async () => {
    const soonExpiry = new Date();
    soonExpiry.setDate(soonExpiry.getDate() + 15);

    const farExpiry = new Date();
    farExpiry.setDate(farExpiry.getDate() + 60);

    const clients = [
      buildMockClient({
        id: 'client-1',
        programEnrollments: [
          buildMockEnrollment({
            id: 'enr-1',
            currentBalance: 5000,
            expirationDate: soonExpiry,
            program: { type: 'AIRLINE' },
          }),
        ],
      }),
      buildMockClient({
        id: 'client-2',
        email: 'client2@example.com',
        programEnrollments: [
          buildMockEnrollment({
            id: 'enr-2',
            currentBalance: 5000,
            expirationDate: farExpiry,
            program: { type: 'AIRLINE' },
          }),
        ],
      }),
    ];

    mockUserFindMany.mockResolvedValue(clients as unknown as UserFindManyResult);

    const result = await fetchAdminDashboardData(MOCK_ADMIN_ID);

    expect(result.clientsWithExpiringMiles).toBe(1);
  });

  it('should not count zero-balance expiring enrollments', async () => {
    const soonExpiry = new Date();
    soonExpiry.setDate(soonExpiry.getDate() + 10);

    const clients = [
      buildMockClient({
        id: 'client-1',
        programEnrollments: [
          buildMockEnrollment({
            id: 'enr-1',
            currentBalance: 0,
            expirationDate: soonExpiry,
            program: { type: 'AIRLINE' },
          }),
        ],
      }),
    ];

    mockUserFindMany.mockResolvedValue(clients as unknown as UserFindManyResult);

    const result = await fetchAdminDashboardData(MOCK_ADMIN_ID);

    expect(result.clientsWithExpiringMiles).toBe(0);
  });

  it('should sort top clients by total balance descending', async () => {
    const clients = [
      buildMockClient({
        id: 'client-low',
        email: 'low@example.com',
        programEnrollments: [
          buildMockEnrollment({ id: 'enr-1', currentBalance: 5000, program: { type: 'AIRLINE' } }),
        ],
      }),
      buildMockClient({
        id: 'client-high',
        email: 'high@example.com',
        programEnrollments: [
          buildMockEnrollment({ id: 'enr-2', currentBalance: 100000, program: { type: 'AIRLINE' } }),
        ],
      }),
      buildMockClient({
        id: 'client-mid',
        email: 'mid@example.com',
        programEnrollments: [
          buildMockEnrollment({ id: 'enr-3', currentBalance: 50000, program: { type: 'AIRLINE' } }),
        ],
      }),
    ];

    mockUserFindMany.mockResolvedValue(clients as unknown as UserFindManyResult);

    const result = await fetchAdminDashboardData(MOCK_ADMIN_ID);

    expect(result.topClients[0].id).toBe('client-high');
    expect(result.topClients[1].id).toBe('client-mid');
    expect(result.topClients[2].id).toBe('client-low');
  });

  it('should limit top clients to 10 entries', async () => {
    const manyClients = Array.from({ length: 15 }, (_, i) =>
      buildMockClient({
        id: `client-${i}`,
        email: `client${i}@example.com`,
        programEnrollments: [
          buildMockEnrollment({
            id: `enr-${i}`,
            currentBalance: i * 1000,
            program: { type: 'AIRLINE' },
          }),
        ],
      }),
    );

    mockUserFindMany.mockResolvedValue(manyClients as unknown as UserFindManyResult);

    const result = await fetchAdminDashboardData(MOCK_ADMIN_ID);

    expect(result.topClients).toHaveLength(10);
    expect(result.totalClients).toBe(15);
  });

  it('should query prisma with managedById filter', async () => {
    mockUserFindMany.mockResolvedValue([] as unknown as UserFindManyResult);

    await fetchAdminDashboardData(MOCK_ADMIN_ID);

    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { managedById: MOCK_ADMIN_ID },
      }),
    );
  });

  it('should correctly compute per-client expiring miles sum', async () => {
    const soonExpiry = new Date();
    soonExpiry.setDate(soonExpiry.getDate() + 10);

    const clients = [
      buildMockClient({
        id: 'client-1',
        programEnrollments: [
          buildMockEnrollment({
            id: 'enr-1',
            currentBalance: 8000,
            expirationDate: soonExpiry,
            program: { type: 'AIRLINE' },
          }),
          buildMockEnrollment({
            id: 'enr-2',
            currentBalance: 3000,
            expirationDate: soonExpiry,
            program: { type: 'AIRLINE' },
          }),
        ],
      }),
    ];

    mockUserFindMany.mockResolvedValue(clients as unknown as UserFindManyResult);

    const result = await fetchAdminDashboardData(MOCK_ADMIN_ID);

    expect(result.topClients[0].expiringMiles).toBe(11000);
    expect(result.clientsWithExpiringMiles).toBe(1);
  });
});
