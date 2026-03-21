import { NextRequest, NextResponse } from 'next/server';
import { env, IS_DEVELOPMENT } from '@/lib/env';
import { logger } from '@/lib/logger';
import { sendAllDigests } from '@/lib/services/balance-digest.service';

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const results = await sendAllDigests();
    const sentCount = results.filter((r) => r.sent).length;

    return NextResponse.json({
      data: {
        processed: results.length,
        sent: sentCount,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Balance digest cron failed');
    return NextResponse.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } }, { status: 500 });
  }
}

function verifyCronSecret(request: NextRequest): boolean {
  if (!env.CRON_SECRET) {
    // Only allow unauthenticated access in development
    return IS_DEVELOPMENT;
  }

  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${env.CRON_SECRET}`;
}
