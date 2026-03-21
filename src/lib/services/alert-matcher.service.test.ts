import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  AlertConfig,
  AlertChannel,
  Promotion,
  Program,
  PromoType,
  PromoStatus,
  ProgramType,
} from '@/generated/prisma/client';
import type { PromotionWithPrograms } from './promotion.service';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    alertConfig: {
      findMany: vi.fn(),
    },
    notification: {
      createMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { prisma } from '@/lib/prisma';
import {
  doesPromotionMatchAlert,
  matchPromotionAgainstAlerts,
  buildNotificationTitle,
  buildNotificationBody,
  createInAppNotifications,
  processNewPromotions,
} from './alert-matcher.service';

// ==================== Factories ====================

function buildMockProgram(overrides: Partial<Program> = {}): Program {
  return {
    id: 'prog-default',
    name: 'Default Program',
    type: 'AIRLINE' as ProgramType,
    currency: 'miles',
    logoUrl: null,
    website: null,
    transferPartners: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildMockPromotion(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: 'promo-1',
    title: 'Test Promotion',
    type: 'TRANSFER_BONUS' as PromoType,
    status: 'ACTIVE' as PromoStatus,
    sourceProgramId: 'prog-livelo',
    destProgramId: 'prog-smiles',
    bonusPercent: 90,
    purchaseDiscount: null,
    purchasePricePerK: null,
    minimumTransfer: null,
    maxBonusCap: null,
    deadline: null,
    sourceUrl: 'https://example.com/promo',
    sourceSiteName: 'Test Blog',
    rawContent: null,
    costPerMilheiro: null,
    rating: null,
    isVerified: false,
    requiresClub: false,
    clubExtraBonus: null,
    detectedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildPromotionWithPrograms(
  overrides: Partial<Promotion> = {},
  sourceProgram: Program | null = buildMockProgram({ id: 'prog-livelo', name: 'Livelo' }),
  destProgram: Program | null = buildMockProgram({ id: 'prog-smiles', name: 'Smiles' }),
): PromotionWithPrograms {
  return {
    ...buildMockPromotion(overrides),
    sourceProgram,
    destProgram,
  };
}

function buildMockAlertConfig(overrides: Partial<AlertConfig> = {}): AlertConfig {
  return {
    id: 'alert-1',
    userId: 'user-1',
    name: 'Test Alert',
    isActive: true,
    channels: ['IN_APP'] as AlertChannel[],
    telegramChatId: null,
    programNames: [],
    promoTypes: [],
    minBonusPercent: null,
    maxCostPerMilheiro: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ==================== doesPromotionMatchAlert ====================

describe('doesPromotionMatchAlert', () => {
  it('should return true when alert config has no filters (catch-all)', () => {
    const promotion = buildPromotionWithPrograms();
    const alertConfig = buildMockAlertConfig();

    expect(doesPromotionMatchAlert(promotion, alertConfig)).toBe(true);
  });

  it('should return true when promo type matches a configured type', () => {
    const promotion = buildPromotionWithPrograms({ type: 'TRANSFER_BONUS' as PromoType });
    const alertConfig = buildMockAlertConfig({
      promoTypes: ['TRANSFER_BONUS'] as PromoType[],
    });

    expect(doesPromotionMatchAlert(promotion, alertConfig)).toBe(true);
  });

  it('should return false when promo type does not match configured types', () => {
    const promotion = buildPromotionWithPrograms({ type: 'CLUB_SIGNUP' as PromoType });
    const alertConfig = buildMockAlertConfig({
      promoTypes: ['TRANSFER_BONUS'] as PromoType[],
    });

    expect(doesPromotionMatchAlert(promotion, alertConfig)).toBe(false);
  });

  it('should return true when source program name matches configured program names', () => {
    const promotion = buildPromotionWithPrograms(
      {},
      buildMockProgram({ id: 'prog-livelo', name: 'Livelo' }),
      buildMockProgram({ id: 'prog-smiles', name: 'Smiles' }),
    );
    const alertConfig = buildMockAlertConfig({ programNames: ['Livelo'] });

    expect(doesPromotionMatchAlert(promotion, alertConfig)).toBe(true);
  });

  it('should return true when destination program name matches configured program names', () => {
    const promotion = buildPromotionWithPrograms(
      {},
      buildMockProgram({ id: 'prog-livelo', name: 'Livelo' }),
      buildMockProgram({ id: 'prog-smiles', name: 'Smiles' }),
    );
    const alertConfig = buildMockAlertConfig({ programNames: ['Smiles'] });

    expect(doesPromotionMatchAlert(promotion, alertConfig)).toBe(true);
  });

  it('should return false when neither program matches configured program names', () => {
    const promotion = buildPromotionWithPrograms(
      {},
      buildMockProgram({ id: 'prog-livelo', name: 'Livelo' }),
      buildMockProgram({ id: 'prog-smiles', name: 'Smiles' }),
    );
    const alertConfig = buildMockAlertConfig({ programNames: ['Azul Fidelidade'] });

    expect(doesPromotionMatchAlert(promotion, alertConfig)).toBe(false);
  });

  it('should match program names case-insensitively', () => {
    const promotion = buildPromotionWithPrograms(
      {},
      buildMockProgram({ id: 'prog-livelo', name: 'Livelo' }),
      null,
    );
    const alertConfig = buildMockAlertConfig({ programNames: ['livelo'] });

    expect(doesPromotionMatchAlert(promotion, alertConfig)).toBe(true);
  });

  it('should return false when promotion has no programs and programNames is configured', () => {
    const promotion = buildPromotionWithPrograms({}, null, null);
    const alertConfig = buildMockAlertConfig({ programNames: ['Livelo'] });

    expect(doesPromotionMatchAlert(promotion, alertConfig)).toBe(false);
  });

  it('should return true when programNames is empty regardless of promotion programs', () => {
    const promotion = buildPromotionWithPrograms({}, null, null);
    const alertConfig = buildMockAlertConfig({ programNames: [] });

    expect(doesPromotionMatchAlert(promotion, alertConfig)).toBe(true);
  });

  it('should return true when bonusPercent meets minBonusPercent threshold', () => {
    const promotion = buildPromotionWithPrograms({ bonusPercent: 90 });
    const alertConfig = buildMockAlertConfig({ minBonusPercent: 80 });

    expect(doesPromotionMatchAlert(promotion, alertConfig)).toBe(true);
  });

  it('should return true when bonusPercent equals minBonusPercent threshold', () => {
    const promotion = buildPromotionWithPrograms({ bonusPercent: 80 });
    const alertConfig = buildMockAlertConfig({ minBonusPercent: 80 });

    expect(doesPromotionMatchAlert(promotion, alertConfig)).toBe(true);
  });

  it('should return false when bonusPercent is below minBonusPercent threshold', () => {
    const promotion = buildPromotionWithPrograms({ bonusPercent: 50 });
    const alertConfig = buildMockAlertConfig({ minBonusPercent: 80 });

    expect(doesPromotionMatchAlert(promotion, alertConfig)).toBe(false);
  });

  it('should return false when bonusPercent is null and minBonusPercent is set', () => {
    const promotion = buildPromotionWithPrograms({ bonusPercent: null });
    const alertConfig = buildMockAlertConfig({ minBonusPercent: 50 });

    expect(doesPromotionMatchAlert(promotion, alertConfig)).toBe(false);
  });

  it('should return true when maxCostPerMilheiro is met', () => {
    const promotion = buildPromotionWithPrograms({ costPerMilheiro: 14 as unknown as null });
    const alertConfig = buildMockAlertConfig({ maxCostPerMilheiro: 16 as unknown as null });

    expect(doesPromotionMatchAlert(promotion, alertConfig)).toBe(true);
  });

  it('should return false when costPerMilheiro exceeds maxCostPerMilheiro', () => {
    const promotion = buildPromotionWithPrograms({ costPerMilheiro: 18 as unknown as null });
    const alertConfig = buildMockAlertConfig({ maxCostPerMilheiro: 16 as unknown as null });

    expect(doesPromotionMatchAlert(promotion, alertConfig)).toBe(false);
  });

  it('should return false when costPerMilheiro is null and maxCostPerMilheiro is set', () => {
    const promotion = buildPromotionWithPrograms({ costPerMilheiro: null });
    const alertConfig = buildMockAlertConfig({ maxCostPerMilheiro: 16 as unknown as null });

    expect(doesPromotionMatchAlert(promotion, alertConfig)).toBe(false);
  });

  it('should return true when all filters match simultaneously', () => {
    const promotion = buildPromotionWithPrograms(
      { type: 'TRANSFER_BONUS' as PromoType, bonusPercent: 90, costPerMilheiro: 14 as unknown as null },
      buildMockProgram({ id: 'prog-livelo', name: 'Livelo' }),
      buildMockProgram({ id: 'prog-smiles', name: 'Smiles' }),
    );
    const alertConfig = buildMockAlertConfig({
      promoTypes: ['TRANSFER_BONUS'] as PromoType[],
      programNames: ['Smiles'],
      minBonusPercent: 80,
      maxCostPerMilheiro: 16 as unknown as null,
    });

    expect(doesPromotionMatchAlert(promotion, alertConfig)).toBe(true);
  });
});

// ==================== buildNotificationTitle ====================

describe('buildNotificationTitle', () => {
  it('should build transfer bonus title with program names and bonus percent', () => {
    const promotion = buildPromotionWithPrograms(
      { type: 'TRANSFER_BONUS' as PromoType, bonusPercent: 90 },
      buildMockProgram({ name: 'Livelo' }),
      buildMockProgram({ name: 'Smiles' }),
    );

    const title = buildNotificationTitle(promotion);

    expect(title).toBe('90% transfer bonus: Livelo → Smiles');
  });

  it('should fallback to Unknown for transfer bonus when programs are null', () => {
    const promotion = buildPromotionWithPrograms(
      { type: 'TRANSFER_BONUS' as PromoType, bonusPercent: 80 },
      null,
      null,
    );

    const title = buildNotificationTitle(promotion);

    expect(title).toBe('80% transfer bonus: Unknown → Unknown');
  });

  it('should build point purchase title with discount and program name', () => {
    const promotion = buildPromotionWithPrograms(
      {
        type: 'POINT_PURCHASE' as PromoType,
        bonusPercent: null,
        purchaseDiscount: 30,
      },
      buildMockProgram({ name: 'Livelo' }),
      null,
    );

    const title = buildNotificationTitle(promotion);

    expect(title).toBe('30% discount on Livelo points');
  });

  it('should fallback to promotion title for unhandled types', () => {
    const promotion = buildPromotionWithPrograms({
      type: 'CLUB_SIGNUP' as PromoType,
      title: 'Join Smiles Club',
      bonusPercent: null,
    });

    const title = buildNotificationTitle(promotion);

    expect(title).toBe('Join Smiles Club');
  });

  it('should fallback to promotion title for transfer bonus with null bonusPercent', () => {
    const promotion = buildPromotionWithPrograms({
      type: 'TRANSFER_BONUS' as PromoType,
      title: 'Smiles Transfer Promo',
      bonusPercent: null,
    });

    const title = buildNotificationTitle(promotion);

    expect(title).toBe('Smiles Transfer Promo');
  });
});

// ==================== buildNotificationBody ====================

describe('buildNotificationBody', () => {
  it('should include source site name', () => {
    const promotion = buildPromotionWithPrograms({ sourceSiteName: 'Passageiro de Primeira' });

    const body = buildNotificationBody(promotion);

    expect(body).toContain('Source: Passageiro de Primeira');
  });

  it('should include minimum transfer for transfer bonus promos', () => {
    const promotion = buildPromotionWithPrograms({
      type: 'TRANSFER_BONUS' as PromoType,
      minimumTransfer: 10000,
    });

    const body = buildNotificationBody(promotion);

    expect(body).toContain('Min transfer:');
    expect(body).toContain('pts');
  });

  it('should include bonus cap for transfer bonus promos', () => {
    const promotion = buildPromotionWithPrograms({
      type: 'TRANSFER_BONUS' as PromoType,
      maxBonusCap: 50000,
    });

    const body = buildNotificationBody(promotion);

    expect(body).toContain('Cap:');
    expect(body).toContain('miles');
  });

  it('should include cost per milheiro when available', () => {
    const promotion = buildPromotionWithPrograms({ costPerMilheiro: 14.5 as unknown as null });

    const body = buildNotificationBody(promotion);

    expect(body).toContain('Cost: R$14.50/k');
  });

  it('should include deadline when available', () => {
    const deadline = new Date('2026-04-15');
    const promotion = buildPromotionWithPrograms({ deadline });

    const body = buildNotificationBody(promotion);

    expect(body).toContain('Deadline:');
  });

  it('should not include minimum transfer for non-transfer-bonus promos', () => {
    const promotion = buildPromotionWithPrograms({
      type: 'POINT_PURCHASE' as PromoType,
      minimumTransfer: 10000,
    });

    const body = buildNotificationBody(promotion);

    expect(body).not.toContain('Min transfer:');
  });

  it('should truncate body when exceeding max length', () => {
    const longSiteName = 'A'.repeat(600);
    const promotion = buildPromotionWithPrograms({ sourceSiteName: longSiteName });

    const body = buildNotificationBody(promotion);

    expect(body.length).toBeLessThanOrEqual(500);
    expect(body.endsWith('…')).toBe(true);
  });
});

// ==================== matchPromotionAgainstAlerts ====================

describe('matchPromotionAgainstAlerts', () => {
  it('should return empty array when no alert configs are active', () => {
    const promotion = buildPromotionWithPrograms();
    const result = matchPromotionAgainstAlerts(promotion, []);

    expect(result).toHaveLength(0);
  });

  it('should match catch-all alert config', () => {
    const promotion = buildPromotionWithPrograms();
    const alertConfig = buildMockAlertConfig({ id: 'alert-1', userId: 'user-1' });

    const result = matchPromotionAgainstAlerts(promotion, [alertConfig]);

    expect(result).toHaveLength(1);
    expect(result[0].alertConfigId).toBe('alert-1');
    expect(result[0].userId).toBe('user-1');
    expect(result[0].promotionId).toBe('promo-1');
  });

  it('should return match with correct notification content', () => {
    const promotion = buildPromotionWithPrograms(
      { type: 'TRANSFER_BONUS' as PromoType, bonusPercent: 90 },
      buildMockProgram({ name: 'Livelo' }),
      buildMockProgram({ name: 'Smiles' }),
    );
    const alertConfig = buildMockAlertConfig({ channels: ['IN_APP', 'EMAIL'] as AlertChannel[] });

    const result = matchPromotionAgainstAlerts(promotion, [alertConfig]);

    expect(result[0].notificationTitle).toBe('90% transfer bonus: Livelo → Smiles');
    expect(result[0].channels).toContain('IN_APP');
    expect(result[0].channels).toContain('EMAIL');
  });

  it('should match multiple alert configs for the same promotion', () => {
    const promotion = buildPromotionWithPrograms();
    const alertConfigs = [
      buildMockAlertConfig({ id: 'alert-1', userId: 'user-1' }),
      buildMockAlertConfig({ id: 'alert-2', userId: 'user-2' }),
    ];

    const result = matchPromotionAgainstAlerts(promotion, alertConfigs);

    expect(result).toHaveLength(2);
    expect(result[0].alertConfigId).toBe('alert-1');
    expect(result[1].alertConfigId).toBe('alert-2');
  });

  it('should skip alert configs that do not match', () => {
    const promotion = buildPromotionWithPrograms({ bonusPercent: 50 });
    const alertConfigs = [
      buildMockAlertConfig({ id: 'alert-1', minBonusPercent: 80 }),
      buildMockAlertConfig({ id: 'alert-2', minBonusPercent: 40 }),
    ];

    const result = matchPromotionAgainstAlerts(promotion, alertConfigs);

    expect(result).toHaveLength(1);
    expect(result[0].alertConfigId).toBe('alert-2');
  });

  it('should skip inactive alert configs if passed (guard against wrong input)', () => {
    const promotion = buildPromotionWithPrograms();
    // Alert config with no filters — matches everything
    const alertConfig = buildMockAlertConfig({
      promoTypes: ['CLUB_SIGNUP'] as PromoType[],
    });

    const result = matchPromotionAgainstAlerts(promotion, [alertConfig]);

    // TRANSFER_BONUS promo should not match a CLUB_SIGNUP alert
    expect(result).toHaveLength(0);
  });
});

// ==================== createInAppNotifications ====================

describe('createInAppNotifications', () => {
  const mockCreateMany = vi.mocked(prisma.notification.createMany);

  beforeEach(() => vi.clearAllMocks());

  it('should return 0 when no matches have IN_APP channel', async () => {
    const matches = [
      {
        alertConfigId: 'alert-1',
        userId: 'user-1',
        promotionId: 'promo-1',
        channels: ['EMAIL'] as AlertChannel[],
        notificationTitle: 'Test',
        notificationBody: 'Body',
      },
    ];

    const count = await createInAppNotifications(matches);

    expect(count).toBe(0);
    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  it('should create IN_APP notifications and return count', async () => {
    mockCreateMany.mockResolvedValue({ count: 2 });

    const matches = [
      {
        alertConfigId: 'alert-1',
        userId: 'user-1',
        promotionId: 'promo-1',
        channels: ['IN_APP'] as AlertChannel[],
        notificationTitle: 'Title 1',
        notificationBody: 'Body 1',
      },
      {
        alertConfigId: 'alert-2',
        userId: 'user-2',
        promotionId: 'promo-1',
        channels: ['IN_APP', 'EMAIL'] as AlertChannel[],
        notificationTitle: 'Title 2',
        notificationBody: 'Body 2',
      },
    ];

    const count = await createInAppNotifications(matches);

    expect(count).toBe(2);
    expect(mockCreateMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'user-1',
          title: 'Title 1',
          body: 'Body 1',
          channel: 'IN_APP',
          promotionId: 'promo-1',
        },
        {
          userId: 'user-2',
          title: 'Title 2',
          body: 'Body 2',
          channel: 'IN_APP',
          promotionId: 'promo-1',
        },
      ],
    });
  });

  it('should only create IN_APP notifications and skip other channels', async () => {
    mockCreateMany.mockResolvedValue({ count: 1 });

    const matches = [
      {
        alertConfigId: 'alert-1',
        userId: 'user-1',
        promotionId: 'promo-1',
        channels: ['EMAIL', 'TELEGRAM'] as AlertChannel[],
        notificationTitle: 'Title',
        notificationBody: 'Body',
      },
      {
        alertConfigId: 'alert-2',
        userId: 'user-2',
        promotionId: 'promo-1',
        channels: ['IN_APP'] as AlertChannel[],
        notificationTitle: 'Title 2',
        notificationBody: 'Body 2',
      },
    ];

    const count = await createInAppNotifications(matches);

    expect(count).toBe(1);
    expect(mockCreateMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ userId: 'user-2', channel: 'IN_APP' }),
      ],
    });
  });
});

// ==================== processNewPromotions ====================

describe('processNewPromotions', () => {
  const mockFindMany = vi.mocked(prisma.alertConfig.findMany);
  const mockCreateMany = vi.mocked(prisma.notification.createMany);

  beforeEach(() => vi.clearAllMocks());

  it('should return zeroed result when promotions list is empty', async () => {
    const result = await processNewPromotions([]);

    expect(result).toEqual({ promotionsProcessed: 0, totalMatches: 0, notificationsCreated: 0 });
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it('should return zero matches when no active alert configs exist', async () => {
    mockFindMany.mockResolvedValue([]);

    const promotions = [buildPromotionWithPrograms()];
    const result = await processNewPromotions(promotions);

    expect(result.promotionsProcessed).toBe(1);
    expect(result.totalMatches).toBe(0);
    expect(result.notificationsCreated).toBe(0);
    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  it('should process promotions and create IN_APP notifications for matched alerts', async () => {
    const alertConfigs = [
      buildMockAlertConfig({ id: 'alert-1', userId: 'user-1', channels: ['IN_APP'] as AlertChannel[] }),
    ];
    mockFindMany.mockResolvedValue(alertConfigs);
    mockCreateMany.mockResolvedValue({ count: 1 });

    const promotions = [buildPromotionWithPrograms()];
    const result = await processNewPromotions(promotions);

    expect(result.promotionsProcessed).toBe(1);
    expect(result.totalMatches).toBe(1);
    expect(result.notificationsCreated).toBe(1);
    expect(mockCreateMany).toHaveBeenCalledOnce();
  });

  it('should process multiple promotions against multiple alert configs', async () => {
    const alertConfigs = [
      buildMockAlertConfig({ id: 'alert-1', userId: 'user-1', channels: ['IN_APP'] as AlertChannel[] }),
      buildMockAlertConfig({ id: 'alert-2', userId: 'user-2', channels: ['IN_APP'] as AlertChannel[] }),
    ];
    mockFindMany.mockResolvedValue(alertConfigs);
    mockCreateMany.mockResolvedValue({ count: 4 });

    const promotions = [
      buildPromotionWithPrograms({ id: 'promo-1' }),
      buildPromotionWithPrograms({ id: 'promo-2' }),
    ];
    const result = await processNewPromotions(promotions);

    expect(result.promotionsProcessed).toBe(2);
    expect(result.totalMatches).toBe(4);
    expect(result.notificationsCreated).toBe(4);
  });

  it('should not create notifications when no promotions match any alert', async () => {
    const alertConfigs = [
      buildMockAlertConfig({
        promoTypes: ['CLUB_SIGNUP'] as PromoType[],
        channels: ['IN_APP'] as AlertChannel[],
      }),
    ];
    mockFindMany.mockResolvedValue(alertConfigs);

    const promotions = [
      buildPromotionWithPrograms({ type: 'TRANSFER_BONUS' as PromoType }),
    ];
    const result = await processNewPromotions(promotions);

    expect(result.totalMatches).toBe(0);
    expect(result.notificationsCreated).toBe(0);
    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  it('should handle createMany error gracefully and still return match count', async () => {
    const alertConfigs = [
      buildMockAlertConfig({ id: 'alert-1', userId: 'user-1', channels: ['IN_APP'] as AlertChannel[] }),
    ];
    mockFindMany.mockResolvedValue(alertConfigs);
    mockCreateMany.mockRejectedValue(new Error('DB error'));

    const promotions = [buildPromotionWithPrograms()];
    const result = await processNewPromotions(promotions);

    expect(result.promotionsProcessed).toBe(1);
    expect(result.totalMatches).toBe(1);
    expect(result.notificationsCreated).toBe(0);
  });
});
