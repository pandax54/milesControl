import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/env', () => ({
  env: {
    TELEGRAM_BOT_TOKEN: 'test-token',
    CRON_SECRET: 'test-secret',
  },
  IS_DEVELOPMENT: false,
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/integrations/telegram', () => ({
  sendMessage: vi.fn().mockResolvedValue(true),
  sendAlertNotification: vi.fn().mockResolvedValue(true),
  escapeHtml: (text: string) =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
}));

vi.mock('@/lib/services/telegram-notification.service', () => ({
  findUserByChatId: vi.fn(),
  getTopPromotionsForBot: vi.fn(),
  getUserAlertConfigs: vi.fn(),
}));

vi.mock('@/lib/services/cost-calculator.service', () => ({
  calculateCostPerMilheiro: vi.fn(),
}));

import { POST } from './route';
import { sendMessage } from '@/lib/integrations/telegram';
import {
  findUserByChatId,
  getTopPromotionsForBot,
  getUserAlertConfigs,
} from '@/lib/services/telegram-notification.service';
import { calculateCostPerMilheiro } from '@/lib/services/cost-calculator.service';

const mockSendMessage = vi.mocked(sendMessage);
const mockFindUserByChatId = vi.mocked(findUserByChatId);
const mockGetTopPromotionsForBot = vi.mocked(getTopPromotionsForBot);
const mockGetUserAlertConfigs = vi.mocked(getUserAlertConfigs);
const mockCalculateCostPerMilheiro = vi.mocked(calculateCostPerMilheiro);

