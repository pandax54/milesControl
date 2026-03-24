import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// ==================== Error classes ====================

export class NotificationNotFoundError extends Error {
  constructor(notificationId: string) {
    super(`Notification not found: ${notificationId}`);
    this.name = 'NotificationNotFoundError';
  }
}

// ==================== Types ====================

export interface NotificationSummary {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly isRead: boolean;
  readonly promotionId: string | null;
  readonly sentAt: Date;
  readonly channel: string;
}

// ==================== Constants ====================

const DEFAULT_PAGE_SIZE = 50;

// ==================== Queries ====================

export async function listNotifications(
  userId: string,
  options?: { limit?: number; offset?: number },
): Promise<NotificationSummary[]> {
  const limit = options?.limit ?? DEFAULT_PAGE_SIZE;
  const offset = options?.offset ?? 0;

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { sentAt: 'desc' },
    take: limit,
    skip: offset,
    select: {
      id: true,
      title: true,
      body: true,
      isRead: true,
      promotionId: true,
      sentAt: true,
      channel: true,
    },
  });

  logger.debug({ userId, count: notifications.length }, 'Notifications listed');

  return notifications;
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

// ==================== Mutations ====================

export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<void> {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    throw new NotificationNotFoundError(notificationId);
  }

  if (notification.isRead) {
    return;
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  logger.info({ userId, notificationId }, 'Notification marked as read');
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  logger.info({ userId, count: result.count }, 'All notifications marked as read');

  return result.count;
}
