'use server';

import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';
import { markNotificationReadSchema } from '@/lib/validators/notification.schema';
import {
  markNotificationRead as markNotificationReadService,
  markAllNotificationsRead as markAllNotificationsReadService,
  NotificationNotFoundError,
} from '@/lib/services/notification.service';
import { requireUserId, isAuthenticationError, type ActionResult } from './helpers';

export async function markAsRead(notificationId: string): Promise<ActionResult> {
  const parsed = markNotificationReadSchema.safeParse({ notificationId });

  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const userId = await requireUserId();
    await markNotificationReadService(userId, parsed.data.notificationId);
    revalidatePath('/notifications');
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    if (error instanceof NotificationNotFoundError) {
      return { success: false, error: 'Notification not found' };
    }
    logger.error({ err: error }, 'Failed to mark notification as read');
    return { success: false, error: 'Failed to mark notification as read. Please try again.' };
  }
}

export async function markAllAsRead(): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await markAllNotificationsReadService(userId);
    revalidatePath('/notifications');
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    logger.error({ err: error }, 'Failed to mark all notifications as read');
    return { success: false, error: 'Failed to mark all notifications as read. Please try again.' };
  }
}
