import { NextResponse } from 'next/server';
import { getVapidPublicKey } from '@/lib/integrations/web-push';

export function GET(): NextResponse {
  const publicKey = getVapidPublicKey();

  if (!publicKey) {
    return NextResponse.json(
      { error: 'Web push notifications are not configured' },
      { status: 503 },
    );
  }

  return NextResponse.json({ publicKey });
}
