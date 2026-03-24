import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

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

vi.mock('@/lib/services/balance-digest.service', () => ({
  sendAllDigests: vi.fn(),
}));

import { sendAllDigests } from '@/lib/services/balance-digest.service';
import { GET } from './route';

const mockSendAllDigests = vi.mocked(sendAllDigests);

function buildRequest(authHeader?: string): NextRequest {
  const headers = new Headers();
  if (authHeader) {
    headers.set('authorization', authHeader);
  }
  return new NextRequest('http://localhost/api/cron/balance-digest', { headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockEnv.CRON_SECRET = 'test-secret';
  mockIsDevelopment = false;
});

describe('GET /api/cron/balance-digest', () => {
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

  it('should succeed with correct bearer token', async () => {
    mockSendAllDigests.mockResolvedValueOnce([
      { userId: 'u1', userEmail: 'u1@test.com', userName: 'User1', changes: [], sent: true },
      { userId: 'u2', userEmail: 'u2@test.com', userName: 'User2', changes: [], sent: false },
    ]);

    const response = await GET(buildRequest('Bearer test-secret'));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual({ processed: 2, sent: 1 });
    expect(mockSendAllDigests).toHaveBeenCalledOnce();
  });

  it('should return 500 when sendAllDigests throws', async () => {
    mockSendAllDigests.mockRejectedValueOnce(new Error('DB connection failed'));

    const response = await GET(buildRequest('Bearer test-secret'));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toEqual({ code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' });
  });

  it('should allow unauthenticated access in development when CRON_SECRET is not set', async () => {
    mockEnv.CRON_SECRET = undefined;
    mockIsDevelopment = true;

    mockSendAllDigests.mockResolvedValueOnce([]);

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
