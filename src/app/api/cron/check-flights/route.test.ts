import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { CheckFlightsResult } from '@/lib/services/flight-watchlist.service';

const mockEnv = { CRON_SECRET: 'test-secret' as string | undefined };
let mockIsDevelopment = false;

vi.mock('@/lib/env', () => ({
  get env() {
    return mockEnv;
  },
  get IS_DEVELOPMENT() {
    return mockIsDevelopment;
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/services/flight-watchlist.service', () => ({
  checkAllActiveWatchlistItems: vi.fn(),
}));

import { checkAllActiveWatchlistItems } from '@/lib/services/flight-watchlist.service';
import { GET } from './route';

const mockCheckAll = vi.mocked(checkAllActiveWatchlistItems);

function buildRequest(authHeader?: string): NextRequest {
  const headers = new Headers();
  if (authHeader) {
    headers.set('authorization', authHeader);
  }
  return new NextRequest('http://localhost/api/cron/check-flights', { headers });
}

function buildMockResult(overrides?: Partial<CheckFlightsResult>): CheckFlightsResult {
  return {
    totalChecked: 5,
    totalAlerts: 2,
    results: [],
    durationMs: 3000,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockEnv.CRON_SECRET = 'test-secret';
  mockIsDevelopment = false;
});

describe('GET /api/cron/check-flights', () => {
  it('should return 401 when authorization header is missing', async () => {
    const response = await GET(buildRequest());

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toEqual({ code: 'UNAUTHORIZED', message: 'Unauthorized' });
  });

  it('should return 401 when authorization header has wrong token', async () => {
    const response = await GET(buildRequest('Bearer wrong-token'));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toEqual({ code: 'UNAUTHORIZED', message: 'Unauthorized' });
  });

  it('should return 200 with result summary when token is correct', async () => {
    mockCheckAll.mockResolvedValueOnce(buildMockResult());

    const response = await GET(buildRequest('Bearer test-secret'));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.totalChecked).toBe(5);
    expect(body.data.totalAlerts).toBe(2);
    expect(body.data.durationMs).toBe(3000);
    expect(mockCheckAll).toHaveBeenCalledOnce();
  });

  it('should return 200 with zero counts when no active watchlist items exist', async () => {
    mockCheckAll.mockResolvedValueOnce(buildMockResult({ totalChecked: 0, totalAlerts: 0, durationMs: 10 }));

    const response = await GET(buildRequest('Bearer test-secret'));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.totalChecked).toBe(0);
    expect(body.data.totalAlerts).toBe(0);
  });

  it('should return 500 when checkAllActiveWatchlistItems throws', async () => {
    mockCheckAll.mockRejectedValueOnce(new Error('Database connection failed'));

    const response = await GET(buildRequest('Bearer test-secret'));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toEqual({ code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' });
  });

  it('should allow unauthenticated access in development when CRON_SECRET is not set', async () => {
    mockEnv.CRON_SECRET = undefined;
    mockIsDevelopment = true;
    mockCheckAll.mockResolvedValueOnce(buildMockResult({ totalChecked: 0, totalAlerts: 0 }));

    const response = await GET(buildRequest());

    expect(response.status).toBe(200);
  });

  it('should reject unauthenticated access in production when CRON_SECRET is not set', async () => {
    mockEnv.CRON_SECRET = undefined;
    mockIsDevelopment = false;

    const response = await GET(buildRequest());

    expect(response.status).toBe(401);
  });
});
