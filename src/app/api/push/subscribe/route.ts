import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { registerPushSubscriptionSchema } from '@/lib/validators/push-subscription.schema';
import { registerPushSubscription } from '@/lib/services/push-notification.service';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = registerPushSubscriptionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid subscription data', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    await registerPushSubscription({
      userId: session.user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.p256dh,
      auth: parsed.data.auth,
      userAgent: parsed.data.userAgent,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    logger.error({ err: error, userId: session.user.id }, 'Failed to register push subscription');
    return NextResponse.json({ error: 'Failed to register subscription' }, { status: 500 });
  }
}
