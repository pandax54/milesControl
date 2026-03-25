import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
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

import { prisma } from '@/lib/prisma';
import {
  listClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  getClientDashboardView,
  ClientNotFoundError,
  ClientEmailAlreadyExistsError,
} from './client-management.service';

const mockUserFindMany = vi.mocked(prisma.user.findMany);
const mockUserFindFirst = vi.mocked(prisma.user.findFirst);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockUserCreate = vi.mocked(prisma.user.create);
const mockUserUpdate = vi.mocked(prisma.user.update);
const mockUserDelete = vi.mocked(prisma.user.delete);
const mockEnrollmentFindMany = vi.mocked(prisma.programEnrollment.findMany);
const mockSubscriptionFindMany = vi.mocked(prisma.clubSubscription.findMany);
const mockTransferFindMany = vi.mocked(prisma.transferLog.findMany);

type UserFindManyResult = Awaited<ReturnType<typeof mockUserFindMany>>;
type UserFindFirstResult = Awaited<ReturnType<typeof mockUserFindFirst>>;
type UserFindUniqueResult = Awaited<ReturnType<typeof mockUserFindUnique>>;
type UserCreateResult = Awaited<ReturnType<typeof mockUserCreate>>;

const ADMIN_ID = 'admin-1';
const CLIENT_ID = 'client-1';
const CLIENT_EMAIL = 'client@example.com';

function buildMockClientUser(overrides: Record<string, unknown> = {}) {
  return {
    id: CLIENT_ID,
    email: CLIENT_EMAIL,
    name: 'Test Client',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    role: 'USER',
    managedById: ADMIN_ID,
    passwordHash: 'hash',
    image: null,
    programEnrollments: [],
    clubSubscriptions: [],
    ...overrides,
  };
}

function buildMockEnrollment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'enr-1',
    userId: CLIENT_ID,
    programId: 'prog-1',
    memberNumber: null,
    currentBalance: 10000,
    tier: null,
    balanceUpdatedAt: new Date(),
    expirationDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    program: { id: 'prog-1', name: 'Smiles', type: 'AIRLINE', currency: 'miles', website: null },
    ...overrides,
  };
}

describe('listClients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty array when admin has no clients', async () => {
    mockUserFindMany.mockResolvedValue([] as unknown as UserFindManyResult);

    const result = await listClients(ADMIN_ID);

    expect(result).toHaveLength(0);
  });

  it('should return clients with computed totals', async () => {
    const client = buildMockClientUser({
      programEnrollments: [
        buildMockEnrollment({ currentBalance: 50000, program: { type: 'AIRLINE' } }),
        buildMockEnrollment({ id: 'enr-2', currentBalance: 20000, program: { type: 'BANKING' } }),
      ],
      clubSubscriptions: [{ id: 'sub-1' }],
    });

    mockUserFindMany.mockResolvedValue([client] as unknown as UserFindManyResult);

    const result = await listClients(ADMIN_ID);

    expect(result).toHaveLength(1);
    expect(result[0].totalMiles).toBe(50000);
    expect(result[0].totalPoints).toBe(20000);
    expect(result[0].enrollmentCount).toBe(2);
    expect(result[0].activeSubscriptionCount).toBe(1);
  });

  it('should query with managedById filter', async () => {
    mockUserFindMany.mockResolvedValue([] as unknown as UserFindManyResult);

    await listClients(ADMIN_ID);

    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { managedById: ADMIN_ID },
      }),
    );
  });
});

describe('getClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return client detail when found', async () => {
    const client = buildMockClientUser({
      programEnrollments: [buildMockEnrollment({ currentBalance: 15000 })],
      clubSubscriptions: [],
    });

    mockUserFindFirst.mockResolvedValue(client as unknown as UserFindFirstResult);

    const result = await getClient(ADMIN_ID, CLIENT_ID);

    expect(result.id).toBe(CLIENT_ID);
    expect(result.totalMiles).toBe(15000);
  });

  it('should throw ClientNotFoundError when client does not exist', async () => {
    mockUserFindFirst.mockResolvedValue(null);

    await expect(getClient(ADMIN_ID, 'nonexistent')).rejects.toThrow(ClientNotFoundError);
  });

  it('should query with both id and managedById filters', async () => {
    mockUserFindFirst.mockResolvedValue(null);

    await expect(getClient(ADMIN_ID, CLIENT_ID)).rejects.toThrow(ClientNotFoundError);

    expect(mockUserFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: CLIENT_ID, managedById: ADMIN_ID },
      }),
    );
  });
});

