import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AlertConfig, AlertChannel, PromoType } from '@/generated/prisma/client';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    alertConfig: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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
  listAlertConfigs,
  listActiveAlertConfigs,
  getAlertConfig,
  createAlertConfig,
  updateAlertConfig,
  toggleAlertConfig,
  deleteAlertConfig,
  AlertConfigNotFoundError,
} from './alert-config.service';
import { PremiumFeatureRequiredError } from './freemium.service';

const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockFindMany = vi.mocked(prisma.alertConfig.findMany);
const mockFindFirst = vi.mocked(prisma.alertConfig.findFirst);
const mockCreate = vi.mocked(prisma.alertConfig.create);
const mockUpdate = vi.mocked(prisma.alertConfig.update);
const mockDelete = vi.mocked(prisma.alertConfig.delete);

const MOCK_USER_ID = 'user-123';
const MOCK_ALERT_ID = 'alert-456';

function buildMockAlertConfig(overrides: Partial<AlertConfig> = {}): AlertConfig {
  return {
    id: MOCK_ALERT_ID,
    userId: MOCK_USER_ID,
    name: 'Smiles transfer > 80%',
    isActive: true,
    channels: ['IN_APP', 'EMAIL'] as AlertChannel[],
    telegramChatId: null,
    programNames: ['Smiles'],
    promoTypes: ['TRANSFER_BONUS'] as PromoType[],
    minBonusPercent: 80,
    maxCostPerMilheiro: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('listAlertConfigs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserFindUnique.mockResolvedValue({ freemiumTier: 'PREMIUM' } as never);
  });

  it('should return alert configs for user ordered by creation date', async () => {
    const mockConfigs = [buildMockAlertConfig()];
    mockFindMany.mockResolvedValue(mockConfigs);

    const result = await listAlertConfigs(MOCK_USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Smiles transfer > 80%');
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: MOCK_USER_ID },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('should return empty array when user has no alert configs', async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await listAlertConfigs(MOCK_USER_ID);

    expect(result).toHaveLength(0);
  });
});

describe('listActiveAlertConfigs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserFindUnique.mockResolvedValue({ freemiumTier: 'PREMIUM' } as never);
  });

  it('should return only active alert configs for user', async () => {
    const mockConfigs = [buildMockAlertConfig({ isActive: true })];
    mockFindMany.mockResolvedValue(mockConfigs);

    const result = await listActiveAlertConfigs(MOCK_USER_ID);

    expect(result).toHaveLength(1);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: MOCK_USER_ID, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  });
});

describe('getAlertConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserFindUnique.mockResolvedValue({ freemiumTier: 'PREMIUM' } as never);
  });

  it('should return the alert config when found', async () => {
    const mockConfig = buildMockAlertConfig();
    mockFindFirst.mockResolvedValue(mockConfig);

    const result = await getAlertConfig(MOCK_USER_ID, MOCK_ALERT_ID);

    expect(result.id).toBe(MOCK_ALERT_ID);
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: MOCK_ALERT_ID, userId: MOCK_USER_ID },
    });
  });

  it('should throw AlertConfigNotFoundError when config does not exist', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(getAlertConfig(MOCK_USER_ID, 'nonexistent')).rejects.toThrow(
      AlertConfigNotFoundError,
    );
  });
});

