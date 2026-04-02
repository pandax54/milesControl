import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    promotion: {
      findUnique: vi.fn(),
    },
    notification: {
      create: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { prisma } from '@/lib/prisma';
import {
  sendRecommendation,
  sendBatchRecommendations,
  ClientNotManagedByAdminError,
} from './admin-recommendation.service';
import { ClientNotFoundError } from './client-management.service';
import { PromotionNotFoundError } from './promotion.service';

// ==================== Mocked functions ====================

const mockUserFindFirst = vi.mocked(prisma.user.findFirst);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockUserFindMany = vi.mocked(prisma.user.findMany);
const mockPromotionFindUnique = vi.mocked(prisma.promotion.findUnique);
const mockNotificationCreate = vi.mocked(prisma.notification.create);

// ==================== Factories ====================

function buildMockPromotion(overrides: {
  id?: string;
  title?: string;
  bonusPercent?: number | null;
  sourceProgram?: { name: string } | null;
  destProgram?: { name: string } | null;
} = {}) {
  return {
    id: overrides.id ?? 'promo-1',
    title: overrides.title ?? 'Test Promotion',
    bonusPercent: overrides.bonusPercent ?? 90,
    sourceProgram: overrides.sourceProgram !== undefined ? overrides.sourceProgram : { name: 'Livelo' },
    destProgram: overrides.destProgram !== undefined ? overrides.destProgram : { name: 'Smiles' },
  };
}

// ==================== sendRecommendation ====================

describe('sendRecommendation', () => {
  const ADMIN_ID = 'admin-1';
  const CLIENT_ID = 'client-1';
  const PROMO_ID = 'promo-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a notification when client is managed by admin', async () => {
    mockUserFindFirst.mockResolvedValue({ id: CLIENT_ID } as never);
    mockPromotionFindUnique.mockResolvedValue(buildMockPromotion() as never);
    mockNotificationCreate.mockResolvedValue({} as never);

    await sendRecommendation(ADMIN_ID, CLIENT_ID, PROMO_ID);

    expect(mockNotificationCreate).toHaveBeenCalledWith({
      data: {
        userId: CLIENT_ID,
        title: expect.stringContaining('Test Promotion'),
        body: expect.any(String),
        channel: 'IN_APP',
        promotionId: PROMO_ID,
      },
    });
  });

  it('should include custom message in notification body', async () => {
    mockUserFindFirst.mockResolvedValue({ id: CLIENT_ID } as never);
    mockPromotionFindUnique.mockResolvedValue(buildMockPromotion() as never);
    mockNotificationCreate.mockResolvedValue({} as never);

    const customMessage = 'This is perfect for your Livelo balance!';
    await sendRecommendation(ADMIN_ID, CLIENT_ID, PROMO_ID, customMessage);

    expect(mockNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ body: customMessage }),
      }),
    );
  });

  it('should use default body when no custom message provided', async () => {
    mockUserFindFirst.mockResolvedValue({ id: CLIENT_ID } as never);
    mockPromotionFindUnique.mockResolvedValue(
      buildMockPromotion({ bonusPercent: 90, sourceProgram: { name: 'Livelo' }, destProgram: { name: 'Smiles' } }) as never,
    );
    mockNotificationCreate.mockResolvedValue({} as never);

    await sendRecommendation(ADMIN_ID, CLIENT_ID, PROMO_ID);

    const call = mockNotificationCreate.mock.calls[0][0];
    expect(call.data.body).toContain('Livelo');
    expect(call.data.body).toContain('Smiles');
    expect(call.data.body).toContain('90%');
  });

  it('should throw ClientNotFoundError when client does not exist', async () => {
    mockUserFindFirst.mockResolvedValue(null);
    mockUserFindUnique.mockResolvedValue(null);

    await expect(sendRecommendation(ADMIN_ID, CLIENT_ID, PROMO_ID)).rejects.toThrow(
      ClientNotFoundError,
    );
  });

  it('should throw ClientNotManagedByAdminError when client exists but not managed by admin', async () => {
    mockUserFindFirst.mockResolvedValue(null);
    mockUserFindUnique.mockResolvedValue({ id: CLIENT_ID } as never);

    await expect(sendRecommendation(ADMIN_ID, CLIENT_ID, PROMO_ID)).rejects.toThrow(
      ClientNotManagedByAdminError,
    );
  });

  it('should throw PromotionNotFoundError when promotion does not exist', async () => {
    mockUserFindFirst.mockResolvedValue({ id: CLIENT_ID } as never);
    mockPromotionFindUnique.mockResolvedValue(null);

    await expect(sendRecommendation(ADMIN_ID, CLIENT_ID, PROMO_ID)).rejects.toThrow(
      PromotionNotFoundError,
    );
  });

  it('should build body without programs when promotion has none', async () => {
    mockUserFindFirst.mockResolvedValue({ id: CLIENT_ID } as never);
    mockPromotionFindUnique.mockResolvedValue(
      buildMockPromotion({ sourceProgram: null, destProgram: null, bonusPercent: null }) as never,
    );
    mockNotificationCreate.mockResolvedValue({} as never);

    await sendRecommendation(ADMIN_ID, CLIENT_ID, PROMO_ID);

    const call = mockNotificationCreate.mock.calls[0][0];
    expect(call.data.body).toContain('recomenda');
  });
});

