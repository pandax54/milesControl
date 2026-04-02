'use server';

import { logger } from '@/lib/logger';
import {
  fetchAuditLogsSchema,
  type FetchAuditLogsInput,
} from '@/lib/validators/audit-log.schema';
import {
  fetchAuditLogs as fetchAuditLogsService,
  type PaginatedAuditLogs,
} from '@/lib/services/audit-log.service';
import {
  requireAdminRole,
  isAuthenticationError,
  isAuthorizationError,
} from './helpers';

export interface FetchAuditLogsResult {
  readonly success: boolean;
  readonly data?: PaginatedAuditLogs;
  readonly error?: string;
}

export async function getAuditLogs(input: FetchAuditLogsInput): Promise<FetchAuditLogsResult> {
  const parsed = fetchAuditLogsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const adminId = await requireAdminRole();
    const data = await fetchAuditLogsService(adminId, parsed.data);
    return { success: true, data };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    if (isAuthorizationError(error)) {
      return { success: false, error: 'Admin access required' };
    }
    logger.error({ err: error }, 'Failed to fetch audit logs');
    return { success: false, error: 'Failed to load audit logs. Please try again.' };
  }
}
