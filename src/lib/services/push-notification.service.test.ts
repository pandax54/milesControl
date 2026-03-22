import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AlertChannel } from '@/generated/prisma/client';

// ==================== Mocks ====================

vi.mock('@/lib/prisma', () => ({
  prisma: {
    pushSubscription: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/integrations/web-push', () => ({
  sendPushNotification: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { prisma } from '@/lib/prisma';
import { sendPushNotification } from '@/lib/integrations/web-push';
import {
  registerPushSubscription,
  unregisterPushSubscription,
  removeExpiredPushSubscription,
  listPushSubscriptions,
  sendWebPushAlerts,
  PushSubscriptionNotFoundError,
} from './push-notification.service';
import type { AlertMatchResult } from './alert-matcher.service';

const mockUpsert = vi.mocked(prisma.pushSubscription.upsert);
const mockFindFirst = vi.mocked(prisma.pushSubscription.findFirst);
const mockDelete = vi.mocked(prisma.pushSubscription.delete);
const mockDeleteMany = vi.mocked(prisma.pushSubscription.deleteMany);
const mockFindMany = vi.mocked(prisma.pushSubscription.findMany);
const mockSendPush = vi.mocked(sendPushNotification);

// ==================== Factories ====================

function buildMatch(overrides: Partial<AlertMatchResult> = {}): AlertMatchResult {
  return {
    alertConfigId: 'alert-1',
    userId: 'user-1',
    promotionId: 'promo-1',
    channels: ['WEB_PUSH'] as AlertChannel[],
    notificationTitle: '90% transfer bonus: Livelo → Smiles',
    notificationBody: 'Min transfer: 1,000 pts · Source: Passageiro de Primeira',
    ...overrides,
  };
}

function buildDbSubscription(overrides: Partial<{ endpoint: string; p256dh: string; auth: string; userId: string }> = {}) {
  return {
    endpoint: 'https://push.example.com/abc123',
    p256dh: 'public-key',
    auth: 'auth-key',
    userId: 'user-1',
    ...overrides,
  };
}

// ==================== registerPushSubscription ====================

describe('registerPushSubscription', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should upsert subscription by endpoint', async () => {
    mockUpsert.mockResolvedValue({} as never);

    await registerPushSubscription({
      userId: 'user-1',
      endpoint: 'https://push.example.com/abc',
      p256dh: 'key123',
      auth: 'auth123',
    });

    expect(mockUpsert).toHaveBeenCalledWith({
      where: { endpoint: 'https://push.example.com/abc' },
      create: expect.objectContaining({
        userId: 'user-1',
        endpoint: 'https://push.example.com/abc',
        p256dh: 'key123',
        auth: 'auth123',
      }),
      update: expect.objectContaining({
        userId: 'user-1',
        p256dh: 'key123',
        auth: 'auth123',
      }),
    });
  });

  it('should store userAgent when provided', async () => {
    mockUpsert.mockResolvedValue({} as never);

    await registerPushSubscription({
      userId: 'user-1',
      endpoint: 'https://push.example.com/abc',
      p256dh: 'key',
      auth: 'auth',
      userAgent: 'Mozilla/5.0',
    });

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ userAgent: 'Mozilla/5.0' }),
      }),
    );
  });
});

// ==================== unregisterPushSubscription ====================

describe('unregisterPushSubscription', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should delete the subscription when it belongs to the user', async () => {
    mockFindFirst.mockResolvedValue(buildDbSubscription() as never);
    mockDelete.mockResolvedValue({} as never);

    await unregisterPushSubscription('user-1', 'https://push.example.com/abc123');

    expect(mockDelete).toHaveBeenCalledWith({
      where: { endpoint: 'https://push.example.com/abc123' },
    });
  });

  it('should throw PushSubscriptionNotFoundError when subscription is not found', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      unregisterPushSubscription('user-1', 'https://push.example.com/nonexistent'),
    ).rejects.toThrow(PushSubscriptionNotFoundError);
  });

  it('should throw PushSubscriptionNotFoundError when subscription belongs to another user', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      unregisterPushSubscription('user-2', 'https://push.example.com/abc123'),
    ).rejects.toThrow(PushSubscriptionNotFoundError);
  });

  it('should not delete when subscription is not found', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      unregisterPushSubscription('user-1', 'https://push.example.com/abc123'),
    ).rejects.toThrow();

    expect(mockDelete).not.toHaveBeenCalled();
  });
});

// ==================== removeExpiredPushSubscription ====================

describe('removeExpiredPushSubscription', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should delete the subscription by endpoint using deleteMany', async () => {
    mockDeleteMany.mockResolvedValue({ count: 1 });

    await removeExpiredPushSubscription('https://push.example.com/expired');

    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { endpoint: 'https://push.example.com/expired' },
    });
  });

  it('should not throw when subscription does not exist', async () => {
    mockDeleteMany.mockResolvedValue({ count: 0 });

    await expect(
      removeExpiredPushSubscription('https://push.example.com/nonexistent'),
    ).resolves.toBeUndefined();
  });
});

// ==================== listPushSubscriptions ====================

