import { NextRequest, NextResponse } from 'next/server';
import { env, IS_DEVELOPMENT } from '@/lib/env';
import { logger } from '@/lib/logger';
import { runAllScrapers } from '@/lib/services/scrape-promos.service';

export const maxDuration = 300; // 5 minutes — scrapers run sequentially with rate limiting

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const result = await runAllScrapers();

    return NextResponse.json({
      data: {
        scrapers: result.scrapers.map((s) => ({
          name: s.scraperName,
          skipped: s.skipped,
          skipReason: s.skipReason,
          itemsFound: s.itemsFound,
          created: s.storage?.created ?? 0,
          updated: s.storage?.updated ?? 0,
          error: s.error,
        })),
        expiredCount: result.expiredCount,
        totalCreated: result.totalCreated,
        totalUpdated: result.totalUpdated,
        totalFailed: result.totalFailed,
        durationMs: result.durationMs,
        alertMatchResult: result.alertMatchResult,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Scrape-promos cron failed');
    return NextResponse.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } }, { status: 500 });
  }
}

function verifyCronSecret(request: NextRequest): boolean {
  if (!env.CRON_SECRET) {
    return IS_DEVELOPMENT;
  }

  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${env.CRON_SECRET}`;
}
