import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AlertChannel } from '@/generated/prisma/client';
import {
  listNotifications,
  countUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  NotificationNotFoundError,
} from './notification.service';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    notification: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const { prisma } = await import('@/lib/prisma');

const makeNotification = (overrides: object = {}) => ({
  id: 'notif-1',
  userId: 'user-1',
  title: 'Transfer bonus: Livelo → Smiles',
  body: 'Min transfer: 1,000 pts · Deadline: 31/12/2026',
  isRead: false,
  promotionId: 'promo-1',
  sentAt: new Date('2026-03-20T10:00:00Z'),
  channel: 'IN_APP' as AlertChannel,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listNotifications', () => {
  it('should return notifications for the user ordered by sentAt desc', async () => {
    const notifications = [makeNotification(), makeNotification({ id: 'notif-2', isRead: true })];
    vi.mocked(prisma.notification.findMany).mockResolvedValue(notifications);

    const result = await listNotifications('user-1');

    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { sentAt: 'desc' },
      take: 50,
      skip: 0,
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
    expect(result).toEqual(notifications);
  });

  it('should apply custom limit and offset', async () => {
    vi.mocked(prisma.notification.findMany).mockResolvedValue([]);

    await listNotifications('user-1', { limit: 10, offset: 20 });

    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, skip: 20 }),
    );
  });

  it('should return empty array when no notifications exist', async () => {
    vi.mocked(prisma.notification.findMany).mockResolvedValue([]);

    const result = await listNotifications('user-1');

    expect(result).toEqual([]);
  });
});

describe('countUnreadNotifications', () => {
  it('should return the count of unread notifications', async () => {
    vi.mocked(prisma.notification.count).mockResolvedValue(3);

    const result = await countUnreadNotifications('user-1');

    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: { userId: 'user-1', isRead: false },
    });
    expect(result).toBe(3);
  });

  it('should return 0 when all notifications are read', async () => {
    vi.mocked(prisma.notification.count).mockResolvedValue(0);

    const result = await countUnreadNotifications('user-1');

    expect(result).toBe(0);
  });
});

describe('markNotificationRead', () => {
  it('should mark an unread notification as read', async () => {
    const notification = makeNotification({ isRead: false });
    vi.mocked(prisma.notification.findFirst).mockResolvedValue(notification);
    vi.mocked(prisma.notification.update).mockResolvedValue({ ...notification, isRead: true });

    await markNotificationRead('user-1', 'notif-1');

    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'notif-1' },
      data: { isRead: true },
    });
  });

  it('should be a no-op when notification is already read', async () => {
    const notification = makeNotification({ isRead: true });
    vi.mocked(prisma.notification.findFirst).mockResolvedValue(notification);

    await markNotificationRead('user-1', 'notif-1');

    expect(prisma.notification.update).not.toHaveBeenCalled();
  });

  it('should throw NotificationNotFoundError when notification does not exist', async () => {
    vi.mocked(prisma.notification.findFirst).mockResolvedValue(null);

    await expect(markNotificationRead('user-1', 'nonexistent')).rejects.toThrow(
      NotificationNotFoundError,
    );
  });

  it('should throw NotificationNotFoundError when notification belongs to another user', async () => {
    vi.mocked(prisma.notification.findFirst).mockResolvedValue(null);

    await expect(markNotificationRead('user-2', 'notif-1')).rejects.toThrow(
      NotificationNotFoundError,
    );
  });
});

describe('markAllNotificationsRead', () => {
  it('should mark all unread notifications as read and return count', async () => {
    vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 5 });

    const result = await markAllNotificationsRead('user-1');

    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', isRead: false },
      data: { isRead: true },
    });
    expect(result).toBe(5);
  });

  it('should return 0 when no unread notifications exist', async () => {
    vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 0 });

    const result = await markAllNotificationsRead('user-1');

    expect(result).toBe(0);
  });
});