describe('createClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a client with hashed password', async () => {
    mockUserFindUnique.mockResolvedValue(null);
    const createdUser = buildMockClientUser();
    mockUserCreate.mockResolvedValue(createdUser as unknown as UserCreateResult);

    const result = await createClient(ADMIN_ID, {
      name: 'Test Client',
      email: CLIENT_EMAIL,
      password: 'password123',
    });

    expect(result.id).toBe(CLIENT_ID);
    expect(result.email).toBe(CLIENT_EMAIL);
    expect(mockUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          managedById: ADMIN_ID,
          role: 'USER',
        }),
      }),
    );
  });

  it('should use default password when none provided', async () => {
    mockUserFindUnique.mockResolvedValue(null);
    const createdUser = buildMockClientUser();
    mockUserCreate.mockResolvedValue(createdUser as unknown as UserCreateResult);

    await createClient(ADMIN_ID, { name: 'Test Client', email: CLIENT_EMAIL });

    expect(mockUserCreate).toHaveBeenCalled();
  });

  it('should throw ClientEmailAlreadyExistsError when email taken', async () => {
    mockUserFindUnique.mockResolvedValue(buildMockClientUser() as unknown as UserFindUniqueResult);

    await expect(
      createClient(ADMIN_ID, { name: 'Test Client', email: CLIENT_EMAIL }),
    ).rejects.toThrow(ClientEmailAlreadyExistsError);
  });
});

describe('updateClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update client name', async () => {
    const client = buildMockClientUser();
    mockUserFindFirst.mockResolvedValue(client as unknown as UserFindFirstResult);
    mockUserFindUnique.mockResolvedValue(null);
    mockUserUpdate.mockResolvedValue(client as unknown as UserCreateResult);

    await updateClient(ADMIN_ID, { clientId: CLIENT_ID, name: 'New Name' });

    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: CLIENT_ID },
        data: { name: 'New Name' },
      }),
    );
  });

  it('should throw ClientNotFoundError when client not owned by admin', async () => {
    mockUserFindFirst.mockResolvedValue(null);

    await expect(
      updateClient(ADMIN_ID, { clientId: 'other-client', name: 'Name' }),
    ).rejects.toThrow(ClientNotFoundError);
  });

  it('should throw ClientEmailAlreadyExistsError when new email is taken', async () => {
    const client = buildMockClientUser();
    mockUserFindFirst.mockResolvedValue(client as unknown as UserFindFirstResult);
    const existingUser = buildMockClientUser({ id: 'other-user', email: 'taken@example.com' });
    mockUserFindUnique.mockResolvedValue(existingUser as unknown as UserFindUniqueResult);

    await expect(
      updateClient(ADMIN_ID, { clientId: CLIENT_ID, email: 'taken@example.com' }),
    ).rejects.toThrow(ClientEmailAlreadyExistsError);
  });

  it('should not check email uniqueness when email unchanged', async () => {
    const client = buildMockClientUser();
    mockUserFindFirst.mockResolvedValue(client as unknown as UserFindFirstResult);
    mockUserUpdate.mockResolvedValue(client as unknown as UserCreateResult);

    await updateClient(ADMIN_ID, { clientId: CLIENT_ID, email: CLIENT_EMAIL });

    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });
});

describe('deleteClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete client when found', async () => {
    const client = buildMockClientUser();
    mockUserFindFirst.mockResolvedValue(client as unknown as UserFindFirstResult);
    mockUserDelete.mockResolvedValue(client as unknown as UserCreateResult);

    await deleteClient(ADMIN_ID, CLIENT_ID);

    expect(mockUserDelete).toHaveBeenCalledWith({ where: { id: CLIENT_ID } });
  });

  it('should throw ClientNotFoundError when client not owned by admin', async () => {
    mockUserFindFirst.mockResolvedValue(null);

    await expect(deleteClient(ADMIN_ID, 'nonexistent')).rejects.toThrow(ClientNotFoundError);
  });
});

describe('getClientDashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return dashboard view for a client', async () => {
    const client = { id: CLIENT_ID, name: 'Test Client', email: CLIENT_EMAIL };
    mockUserFindFirst.mockResolvedValue(client as unknown as UserFindFirstResult);

    const enrollment = buildMockEnrollment({ currentBalance: 30000, program: { id: 'prog-1', name: 'Smiles', type: 'AIRLINE', currency: 'miles', website: null } });
    mockEnrollmentFindMany.mockResolvedValue([enrollment] as unknown as Awaited<ReturnType<typeof mockEnrollmentFindMany>>);

    const subscription = {
      id: 'sub-1',
      status: 'ACTIVE',
      monthlyCost: 50,
      nextBillingDate: new Date(),
      clubTier: {
        name: 'Clube 2000',
        program: { name: 'Smiles' },
      },
    };
    mockSubscriptionFindMany.mockResolvedValue([subscription] as unknown as Awaited<ReturnType<typeof mockSubscriptionFindMany>>);
    mockTransferFindMany.mockResolvedValue([] as unknown as Awaited<ReturnType<typeof mockTransferFindMany>>);

    const result = await getClientDashboardView(ADMIN_ID, CLIENT_ID);

    expect(result.client.id).toBe(CLIENT_ID);
    expect(result.totalMiles).toBe(30000);
    expect(result.enrollments).toHaveLength(1);
    expect(result.activeSubscriptions).toHaveLength(1);
  });

  it('should throw ClientNotFoundError when client not owned by admin', async () => {
    mockUserFindFirst.mockResolvedValue(null);

    await expect(getClientDashboardView(ADMIN_ID, 'nonexistent')).rejects.toThrow(
      ClientNotFoundError,
    );
  });
});
