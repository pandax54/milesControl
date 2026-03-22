import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./helpers', () => {
  class AuthenticationError extends Error {
    constructor() {
      super('Not authenticated');
      this.name = 'AuthenticationError';
    }
  }
  return {
    requireUserId: vi.fn(),
    isAuthenticationError: (error: unknown) => error instanceof AuthenticationError,
    AuthenticationError,
  };
});

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/services/notification.service', () => ({
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  NotificationNotFoundError: class extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = 'NotificationNotFoundError';
    }
  },
}));

import { revalidatePath } from 'next/cache';
import {
  markNotificationRead,
  markAllNotificationsRead,
  NotificationNotFoundError,
} from '@/lib/services/notification.service';
import { requireUserId, AuthenticationError } from './helpers';
import { markAsRead, markAllAsRead } from './notifications';

const mockRequireUserId = vi.mocked(requireUserId);
const mockMarkNotificationRead = vi.mocked(markNotificationRead);
const mockMarkAllNotificationsRead = vi.mocked(markAllNotificationsRead);
const mockRevalidatePath = vi.mocked(revalidatePath);

describe('markAsRead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUserId.mockResolvedValue('user-123');
  });

  it('should mark a notification as read successfully', async () => {
    mockMarkNotificationRead.mockResolvedValue(undefined);

    const result = await markAsRead('notif-123');

    expect(result.success).toBe(true);
    expect(mockMarkNotificationRead).toHaveBeenCalledWith('user-123', 'notif-123');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/notifications');
  });

  it('should return error for empty notificationId', async () => {
    const result = await markAsRead('');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
    expect(mockMarkNotificationRead).not.toHaveBeenCalled();
  });

  it('should return error when notification not found', async () => {
    mockMarkNotificationRead.mockRejectedValue(new NotificationNotFoundError('notif-999'));

    const result = await markAsRead('notif-999');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Notification not found');
  });

  it('should return authentication error when not logged in', async () => {
    mockRequireUserId.mockRejectedValue(new AuthenticationError());

    const result = await markAsRead('notif-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be logged in to perform this action');
  });

  it('should return generic error for unexpected failures', async () => {
    mockMarkNotificationRead.mockRejectedValue(new Error('DB error'));

    const result = await markAsRead('notif-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to mark notification as read. Please try again.');
  });
});

describe('markAllAsRead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUserId.mockResolvedValue('user-123');
  });

  it('should mark all notifications as read successfully', async () => {
    mockMarkAllNotificationsRead.mockResolvedValue(5);

    const result = await markAllAsRead();

    expect(result.success).toBe(true);
    expect(mockMarkAllNotificationsRead).toHaveBeenCalledWith('user-123');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/notifications');
  });

  it('should return authentication error when not logged in', async () => {
    mockRequireUserId.mockRejectedValue(new AuthenticationError());

    const result = await markAllAsRead();

    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be logged in to perform this action');
  });

  it('should return generic error for unexpected failures', async () => {
    mockMarkAllNotificationsRead.mockRejectedValue(new Error('DB error'));

    const result = await markAllAsRead();

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      'Failed to mark all notifications as read. Please try again.',
    );
  });
});
