import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// ==================== Action constants ====================

export const AUDIT_ACTIONS = {
  CREATE_CLIENT: 'CREATE_CLIENT',
  UPDATE_CLIENT: 'UPDATE_CLIENT',
  DELETE_CLIENT: 'DELETE_CLIENT',
  SEND_RECOMMENDATION: 'SEND_RECOMMENDATION',
  SEND_BATCH_RECOMMENDATIONS: 'SEND_BATCH_RECOMMENDATIONS',
  IMPERSONATE_CLIENT: 'IMPERSONATE_CLIENT',
  UPDATE_CLIENT_BALANCE: 'UPDATE_CLIENT_BALANCE',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

// ==================== Types ====================

export interface AuditLogEntry {
  readonly id: string;
  readonly userId: string;
  readonly targetUserId: string | null;
  readonly action: string;
  readonly details: Record<string, unknown> | null;
  readonly createdAt: Date;
  readonly user: {
    readonly email: string;
    readonly name: string | null;
  };
}

export interface FetchAuditLogsOptions {
  readonly page?: number;
  readonly pageSize?: number;
  readonly targetUserId?: string;
  readonly action?: string;
}

export interface PaginatedAuditLogs {
  readonly entries: readonly AuditLogEntry[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
}

// ==================== Mutations ====================

/**
 * Records an admin action in the audit log.
 * Non-throwing — logs errors but does not propagate to avoid blocking primary operations.
 */
export async function logAuditAction(
  adminId: string,
  action: AuditAction,
  details?: Record<string, unknown>,
  targetUserId?: string,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        targetUserId: targetUserId ?? null,
        action,
        details: details !== undefined ? (details as Prisma.InputJsonValue) : Prisma.DbNull,
      },
    });
    logger.info({ adminId, action, targetUserId }, 'Audit action logged');
  } catch (error) {
    logger.error({ err: error, adminId, action, targetUserId }, 'Failed to log audit action');
  }
}

// ==================== Queries ====================

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

/**
 * Fetches paginated audit logs for an admin user.
 * Only returns logs created by the given adminId.
 */
export async function fetchAuditLogs(
  adminId: string,
  options: FetchAuditLogsOptions = {},
): Promise<PaginatedAuditLogs> {
  const page = options.page ?? DEFAULT_PAGE;
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const skip = (page - 1) * pageSize;

  const where = {
    userId: adminId,
    ...(options.targetUserId ? { targetUserId: options.targetUserId } : {}),
    ...(options.action ? { action: options.action } : {}),
  };

  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { email: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const mappedEntries: AuditLogEntry[] = entries.map((entry) => ({
    id: entry.id,
    userId: entry.userId,
    targetUserId: entry.targetUserId,
    action: entry.action,
    details: entry.details as Record<string, unknown> | null,
    createdAt: entry.createdAt,
    user: entry.user,
  }));

  logger.info({ adminId, page, pageSize, total }, 'Fetched audit logs');

  return {
    entries: mappedEntries,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