// ==================== sendBatchRecommendations ====================

describe('sendBatchRecommendations', () => {
  const ADMIN_ID = 'admin-1';
  const CLIENT_IDS = ['client-1', 'client-2', 'client-3'];
  const PROMO_ID = 'promo-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send notifications to all managed clients', async () => {
    mockPromotionFindUnique.mockResolvedValue(buildMockPromotion() as never);
    mockUserFindMany.mockResolvedValue([
      { id: 'client-1' },
      { id: 'client-2' },
      { id: 'client-3' },
    ] as never);
    mockNotificationCreate.mockResolvedValue({} as never);

    const result = await sendBatchRecommendations(ADMIN_ID, CLIENT_IDS, PROMO_ID);

    expect(result.attempted).toBe(3);
    expect(result.succeeded).toBe(3);
    expect(result.failed).toBe(0);
    expect(mockNotificationCreate).toHaveBeenCalledTimes(3);
  });

  it('should skip clients not managed by admin', async () => {
    mockPromotionFindUnique.mockResolvedValue(buildMockPromotion() as never);
    mockUserFindMany.mockResolvedValue([{ id: 'client-1' }] as never);
    mockNotificationCreate.mockResolvedValue({} as never);

    const result = await sendBatchRecommendations(ADMIN_ID, CLIENT_IDS, PROMO_ID);

    expect(result.attempted).toBe(3);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(2);
    expect(mockNotificationCreate).toHaveBeenCalledTimes(1);
  });

  it('should return per-client results', async () => {
    mockPromotionFindUnique.mockResolvedValue(buildMockPromotion() as never);
    mockUserFindMany.mockResolvedValue([{ id: 'client-1' }] as never);
    mockNotificationCreate.mockResolvedValue({} as never);

    const result = await sendBatchRecommendations(ADMIN_ID, ['client-1', 'client-2'], PROMO_ID);

    const successResult = result.results.find((r) => r.clientId === 'client-1');
    const failResult = result.results.find((r) => r.clientId === 'client-2');

    expect(successResult?.success).toBe(true);
    expect(failResult?.success).toBe(false);
    expect(failResult?.error).toBe('Client not managed by this admin');
  });

  it('should handle notification creation failure gracefully', async () => {
    mockPromotionFindUnique.mockResolvedValue(buildMockPromotion() as never);
    mockUserFindMany.mockResolvedValue([{ id: 'client-1' }, { id: 'client-2' }] as never);
    mockNotificationCreate
      .mockResolvedValueOnce({} as never)
      .mockRejectedValueOnce(new Error('DB error'));

    const result = await sendBatchRecommendations(ADMIN_ID, ['client-1', 'client-2'], PROMO_ID);

    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(1);
  });

  it('should throw PromotionNotFoundError when promotion does not exist', async () => {
    mockPromotionFindUnique.mockResolvedValue(null);

    await expect(sendBatchRecommendations(ADMIN_ID, CLIENT_IDS, PROMO_ID)).rejects.toThrow(
      PromotionNotFoundError,
    );
  });

  it('should use custom message for all notifications', async () => {
    mockPromotionFindUnique.mockResolvedValue(buildMockPromotion() as never);
    mockUserFindMany.mockResolvedValue([{ id: 'client-1' }, { id: 'client-2' }] as never);
    mockNotificationCreate.mockResolvedValue({} as never);

    const customMessage = 'Great deal for everyone!';
    await sendBatchRecommendations(ADMIN_ID, ['client-1', 'client-2'], PROMO_ID, customMessage);

    for (const call of mockNotificationCreate.mock.calls) {
      expect(call[0].data.body).toBe(customMessage);
    }
  });

  it('should return zero attempted when clientIds is empty', async () => {
    mockPromotionFindUnique.mockResolvedValue(buildMockPromotion() as never);
    mockUserFindMany.mockResolvedValue([] as never);

    const result = await sendBatchRecommendations(ADMIN_ID, [], PROMO_ID);

    expect(result.attempted).toBe(0);
    expect(result.succeeded).toBe(0);
    expect(mockNotificationCreate).not.toHaveBeenCalled();
  });
});
