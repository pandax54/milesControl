import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./helpers', () => {
  class AuthenticationError extends Error {
    constructor() {
      super('Not authenticated');
      this.name = 'AuthenticationError';
    }
  }
  class AuthorizationError extends Error {
    constructor() {
      super('Not authorized');
      this.name = 'AuthorizationError';
    }
  }
  return {
    requireAdminRole: vi.fn(),
    isAuthenticationError: (error: unknown) => error instanceof AuthenticationError,
    isAuthorizationError: (error: unknown) => error instanceof AuthorizationError,
    AuthenticationError,
    AuthorizationError,
  };
});

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/services/audit-log.service', () => ({
  fetchAuditLogs: vi.fn(),
}));

import { fetchAuditLogs as fetchAuditLogsService } from '@/lib/services/audit-log.service';
import { requireAdminRole, AuthenticationError, AuthorizationError } from './helpers';
import { getAuditLogs } from './audit-logs';
import type { PaginatedAuditLogs } from '@/lib/services/audit-log.service';

const mockRequireAdminRole = vi.mocked(requireAdminRole);
const mockFetchAuditLogsService = vi.mocked(fetchAuditLogsService);

const ADMIN_ID = 'admin-1';

function buildMockPaginatedLogs(overrides: Partial<PaginatedAuditLogs> = {}): PaginatedAuditLogs {
  return {
    entries: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
    ...overrides,
  };
}

describe('getAuditLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return paginated audit logs on success', async () => {
    const mockData = buildMockPaginatedLogs({ total: 5, totalPages: 1 });
    mockRequireAdminRole.mockResolvedValue(ADMIN_ID);
    mockFetchAuditLogsService.mockResolvedValue(mockData);

    const result = await getAuditLogs({});

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockData);
  });

  it('should pass pagination options to service', async () => {
    mockRequireAdminRole.mockResolvedValue(ADMIN_ID);
    mockFetchAuditLogsService.mockResolvedValue(buildMockPaginatedLogs());

    await getAuditLogs({ page: 2, pageSize: 10 });

    expect(mockFetchAuditLogsService).toHaveBeenCalledWith(ADMIN_ID, { page: 2, pageSize: 10 });
  });

  it('should pass filter options to service', async () => {
    mockRequireAdminRole.mockResolvedValue(ADMIN_ID);
    mockFetchAuditLogsService.mockResolvedValue(buildMockPaginatedLogs());

    await getAuditLogs({ action: 'CREATE_CLIENT', targetUserId: 'client-1' });

    expect(mockFetchAuditLogsService).toHaveBeenCalledWith(
      ADMIN_ID,
      expect.objectContaining({ action: 'CREATE_CLIENT', targetUserId: 'client-1' }),
    );
  });

  it('should return error for invalid input — page below 1', async () => {
    const result = await getAuditLogs({ page: 0 });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
    expect(mockFetchAuditLogsService).not.toHaveBeenCalled();
  });

  it('should return error for invalid input — pageSize above 100', async () => {
    const result = await getAuditLogs({ pageSize: 200 });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
    expect(mockFetchAuditLogsService).not.toHaveBeenCalled();
  });

  it('should return authentication error when not logged in', async () => {
    mockRequireAdminRole.mockRejectedValue(new AuthenticationError());

    const result = await getAuditLogs({});

    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be logged in to perform this action');
  });

  it('should return authorization error for non-admin user', async () => {
    mockRequireAdminRole.mockRejectedValue(new AuthorizationError());

    const result = await getAuditLogs({});

    expect(result.success).toBe(false);
    expect(result.error).toBe('Admin access required');
  });

  it('should return generic error for unexpected exceptions', async () => {
    mockRequireAdminRole.mockResolvedValue(ADMIN_ID);
    mockFetchAuditLogsService.mockRejectedValue(new Error('DB error'));

    const result = await getAuditLogs({});

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to load audit logs. Please try again.');
  });
});
