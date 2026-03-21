import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { ScrapePromosResult } from '@/lib/services/scrape-promos.service';

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

vi.mock('@/lib/services/scrape-promos.service', () => ({
  runAllScrapers: vi.fn(),
}));

import { runAllScrapers } from '@/lib/services/scrape-promos.service';
import { GET } from './route';

const mockRunAllScrapers = vi.mocked(runAllScrapers);

function buildRequest(authHeader?: string): NextRequest {
  const headers = new Headers();
  if (authHeader) {
    headers.set('authorization', authHeader);
  }
  return new NextRequest('http://localhost/api/cron/scrape-promos', { headers });
}

function buildMockResult(overrides?: Partial<ScrapePromosResult>): ScrapePromosResult {
  return {
    scrapers: [
      {
        scraperName: 'Passageiro de Primeira',
        skipped: false,
        itemsFound: 3,
        storage: { created: 2, updated: 1, duplicates: 0, failed: 0, total: 3 },
      },
      {
        scraperName: 'Melhores Cartões',
        skipped: true,
        skipReason: '3 consecutive failures',
        itemsFound: 0,
      },
    ],
    expiredCount: 1,
    totalCreated: 2,
    totalUpdated: 1,
    totalFailed: 0,
    durationMs: 5000,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockEnv.CRON_SECRET = 'test-secret';
  mockIsDevelopment = false;
});

describe('GET /api/cron/scrape-promos', () => {
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

  it('should succeed with correct bearer token and return scraper results', async () => {
    mockRunAllScrapers.mockResolvedValueOnce(buildMockResult());

    const response = await GET(buildRequest('Bearer test-secret'));

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.data.totalCreated).toBe(2);
    expect(body.data.totalUpdated).toBe(1);
    expect(body.data.totalFailed).toBe(0);
    expect(body.data.expiredCount).toBe(1);
    expect(body.data.durationMs).toBe(5000);
    expect(body.data.scrapers).toHaveLength(2);
    expect(body.data.scrapers[0].name).toBe('Passageiro de Primeira');
    expect(body.data.scrapers[0].created).toBe(2);
    expect(body.data.scrapers[1].skipped).toBe(true);
    expect(body.data.scrapers[1].skipReason).toBe('3 consecutive failures');
    expect(mockRunAllScrapers).toHaveBeenCalledOnce();
  });

  it('should return 500 when runAllScrapers throws', async () => {
    mockRunAllScrapers.mockRejectedValueOnce(new Error('Critical failure'));

    const response = await GET(buildRequest('Bearer test-secret'));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toEqual({ code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' });
  });

  it('should allow unauthenticated access in development when CRON_SECRET is not set', async () => {
    mockEnv.CRON_SECRET = undefined;
    mockIsDevelopment = true;
    mockRunAllScrapers.mockResolvedValueOnce(buildMockResult({ scrapers: [], totalCreated: 0 }));

    const response = await GET(buildRequest());

    expect(response.status).toBe(200);
  });

  it('should reject unauthenticated access in production when CRON_SECRET is not set', async () => {
    mockEnv.CRON_SECRET = undefined;
    mockIsDevelopment = false;

    const response = await GET(buildRequest());

    expect(response.status).toBe(401);
  });

  it('should map scraper error field in response', async () => {
    mockRunAllScrapers.mockResolvedValueOnce(
      buildMockResult({
        scrapers: [
          {
            scraperName: 'Broken Scraper',
            skipped: false,
            itemsFound: 0,
            error: 'Network timeout',
          },
        ],
      }),
    );

    const response = await GET(buildRequest('Bearer test-secret'));

    const body = await response.json();
    expect(body.data.scrapers[0].error).toBe('Network timeout');
    expect(body.data.scrapers[0].created).toBe(0);
  });
});