describe('listPushSubscriptions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return subscriptions for the user', async () => {
    const now = new Date();
    mockFindMany.mockResolvedValue([
      { id: 'sub-1', endpoint: 'https://push.example.com/abc', userAgent: 'Chrome', createdAt: now },
    ] as never);

    const result = await listPushSubscriptions('user-1');

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      select: { id: true, endpoint: true, userAgent: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toHaveLength(1);
    expect(result[0].endpoint).toBe('https://push.example.com/abc');
  });

  it('should return empty array when user has no subscriptions', async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await listPushSubscriptions('user-no-subs');

    expect(result).toEqual([]);
  });
});

// ==================== sendWebPushAlerts ====================

describe('sendWebPushAlerts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return zeroed result when no matches have WEB_PUSH channel', async () => {
    const matches = [
      buildMatch({ channels: ['IN_APP'] as AlertChannel[] }),
      buildMatch({ channels: ['EMAIL'] as AlertChannel[] }),
    ];

    const result = await sendWebPushAlerts(matches);

    expect(result).toEqual({ attempted: 0, succeeded: 0, failed: 0, expiredRemoved: 0 });
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it('should return zeroed result when matches list is empty', async () => {
    const result = await sendWebPushAlerts([]);

    expect(result).toEqual({ attempted: 0, succeeded: 0, failed: 0, expiredRemoved: 0 });
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it('should return zeroed result when user has no push subscriptions', async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await sendWebPushAlerts([buildMatch()]);

    expect(result).toEqual({ attempted: 0, succeeded: 0, failed: 0, expiredRemoved: 0 });
    expect(mockSendPush).not.toHaveBeenCalled();
  });

  it('should send a push notification to each user subscription', async () => {
    mockFindMany.mockResolvedValue([buildDbSubscription()] as never);
    mockSendPush.mockResolvedValue(true);

    const result = await sendWebPushAlerts([buildMatch()]);

    expect(result).toEqual({ attempted: 1, succeeded: 1, failed: 0, expiredRemoved: 0 });
    expect(mockSendPush).toHaveBeenCalledOnce();
    expect(mockSendPush).toHaveBeenCalledWith(
      { endpoint: 'https://push.example.com/abc123', p256dh: 'public-key', auth: 'auth-key' },
      expect.objectContaining({
        title: '90% transfer bonus: Livelo → Smiles',
        body: 'Min transfer: 1,000 pts · Source: Passageiro de Primeira',
        tag: 'promo-1',
      }),
    );
  });

  it('should send to all subscriptions when user has multiple devices', async () => {
    mockFindMany.mockResolvedValue([
      buildDbSubscription({ endpoint: 'https://push.example.com/device1' }),
      buildDbSubscription({ endpoint: 'https://push.example.com/device2' }),
    ] as never);
    mockSendPush.mockResolvedValue(true);

    const result = await sendWebPushAlerts([buildMatch()]);

    expect(result.attempted).toBe(2);
    expect(result.succeeded).toBe(2);
    expect(mockSendPush).toHaveBeenCalledTimes(2);
  });

  it('should remove expired subscription and count it when send returns false', async () => {
    mockFindMany.mockResolvedValue([buildDbSubscription()] as never);
    mockSendPush.mockResolvedValue(false);
    mockDeleteMany.mockResolvedValue({ count: 1 });

    const result = await sendWebPushAlerts([buildMatch()]);

    expect(result).toEqual({ attempted: 1, succeeded: 0, failed: 1, expiredRemoved: 1 });
    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { endpoint: 'https://push.example.com/abc123' },
    });
  });

  it('should handle mixed success and failure across multiple subscriptions', async () => {
    mockFindMany.mockResolvedValue([
      buildDbSubscription({ endpoint: 'https://push.example.com/device1', userId: 'user-1' }),
      buildDbSubscription({ endpoint: 'https://push.example.com/device2', userId: 'user-1' }),
    ] as never);
    mockSendPush
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    mockDeleteMany.mockResolvedValue({ count: 1 });

    const result = await sendWebPushAlerts([buildMatch()]);

    expect(result).toEqual({ attempted: 2, succeeded: 1, failed: 1, expiredRemoved: 1 });
  });

  it('should only fetch subscriptions for users with WEB_PUSH matches', async () => {
    mockFindMany.mockResolvedValue([buildDbSubscription()] as never);
    mockSendPush.mockResolvedValue(true);

    const matches = [
      buildMatch({ userId: 'user-1', channels: ['WEB_PUSH'] as AlertChannel[] }),
      buildMatch({ userId: 'user-2', channels: ['EMAIL'] as AlertChannel[] }),
    ];
    await sendWebPushAlerts(matches);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: { in: ['user-1'] } },
      }),
    );
  });

  it('should send to each matched user independently', async () => {
    mockFindMany.mockResolvedValue([
      buildDbSubscription({ endpoint: 'https://push.example.com/u1', userId: 'user-1' }),
      buildDbSubscription({ endpoint: 'https://push.example.com/u2', userId: 'user-2' }),
    ] as never);
    mockSendPush.mockResolvedValue(true);

    const matches = [
      buildMatch({ userId: 'user-1', promotionId: 'promo-1' }),
      buildMatch({ userId: 'user-2', promotionId: 'promo-1' }),
    ];
    const result = await sendWebPushAlerts(matches);

    expect(result.attempted).toBe(2);
    expect(result.succeeded).toBe(2);
  });
});
