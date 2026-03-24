import { NextRequest, NextResponse } from 'next/server';
import { env, IS_DEVELOPMENT } from '@/lib/env';
import { logger } from '@/lib/logger';
import { checkAllActiveWatchlistItems } from '@/lib/services/flight-watchlist.service';

export const maxDuration = 300; // 5 minutes — checking many watchlist items against external APIs

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const result = await checkAllActiveWatchlistItems();

    return NextResponse.json({
      data: {
        totalChecked: result.totalChecked,
        totalAlerts: result.totalAlerts,
        durationMs: result.durationMs,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'check-flights cron failed');
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
