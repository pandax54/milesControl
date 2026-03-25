import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/generated/prisma/client', () => ({
  Prisma: {
    DbNull: { prismaType: 'DbNull', Symbol: Symbol('DbNull') },
    InputJsonValue: undefined,
  },
}));

import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { logger } from '@/lib/logger';
import {
  logAuditAction,
  fetchAuditLogs,
  AUDIT_ACTIONS,
} from './audit-log.service';

const mockAuditLogCreate = vi.mocked(prisma.auditLog.create);
const mockAuditLogFindMany = vi.mocked(prisma.auditLog.findMany);
const mockAuditLogCount = vi.mocked(prisma.auditLog.count);
const mockLoggerError = vi.mocked(logger.error);

// ==================== Factories ====================

function buildAuditLogEntry(overrides: {
  id?: string;
  userId?: string;
  targetUserId?: string | null;
  action?: string;
  details?: Record<string, unknown> | null;
  createdAt?: Date;
} = {}) {
  return {
    id: overrides.id ?? 'log-1',
    userId: overrides.userId ?? 'admin-1',
    targetUserId: overrides.targetUserId ?? 'client-1',
    action: overrides.action ?? AUDIT_ACTIONS.CREATE_CLIENT,
    details: overrides.details ?? null,
    createdAt: overrides.createdAt ?? new Date('2026-03-24T10:00:00Z'),
    user: { email: 'admin@example.com', name: 'Admin User' },
  };
}

// ==================== logAuditAction ====================

describe('logAuditAction', () => {
  const ADMIN_ID = 'admin-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create an audit log entry with all fields', async () => {
    mockAuditLogCreate.mockResolvedValue({} as never);

    await logAuditAction(ADMIN_ID, AUDIT_ACTIONS.CREATE_CLIENT, { email: 'client@example.com' }, 'client-1');

    expect(mockAuditLogCreate).toHaveBeenCalledWith({
      data: {
        userId: ADMIN_ID,
        targetUserId: 'client-1',
        action: AUDIT_ACTIONS.CREATE_CLIENT,
        details: { email: 'client@example.com' },
      },
    });
  });

  it('should create entry with null targetUserId when not provided', async () => {
    mockAuditLogCreate.mockResolvedValue({} as never);

    await logAuditAction(ADMIN_ID, AUDIT_ACTIONS.SEND_BATCH_RECOMMENDATIONS, { clientCount: 5 });

    expect(mockAuditLogCreate).toHaveBeenCalledWith({
      data: {
        userId: ADMIN_ID,
        targetUserId: null,
        action: AUDIT_ACTIONS.SEND_BATCH_RECOMMENDATIONS,
        details: { clientCount: 5 },
      },
    });
  });

  it('should create entry with DbNull details when not provided', async () => {
    mockAuditLogCreate.mockResolvedValue({} as never);

    await logAuditAction(ADMIN_ID, AUDIT_ACTIONS.DELETE_CLIENT, undefined, 'client-1');

    expect(mockAuditLogCreate).toHaveBeenCalledWith({
      data: {
        userId: ADMIN_ID,
        targetUserId: 'client-1',
        action: AUDIT_ACTIONS.DELETE_CLIENT,
        details: Prisma.DbNull,
      },
    });
  });

  it('should not throw when prisma create fails', async () => {
    mockAuditLogCreate.mockRejectedValue(new Error('DB error'));

    await expect(logAuditAction(ADMIN_ID, AUDIT_ACTIONS.CREATE_CLIENT)).resolves.not.toThrow();
  });

  it('should log error when prisma create fails', async () => {
    const dbError = new Error('DB connection lost');
    mockAuditLogCreate.mockRejectedValue(dbError);

    await logAuditAction(ADMIN_ID, AUDIT_ACTIONS.UPDATE_CLIENT);

    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.objectContaining({ err: dbError }),
      expect.any(String),
    );
  });
});

// ==================== fetchAuditLogs ====================

describe('fetchAuditLogs', () => {
  const ADMIN_ID = 'admin-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return paginated audit log entries', async () => {
    const entries = [buildAuditLogEntry(), buildAuditLogEntry({ id: 'log-2' })];
    mockAuditLogFindMany.mockResolvedValue(entries as never);
    mockAuditLogCount.mockResolvedValue(2);

    const result = await fetchAuditLogs(ADMIN_ID);

    expect(result.entries).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it('should use default pagination values', async () => {
    mockAuditLogFindMany.mockResolvedValue([]);
    mockAuditLogCount.mockResolvedValue(0);

    await fetchAuditLogs(ADMIN_ID);

    expect(mockAuditLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 20,
      }),
    );
  });

  it('should apply page offset correctly', async () => {
    mockAuditLogFindMany.mockResolvedValue([]);
    mockAuditLogCount.mockResolvedValue(50);

    const result = await fetchAuditLogs(ADMIN_ID, { page: 3, pageSize: 10 });

    expect(mockAuditLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    );
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(10);
    expect(result.totalPages).toBe(5);
  });

  it('should filter by targetUserId when provided', async () => {
    mockAuditLogFindMany.mockResolvedValue([]);
    mockAuditLogCount.mockResolvedValue(0);

    await fetchAuditLogs(ADMIN_ID, { targetUserId: 'client-5' });

    expect(mockAuditLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ targetUserId: 'client-5' }),
      }),
    );
  });

  it('should filter by action when provided', async () => {
    mockAuditLogFindMany.mockResolvedValue([]);
    mockAuditLogCount.mockResolvedValue(0);

    await fetchAuditLogs(ADMIN_ID, { action: AUDIT_ACTIONS.SEND_RECOMMENDATION });

    expect(mockAuditLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ action: AUDIT_ACTIONS.SEND_RECOMMENDATION }),
      }),
    );
  });

  it('should always filter by adminId', async () => {
    mockAuditLogFindMany.mockResolvedValue([]);
    mockAuditLogCount.mockResolvedValue(0);

    await fetchAuditLogs(ADMIN_ID);

    expect(mockAuditLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: ADMIN_ID }),
      }),
    );
    expect(mockAuditLogCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: ADMIN_ID }),
      }),
    );
  });

  it('should order entries by createdAt desc', async () => {
    mockAuditLogFindMany.mockResolvedValue([]);
    mockAuditLogCount.mockResolvedValue(0);

    await fetchAuditLogs(ADMIN_ID);

    expect(mockAuditLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
      }),
    );
  });

  it('should map entry details as Record or null', async () => {
    const entryWithDetails = buildAuditLogEntry({ details: { email: 'test@example.com' } });
    const entryWithoutDetails = buildAuditLogEntry({ id: 'log-2', details: null });
    mockAuditLogFindMany.mockResolvedValue([entryWithDetails, entryWithoutDetails] as never);
    mockAuditLogCount.mockResolvedValue(2);

    const result = await fetchAuditLogs(ADMIN_ID);

    expect(result.entries[0].details).toEqual({ email: 'test@example.com' });
    expect(result.entries[1].details).toBeNull();
  });

  it('should calculate totalPages correctly when total is zero', async () => {
    mockAuditLogFindMany.mockResolvedValue([]);
    mockAuditLogCount.mockResolvedValue(0);

    const result = await fetchAuditLogs(ADMIN_ID);

    expect(result.totalPages).toBe(0);
  });
});