function makeRequest(body: unknown, secretHeader?: string): NextRequest {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };

  if (secretHeader !== undefined) {
    headers['x-telegram-bot-api-secret-token'] = secretHeader;
  }

  return new NextRequest('http://localhost/api/webhook/telegram', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function makeTelegramUpdate(text: string, chatId = 99999, firstName = 'John') {
  return {
    update_id: 1,
    message: {
      message_id: 1,
      from: { id: chatId, first_name: firstName },
      chat: { id: chatId, type: 'private' },
      text,
    },
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mockSendMessage.mockResolvedValue(true);
});

// ==================== Authorization ====================

describe('POST /api/webhook/telegram — authorization', () => {
  it('should return 401 when secret header is missing', async () => {
    const request = makeRequest(makeTelegramUpdate('/start'));

    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('should return 401 when secret header is wrong', async () => {
    const request = makeRequest(makeTelegramUpdate('/start'), 'wrong-secret');

    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('should process request when correct secret header is provided', async () => {
    const request = makeRequest(makeTelegramUpdate('/start'), 'test-secret');

    const response = await POST(request);

    expect(response.status).toBe(200);
  });
});

// ==================== /start command ====================

describe('POST /api/webhook/telegram — /start', () => {
  it('should reply with welcome message including chat ID', async () => {
    const request = makeRequest(makeTelegramUpdate('/start', 12345, 'Maria'), 'test-secret');

    await POST(request);

    expect(mockSendMessage).toHaveBeenCalledOnce();
    const [calledChatId, calledText] = mockSendMessage.mock.calls[0];
    expect(calledChatId).toBe(12345);
    expect(calledText).toContain('12345');
    expect(calledText).toContain('Maria');
    expect(calledText).toContain('/alerts');
    expect(calledText).toContain('/promos');
    expect(calledText).toContain('/calc');
  });

  it('should handle /start with bot username suffix', async () => {
    const update = makeTelegramUpdate('/start@MilesControlBot', 12345, 'Maria');
    const request = makeRequest(update, 'test-secret');

    await POST(request);

    expect(mockSendMessage).toHaveBeenCalledOnce();
  });
});

// ==================== /alerts command ====================

describe('POST /api/webhook/telegram — /alerts', () => {
  it('should reply with no-config message when user not found', async () => {
    mockFindUserByChatId.mockResolvedValueOnce(null);

    const request = makeRequest(makeTelegramUpdate('/alerts', 12345), 'test-secret');
    await POST(request);

    expect(mockSendMessage).toHaveBeenCalledOnce();
    const text = mockSendMessage.mock.calls[0][1];
    expect(text).toContain('No alert rules found');
  });

  it('should reply with no-alerts message when user has no active alerts', async () => {
    mockFindUserByChatId.mockResolvedValueOnce({ id: 'user-1' } as never);
    mockGetUserAlertConfigs.mockResolvedValueOnce([]);

    const request = makeRequest(makeTelegramUpdate('/alerts', 12345), 'test-secret');
    await POST(request);

    const text = mockSendMessage.mock.calls[0][1];
    expect(text).toContain('no active alert rules');
  });

  it('should list active alert configs for the user', async () => {
    mockFindUserByChatId.mockResolvedValueOnce({ id: 'user-1' } as never);
    mockGetUserAlertConfigs.mockResolvedValueOnce([
      {
        id: 'alert-1',
        name: 'Smiles Bonus Alert',
        programNames: ['Smiles', 'Livelo'],
        promoTypes: ['TRANSFER_BONUS'],
        minBonusPercent: 80,
        maxCostPerMilheiro: null,
        isActive: true,
      },
    ] as never);

    const request = makeRequest(makeTelegramUpdate('/alerts', 12345), 'test-secret');
    await POST(request);

    const text = mockSendMessage.mock.calls[0][1];
    expect(text).toContain('Smiles Bonus Alert');
    expect(text).toContain('Smiles');
    expect(text).toContain('80');
  });
});

// ==================== /promos command ====================

describe('POST /api/webhook/telegram — /promos', () => {
  it('should reply with no-promos message when there are no active promotions', async () => {
    mockGetTopPromotionsForBot.mockResolvedValueOnce([]);

    const request = makeRequest(makeTelegramUpdate('/promos', 12345), 'test-secret');
    await POST(request);

    const text = mockSendMessage.mock.calls[0][1];
    expect(text).toContain('No active promotions');
  });

  it('should list top promotions', async () => {
    mockGetTopPromotionsForBot.mockResolvedValueOnce([
      {
        id: 'promo-1',
        title: 'Livelo → Smiles 90%',
        bonusPercent: 90,
        costPerMilheiro: 14.7,
        deadline: new Date('2026-12-31'),
        sourceProgram: { name: 'Livelo' },
        destProgram: { name: 'Smiles' },
      },
    ] as never);

    const request = makeRequest(makeTelegramUpdate('/promos', 12345), 'test-secret');
    await POST(request);

    const text = mockSendMessage.mock.calls[0][1];
    expect(text).toContain('Livelo');
    expect(text).toContain('Smiles');
    expect(text).toContain('90');
  });
});

// ==================== /calc command ====================

describe('POST /api/webhook/telegram — /calc', () => {
  it('should reply with usage when no args provided', async () => {
    const request = makeRequest(makeTelegramUpdate('/calc', 12345), 'test-secret');
    await POST(request);

    const text = mockSendMessage.mock.calls[0][1];
    expect(text).toContain('Usage');
  });

  it('should reply with usage when only one arg provided', async () => {
    const request = makeRequest(makeTelegramUpdate('/calc 28', 12345), 'test-secret');
    await POST(request);

    const text = mockSendMessage.mock.calls[0][1];
    expect(text).toContain('Usage');
  });

  it('should reply with error when args are not numbers', async () => {
    const request = makeRequest(makeTelegramUpdate('/calc abc xyz', 12345), 'test-secret');
    await POST(request);

    const text = mockSendMessage.mock.calls[0][1];
    expect(text).toContain('Invalid');
  });

  it('should calculate and reply with cost per milheiro', async () => {
    mockCalculateCostPerMilheiro.mockReturnValueOnce({
      totalCost: 14.74,
      totalMiles: 1900,
      costPerMilheiro: 7.76,
      rating: 'EXCELLENT',
    });

    const request = makeRequest(makeTelegramUpdate('/calc 28 90', 12345), 'test-secret');
    await POST(request);

    expect(mockCalculateCostPerMilheiro).toHaveBeenCalledWith({
      purchasePricePerPoint: 0.028,
      quantity: 1000,
      transferBonusPercent: 90,
    });

    const text = mockSendMessage.mock.calls[0][1];
    expect(text).toContain('7.76');
    expect(text).toContain('EXCELLENT');
    expect(text).toContain('🟢');
  });
});

// ==================== Unknown command ====================

describe('POST /api/webhook/telegram — unknown command', () => {
  it('should reply with unknown command message', async () => {
    const request = makeRequest(makeTelegramUpdate('/unknown', 12345), 'test-secret');
    await POST(request);

    const text = mockSendMessage.mock.calls[0][1];
    expect(text).toContain('Unknown command');
  });
});

// ==================== Edge cases ====================

describe('POST /api/webhook/telegram — edge cases', () => {
  it('should return 400 for invalid JSON body', async () => {
    const request = new NextRequest('http://localhost/api/webhook/telegram', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-telegram-bot-api-secret-token': 'test-secret',
      },
      body: 'not-json',
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('should return 200 and not send a message when update has no message text', async () => {
    const update = { update_id: 1, message: { message_id: 1, chat: { id: 12345, type: 'private' } } };
    const request = makeRequest(update, 'test-secret');

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('should return 200 even when command handler throws an error', async () => {
    mockFindUserByChatId.mockRejectedValueOnce(new Error('DB error'));

    const request = makeRequest(makeTelegramUpdate('/alerts', 12345), 'test-secret');
    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it('should return 200 for updates without message field', async () => {
    const update = { update_id: 1 };
    const request = makeRequest(update, 'test-secret');

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockSendMessage).not.toHaveBeenCalled();
  });
});
