import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    alertConfig: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    promotion: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/integrations/telegram', () => ({
  sendAlertNotification: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { prisma } from '@/lib/prisma';
import { sendAlertNotification } from '@/lib/integrations/telegram';
import {
  findUserByChatId,
  sendTelegramAlerts,
  getTopPromotionsForBot,
  getUserAlertConfigs,
} from './telegram-notification.service';
import type { AlertMatchResult } from './alert-matcher.service';

const mockAlertConfigFindFirst = vi.mocked(prisma.alertConfig.findFirst);
const mockAlertConfigFindMany = vi.mocked(prisma.alertConfig.findMany);
const mockPromotionFindMany = vi.mocked(prisma.promotion.findMany);
const mockSendAlertNotification = vi.mocked(sendAlertNotification);

beforeEach(() => {
  vi.resetAllMocks();
});

// ==================== findUserByChatId ====================

describe('findUserByChatId', () => {
  it('should return user when alert config with matching chatId exists', async () => {
    const mockUser = { id: 'user-1', email: 'a@b.com', alertConfigs: [] };
    mockAlertConfigFindFirst.mockResolvedValueOnce({
      id: 'alert-1',
      telegramChatId: '12345',
      user: mockUser,
    } as never);

    const result = await findUserByChatId('12345');

    expect(result).toEqual(mockUser);
    expect(mockAlertConfigFindFirst).toHaveBeenCalledWith({
      where: { telegramChatId: '12345' },
      include: { user: { include: { alertConfigs: true } } },
    });
  });

  it('should return null when no alert config with matching chatId is found', async () => {
    mockAlertConfigFindFirst.mockResolvedValueOnce(null);

    const result = await findUserByChatId('99999');

    expect(result).toBeNull();
  });
});

// ==================== sendTelegramAlerts ====================