describe('createAlertConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserFindUnique.mockResolvedValue({ freemiumTier: 'PREMIUM' } as never);
  });

  it('should create an alert config with required fields', async () => {
    const mockConfig = buildMockAlertConfig();
    mockCreate.mockResolvedValue(mockConfig);

    const result = await createAlertConfig(MOCK_USER_ID, {
      name: 'Smiles transfer > 80%',
      channels: ['IN_APP', 'EMAIL'],
      programNames: ['Smiles'],
      promoTypes: ['TRANSFER_BONUS'],
      minBonusPercent: 80,
    });

    expect(result.name).toBe('Smiles transfer > 80%');
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: MOCK_USER_ID,
        name: 'Smiles transfer > 80%',
        channels: ['IN_APP', 'EMAIL'],
        programNames: ['Smiles'],
        promoTypes: ['TRANSFER_BONUS'],
        minBonusPercent: 80,
        maxCostPerMilheiro: null,
        telegramChatId: null,
      }),
    });
  });

  it('should create an alert config with null optional fields when not provided', async () => {
    const mockConfig = buildMockAlertConfig({
      minBonusPercent: null,
      maxCostPerMilheiro: null,
    });
    mockCreate.mockResolvedValue(mockConfig);

    await createAlertConfig(MOCK_USER_ID, {
      name: 'Any promo alert',
      channels: ['IN_APP'],
      programNames: [],
      promoTypes: [],
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        minBonusPercent: null,
        maxCostPerMilheiro: null,
      }),
    });
  });

  it('should reject Telegram alerts for free users', async () => {
    mockUserFindUnique.mockResolvedValue({ freemiumTier: 'FREE' } as never);

    await expect(
      createAlertConfig(MOCK_USER_ID, {
        name: 'Telegram alert',
        channels: ['TELEGRAM'],
        programNames: [],
        promoTypes: [],
        telegramChatId: '123',
      }),
    ).rejects.toThrow(PremiumFeatureRequiredError);

    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe('updateAlertConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserFindUnique.mockResolvedValue({ freemiumTier: 'PREMIUM' } as never);
  });

  it('should update alert config fields', async () => {
    const mockConfig = buildMockAlertConfig({ name: 'Updated name' });
    mockFindFirst.mockResolvedValue(buildMockAlertConfig());
    mockUpdate.mockResolvedValue(mockConfig);

    const result = await updateAlertConfig(MOCK_USER_ID, {
      alertConfigId: MOCK_ALERT_ID,
      name: 'Updated name',
    });

    expect(result.name).toBe('Updated name');
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: MOCK_ALERT_ID },
      data: { name: 'Updated name' },
    });
  });

  it('should throw AlertConfigNotFoundError when config does not exist', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      updateAlertConfig(MOCK_USER_ID, { alertConfigId: 'nonexistent', name: 'x' }),
    ).rejects.toThrow(AlertConfigNotFoundError);
  });

  it('should reject Telegram updates for free users', async () => {
    mockUserFindUnique.mockResolvedValue({ freemiumTier: 'FREE' } as never);
    mockFindFirst.mockResolvedValue(buildMockAlertConfig({ channels: ['IN_APP'] as AlertChannel[] }));

    await expect(
      updateAlertConfig(MOCK_USER_ID, {
        alertConfigId: MOCK_ALERT_ID,
        channels: ['IN_APP', 'TELEGRAM'],
        telegramChatId: '123',
      }),
    ).rejects.toThrow(PremiumFeatureRequiredError);

    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe('toggleAlertConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserFindUnique.mockResolvedValue({ freemiumTier: 'PREMIUM' } as never);
  });

  it('should deactivate an active alert config', async () => {
    const mockConfig = buildMockAlertConfig({ isActive: false });
    mockFindFirst.mockResolvedValue(buildMockAlertConfig({ isActive: true }));
    mockUpdate.mockResolvedValue(mockConfig);

    const result = await toggleAlertConfig(MOCK_USER_ID, MOCK_ALERT_ID, false);

    expect(result.isActive).toBe(false);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: MOCK_ALERT_ID },
      data: { isActive: false },
    });
  });

  it('should throw AlertConfigNotFoundError when config does not exist', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(toggleAlertConfig(MOCK_USER_ID, 'nonexistent', true)).rejects.toThrow(
      AlertConfigNotFoundError,
    );
  });
});

describe('deleteAlertConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserFindUnique.mockResolvedValue({ freemiumTier: 'PREMIUM' } as never);
  });

  it('should delete alert config when found', async () => {
    mockFindFirst.mockResolvedValue(buildMockAlertConfig());
    mockDelete.mockResolvedValue(buildMockAlertConfig());

    await deleteAlertConfig(MOCK_USER_ID, MOCK_ALERT_ID);

    expect(mockDelete).toHaveBeenCalledWith({
      where: { id: MOCK_ALERT_ID },
    });
  });

  it('should throw AlertConfigNotFoundError when config does not exist', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(deleteAlertConfig(MOCK_USER_ID, 'nonexistent')).rejects.toThrow(
      AlertConfigNotFoundError,
    );
  });
});
