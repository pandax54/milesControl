import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BalanceSnapshot, ProgramEnrollment, User, UserRole } from '@/generated/prisma/client';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    programEnrollment: { findMany: vi.fn() },
    balanceSnapshot: { createMany: vi.fn(), findMany: vi.fn() },
    user: { findUnique: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock('@/lib/integrations/resend', () => ({
  sendEmail: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/integrations/resend';
import {
  computeBalanceChanges,
  buildDigestHtml,
  takeBalanceSnapshots,
  sendDigestForUser,
  sendAllDigests,
  UserNotFoundError,
} from './balance-digest.service';

const mockEnrollmentFindMany = vi.mocked(prisma.programEnrollment.findMany);
const mockSnapshotCreateMany = vi.mocked(prisma.balanceSnapshot.createMany);
const mockSnapshotFindMany = vi.mocked(prisma.balanceSnapshot.findMany);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockUserFindMany = vi.mocked(prisma.user.findMany);
const mockSendEmail = vi.mocked(sendEmail);

type EnrollmentWithProgram = ProgramEnrollment & {
  program: { name: string };
};

function buildMockEnrollment(
  overrides: Partial<EnrollmentWithProgram> & { programId: string; currentBalance: number; program: { name: string } },
): EnrollmentWithProgram {
  const now = new Date();
  return {
    id: `enrollment-${overrides.programId}`,
    userId: 'u1',
    memberNumber: null,
    tier: null,
    balanceUpdatedAt: now,
    expirationDate: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildMockSnapshot(
  overrides: Partial<BalanceSnapshot> & { programId: string; balance: number; programName: string },
): BalanceSnapshot {
  return {
    id: `snapshot-${overrides.programId}`,
    userId: 'u1',
    snapshotAt: new Date(),
    ...overrides,
  };
}

function buildMockUser(overrides: Partial<User> & { id: string; email: string }): User {
  const now = new Date();
  return {
    name: null,
    passwordHash: null,
    image: null,
    role: 'USER' as UserRole,
    freemiumTier: 'FREE',
    managedById: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('computeBalanceChanges', () => {
  it('should compute positive changes', () => {
    const enrollments = [
      { programId: 'p1', currentBalance: 15000, program: { name: 'Smiles' } },
    ];
    const snapshots = [
      { programId: 'p1', balance: 10000, programName: 'Smiles' },
    ];

    const result = computeBalanceChanges(enrollments, snapshots);

    expect(result).toEqual([
      { programName: 'Smiles', previousBalance: 10000, currentBalance: 15000, change: 5000 },
    ]);
  });

  it('should compute negative changes', () => {
    const enrollments = [
      { programId: 'p1', currentBalance: 5000, program: { name: 'Livelo' } },
    ];
    const snapshots = [
      { programId: 'p1', balance: 15000, programName: 'Livelo' },
    ];

    const result = computeBalanceChanges(enrollments, snapshots);

    expect(result).toEqual([
      { programName: 'Livelo', previousBalance: 15000, currentBalance: 5000, change: -10000 },
    ]);
  });

  it('should handle no previous snapshot (new enrollment)', () => {
    const enrollments = [
      { programId: 'p1', currentBalance: 3000, program: { name: 'Azul' } },
    ];

    const result = computeBalanceChanges(enrollments, []);

    expect(result).toEqual([
      { programName: 'Azul', previousBalance: 0, currentBalance: 3000, change: 3000 },
    ]);
  });

  it('should handle unchanged balances', () => {
    const enrollments = [
      { programId: 'p1', currentBalance: 10000, program: { name: 'Esfera' } },
    ];
    const snapshots = [
      { programId: 'p1', balance: 10000, programName: 'Esfera' },
    ];

    const result = computeBalanceChanges(enrollments, snapshots);

    expect(result).toEqual([
      { programName: 'Esfera', previousBalance: 10000, currentBalance: 10000, change: 0 },
    ]);
  });

  it('should sort by absolute change descending', () => {
    const enrollments = [
      { programId: 'p1', currentBalance: 10000, program: { name: 'Smiles' } },
      { programId: 'p2', currentBalance: 5000, program: { name: 'Livelo' } },
      { programId: 'p3', currentBalance: 20000, program: { name: 'Azul' } },
    ];
    const snapshots = [
      { programId: 'p1', balance: 10000, programName: 'Smiles' },
      { programId: 'p2', balance: 15000, programName: 'Livelo' },
      { programId: 'p3', balance: 5000, programName: 'Azul' },
    ];

    const result = computeBalanceChanges(enrollments, snapshots);

    expect(result[0].programName).toBe('Azul');
    expect(result[0].change).toBe(15000);
    expect(result[1].programName).toBe('Livelo');
    expect(result[1].change).toBe(-10000);
    expect(result[2].programName).toBe('Smiles');
    expect(result[2].change).toBe(0);
  });

  it('should handle empty enrollments', () => {
    const result = computeBalanceChanges([], []);
    expect(result).toEqual([]);
  });

  it('should handle multiple programs with mixed changes', () => {
    const enrollments = [
      { programId: 'p1', currentBalance: 12000, program: { name: 'Smiles' } },
      { programId: 'p2', currentBalance: 0, program: { name: 'Livelo' } },
      { programId: 'p3', currentBalance: 8000, program: { name: 'Esfera' } },
    ];
    const snapshots = [
      { programId: 'p1', balance: 10000, programName: 'Smiles' },
      { programId: 'p2', balance: 10000, programName: 'Livelo' },
      { programId: 'p3', balance: 8000, programName: 'Esfera' },
    ];

    const result = computeBalanceChanges(enrollments, snapshots);

    expect(result).toHaveLength(3);
    expect(result[0].change).toBe(-10000);
    expect(result[1].change).toBe(2000);
    expect(result[2].change).toBe(0);
  });
});

describe('buildDigestHtml', () => {
  it('should include user name in greeting', () => {
    const html = buildDigestHtml('Maria', [
      { programName: 'Smiles', previousBalance: 10000, currentBalance: 12000, change: 2000 },
    ]);

    expect(html).toContain('Olá, Maria!');
  });

  it('should use generic greeting when name is null', () => {
    const html = buildDigestHtml(null, [
      { programName: 'Smiles', previousBalance: 10000, currentBalance: 12000, change: 2000 },
    ]);

    expect(html).toContain('Olá!');
    expect(html).not.toContain('null');
  });

  it('should show positive change with green color and plus sign', () => {
    const html = buildDigestHtml('Test', [
      { programName: 'Smiles', previousBalance: 10000, currentBalance: 12000, change: 2000 },
    ]);

    expect(html).toContain('#16a34a');
    expect(html).toContain('+');
  });

  it('should show negative change with red color', () => {
    const html = buildDigestHtml('Test', [
      { programName: 'Livelo', previousBalance: 15000, currentBalance: 5000, change: -10000 },
    ]);

    expect(html).toContain('#dc2626');
  });

  it('should show unchanged with neutral text', () => {
    const html = buildDigestHtml('Test', [
      { programName: 'Esfera', previousBalance: 8000, currentBalance: 8000, change: 0 },
    ]);

    expect(html).toContain('sem alteração');
  });

  it('should show no-changes summary when all unchanged', () => {
    const html = buildDigestHtml('Test', [
      { programName: 'Smiles', previousBalance: 10000, currentBalance: 10000, change: 0 },
    ]);

    expect(html).toContain('não tiveram alterações');
  });

  it('should show changes summary when some changed', () => {
    const html = buildDigestHtml('Test', [
      { programName: 'Smiles', previousBalance: 10000, currentBalance: 12000, change: 2000 },
    ]);

    expect(html).toContain('resumo das mudanças');
  });

  it('should contain all program names', () => {
    const html = buildDigestHtml('Test', [
      { programName: 'Smiles', previousBalance: 0, currentBalance: 1000, change: 1000 },
      { programName: 'Livelo', previousBalance: 0, currentBalance: 2000, change: 2000 },
    ]);

    expect(html).toContain('Smiles');
    expect(html).toContain('Livelo');
  });
});

describe('takeBalanceSnapshots', () => {
  it('should create snapshots for all enrollments', async () => {
    mockEnrollmentFindMany.mockResolvedValueOnce([
      buildMockEnrollment({ programId: 'p1', currentBalance: 10000, program: { name: 'Smiles' } }),
      buildMockEnrollment({ programId: 'p2', currentBalance: 5000, program: { name: 'Livelo' } }),
    ]);

    mockSnapshotCreateMany.mockResolvedValueOnce({ count: 2 });

    const count = await takeBalanceSnapshots();

    expect(count).toBe(2);
    expect(mockSnapshotCreateMany).toHaveBeenCalledWith({
      data: [
        { userId: 'u1', programId: 'p1', programName: 'Smiles', balance: 10000 },
        { userId: 'u1', programId: 'p2', programName: 'Livelo', balance: 5000 },
      ],
    });
  });

  it('should return 0 when no enrollments exist', async () => {
    mockEnrollmentFindMany.mockResolvedValueOnce([]);

    const count = await takeBalanceSnapshots();

    expect(count).toBe(0);
    expect(mockSnapshotCreateMany).not.toHaveBeenCalled();
  });
});

describe('sendDigestForUser', () => {
  it('should throw UserNotFoundError for unknown user', async () => {
    mockUserFindUnique.mockResolvedValueOnce(null);

    await expect(sendDigestForUser('unknown')).rejects.toThrow(UserNotFoundError);
  });

  it('should skip digest when user has no enrollments', async () => {
    mockUserFindUnique.mockResolvedValueOnce(buildMockUser({ id: 'u1', email: 'test@example.com', name: 'Test' }));
    mockEnrollmentFindMany.mockResolvedValueOnce([]);
    mockSnapshotFindMany.mockResolvedValueOnce([]);

    const result = await sendDigestForUser('u1');

    expect(result.sent).toBe(false);
    expect(result.changes).toEqual([]);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('should send digest email with balance changes', async () => {
    mockUserFindUnique.mockResolvedValueOnce(buildMockUser({ id: 'u1', email: 'test@example.com', name: 'Maria' }));
    mockEnrollmentFindMany.mockResolvedValueOnce([
      buildMockEnrollment({ programId: 'p1', currentBalance: 15000, program: { name: 'Smiles' } }),
    ]);
    mockSnapshotFindMany.mockResolvedValueOnce([
      buildMockSnapshot({ programId: 'p1', programName: 'Smiles', balance: 10000 }),
    ]);
    mockSendEmail.mockResolvedValueOnce(true);

    const result = await sendDigestForUser('u1');

    expect(result.sent).toBe(true);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0].change).toBe(5000);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
        subject: 'MilesControl — Resumo semanal dos seus saldos',
      }),
    );
  });

  it('should handle email send failure gracefully', async () => {
    mockUserFindUnique.mockResolvedValueOnce(buildMockUser({ id: 'u1', email: 'test@example.com', name: 'Test' }));
    mockEnrollmentFindMany.mockResolvedValueOnce([
      buildMockEnrollment({ programId: 'p1', currentBalance: 5000, program: { name: 'Smiles' } }),
    ]);
    mockSnapshotFindMany.mockResolvedValueOnce([]);
    mockSendEmail.mockResolvedValueOnce(false);

    const result = await sendDigestForUser('u1');

    expect(result.sent).toBe(false);
    expect(result.changes).toHaveLength(1);
  });

  it('should deduplicate multiple snapshots per program keeping the earliest', async () => {
    mockUserFindUnique.mockResolvedValueOnce(buildMockUser({ id: 'u1', email: 'test@example.com', name: 'Test' }));
    mockEnrollmentFindMany.mockResolvedValueOnce([
      buildMockEnrollment({ programId: 'p1', currentBalance: 20000, program: { name: 'Smiles' } }),
    ]);

    // Snapshots ordered desc by snapshotAt — last in array is earliest
    mockSnapshotFindMany.mockResolvedValueOnce([
      buildMockSnapshot({
        id: 'snap-recent',
        programId: 'p1',
        programName: 'Smiles',
        balance: 15000,
        snapshotAt: new Date('2026-03-19'),
      }),
      buildMockSnapshot({
        id: 'snap-earliest',
        programId: 'p1',
        programName: 'Smiles',
        balance: 10000,
        snapshotAt: new Date('2026-03-14'),
      }),
    ]);
    mockSendEmail.mockResolvedValueOnce(true);

    const result = await sendDigestForUser('u1');

    // Should use the earliest snapshot (10000), not the recent one (15000)
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0].previousBalance).toBe(10000);
    expect(result.changes[0].change).toBe(10000);
  });
});

describe('sendAllDigests', () => {
  it('should process all users with enrollments', async () => {
    mockUserFindMany.mockResolvedValueOnce([
      buildMockUser({ id: 'u1', email: 'u1@test.com', name: 'User1' }),
      buildMockUser({ id: 'u2', email: 'u2@test.com', name: 'User2' }),
    ]);

    mockUserFindUnique
      .mockResolvedValueOnce(buildMockUser({ id: 'u1', email: 'u1@test.com', name: 'User1' }))
      .mockResolvedValueOnce(buildMockUser({ id: 'u2', email: 'u2@test.com', name: 'User2' }));

    mockEnrollmentFindMany
      .mockResolvedValueOnce([
        buildMockEnrollment({ programId: 'p1', currentBalance: 10000, program: { name: 'Smiles' } }),
      ])
      .mockResolvedValueOnce([
        buildMockEnrollment({ userId: 'u2', programId: 'p1', currentBalance: 5000, program: { name: 'Smiles' } }),
      ])
      .mockResolvedValueOnce([]); // takeBalanceSnapshots at end

    mockSnapshotFindMany.mockResolvedValue([]);
    mockSendEmail.mockResolvedValue(true);

    const results = await sendAllDigests();

    expect(results).toHaveLength(2);
    expect(results.filter((r) => r.sent)).toHaveLength(2);
  });

  it('should continue processing when one user fails', async () => {
    mockUserFindMany.mockResolvedValueOnce([
      buildMockUser({ id: 'u1', email: 'u1@test.com', name: 'User1' }),
      buildMockUser({ id: 'u2', email: 'u2@test.com', name: 'User2' }),
    ]);

    // u1 fails (not found)
    mockUserFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(buildMockUser({ id: 'u2', email: 'u2@test.com', name: 'User2' }));

    mockEnrollmentFindMany
      .mockResolvedValueOnce([
        buildMockEnrollment({ userId: 'u2', programId: 'p1', currentBalance: 5000, program: { name: 'Smiles' } }),
      ])
      .mockResolvedValueOnce([]); // takeBalanceSnapshots at end

    mockSnapshotFindMany.mockResolvedValue([]);
    mockSendEmail.mockResolvedValue(true);

    const results = await sendAllDigests();

    // Only u2 succeeded
    expect(results).toHaveLength(1);
    expect(results[0].userId).toBe('u2');
  });

  it('should take snapshots after sending digests', async () => {
    mockUserFindMany.mockResolvedValueOnce([]);
    mockEnrollmentFindMany.mockResolvedValueOnce([]); // takeBalanceSnapshots

    await sendAllDigests();

    // takeBalanceSnapshots is called at the end
    expect(mockEnrollmentFindMany).toHaveBeenCalled();
  });
});
