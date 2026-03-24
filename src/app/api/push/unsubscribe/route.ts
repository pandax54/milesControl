import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { unregisterPushSubscriptionSchema } from '@/lib/validators/push-subscription.schema';
import {
  unregisterPushSubscription,
  PushSubscriptionNotFoundError,
} from '@/lib/services/push-notification.service';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = unregisterPushSubscriptionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request data', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    await unregisterPushSubscription(session.user.id, parsed.data.endpoint);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof PushSubscriptionNotFoundError) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }
    logger.error({ err: error, userId: session.user.id }, 'Failed to unregister push subscription');
    return NextResponse.json({ error: 'Failed to unregister subscription' }, { status: 500 });
  }
}