describe('sendTelegramAlerts', () => {
  it('should return zeros when no TELEGRAM matches are present', async () => {
    const matches: AlertMatchResult[] = [
      {
        alertConfigId: 'alert-1',
        userId: 'user-1',
        promotionId: 'promo-1',
        channels: ['IN_APP'],
        notificationTitle: 'Alert',
        notificationBody: 'Body',
      },
    ];

    const result = await sendTelegramAlerts(matches);

    expect(result).toEqual({ attempted: 0, succeeded: 0, failed: 0 });
    expect(mockAlertConfigFindMany).not.toHaveBeenCalled();
  });

  it('should send notifications for TELEGRAM matches with configured chatIds', async () => {
    const matches: AlertMatchResult[] = [
      {
        alertConfigId: 'alert-1',
        userId: 'user-1',
        promotionId: 'promo-1',
        channels: ['TELEGRAM'],
        notificationTitle: 'Big Bonus!',
        notificationBody: 'Details here',
      },
    ];

    mockAlertConfigFindMany.mockResolvedValueOnce([
      { id: 'alert-1', telegramChatId: '12345' },
    ] as never);

    mockSendAlertNotification.mockResolvedValueOnce(true);

    const result = await sendTelegramAlerts(matches);

    expect(result).toEqual({ attempted: 1, succeeded: 1, failed: 0 });
    expect(mockSendAlertNotification).toHaveBeenCalledWith('12345', 'Big Bonus!', 'Details here');
  });

  it('should count as failed when alert config has no chatId', async () => {
    const matches: AlertMatchResult[] = [
      {
        alertConfigId: 'alert-1',
        userId: 'user-1',
        promotionId: 'promo-1',
        channels: ['TELEGRAM'],
        notificationTitle: 'Alert',
        notificationBody: 'Body',
      },
    ];

    // No configs returned — chatId is null/missing
    mockAlertConfigFindMany.mockResolvedValueOnce([]);

    const result = await sendTelegramAlerts(matches);

    expect(result).toEqual({ attempted: 1, succeeded: 0, failed: 1 });
    expect(mockSendAlertNotification).not.toHaveBeenCalled();
  });

  it('should count as failed when sendAlertNotification returns false', async () => {
    const matches: AlertMatchResult[] = [
      {
        alertConfigId: 'alert-1',
        userId: 'user-1',
        promotionId: 'promo-1',
        channels: ['TELEGRAM'],
        notificationTitle: 'Alert',
        notificationBody: 'Body',
      },
    ];

    mockAlertConfigFindMany.mockResolvedValueOnce([
      { id: 'alert-1', telegramChatId: '12345' },
    ] as never);

    mockSendAlertNotification.mockResolvedValueOnce(false);

    const result = await sendTelegramAlerts(matches);

    expect(result).toEqual({ attempted: 1, succeeded: 0, failed: 1 });
  });

  it('should handle multiple TELEGRAM matches with different chatIds', async () => {
    const matches: AlertMatchResult[] = [
      {
        alertConfigId: 'alert-1',
        userId: 'user-1',
        promotionId: 'promo-1',
        channels: ['TELEGRAM'],
        notificationTitle: 'Alert 1',
        notificationBody: 'Body 1',
      },
      {
        alertConfigId: 'alert-2',
        userId: 'user-2',
        promotionId: 'promo-1',
        channels: ['TELEGRAM', 'IN_APP'],
        notificationTitle: 'Alert 2',
        notificationBody: 'Body 2',
      },
    ];

    mockAlertConfigFindMany.mockResolvedValueOnce([
      { id: 'alert-1', telegramChatId: '11111' },
      { id: 'alert-2', telegramChatId: '22222' },
    ] as never);

    mockSendAlertNotification.mockResolvedValue(true);

    const result = await sendTelegramAlerts(matches);

    expect(result).toEqual({ attempted: 2, succeeded: 2, failed: 0 });
    expect(mockSendAlertNotification).toHaveBeenCalledTimes(2);
  });

  it('should deduplicate alertConfigIds when querying the database', async () => {
    const matches: AlertMatchResult[] = [
      {
        alertConfigId: 'alert-1',
        userId: 'user-1',
        promotionId: 'promo-1',
        channels: ['TELEGRAM'],
        notificationTitle: 'Alert A',
        notificationBody: 'Body A',
      },
      {
        alertConfigId: 'alert-1',
        userId: 'user-1',
        promotionId: 'promo-2',
        channels: ['TELEGRAM'],
        notificationTitle: 'Alert B',
        notificationBody: 'Body B',
      },
    ];

    mockAlertConfigFindMany.mockResolvedValueOnce([
      { id: 'alert-1', telegramChatId: '12345' },
    ] as never);

    mockSendAlertNotification.mockResolvedValue(true);

    await sendTelegramAlerts(matches);

    // Should query with deduplicated IDs
    expect(mockAlertConfigFindMany).toHaveBeenCalledWith({
      where: { id: { in: ['alert-1'] }, telegramChatId: { not: null } },
      select: { id: true, telegramChatId: true },
    });
  });
});

// ==================== getTopPromotionsForBot ====================

describe('getTopPromotionsForBot', () => {
  it('should query active promotions sorted by costPerMilheiro ascending', async () => {
    mockPromotionFindMany.mockResolvedValueOnce([]);

    await getTopPromotionsForBot();

    expect(mockPromotionFindMany).toHaveBeenCalledWith({
      where: { status: 'ACTIVE' },
      orderBy: { costPerMilheiro: 'asc' },
      take: 5,
      include: {
        sourceProgram: { select: { name: true } },
        destProgram: { select: { name: true } },
      },
    });
  });

  it('should accept a custom limit', async () => {
    mockPromotionFindMany.mockResolvedValueOnce([]);

    await getTopPromotionsForBot(3);

    expect(mockPromotionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 }),
    );
  });
});

// ==================== getUserAlertConfigs ====================

describe('getUserAlertConfigs', () => {
  it('should query active alert configs for a user', async () => {
    mockAlertConfigFindMany.mockResolvedValueOnce([]);

    await getUserAlertConfigs('user-1');

    expect(mockAlertConfigFindMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  });
});
