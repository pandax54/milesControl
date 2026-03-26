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

vi.mock('@/lib/services/alert-config.service', () => ({
  createAlertConfig: vi.fn(),
  updateAlertConfig: vi.fn(),
  deleteAlertConfig: vi.fn(),
  toggleAlertConfig: vi.fn(),
  AlertConfigNotFoundError: class extends Error {
    constructor(id: string) {
      super(id);
      this.name = 'AlertConfigNotFoundError';
    }
  },
}));

vi.mock('@/lib/services/freemium.service', () => ({
  PremiumFeatureRequiredError: class extends Error {
    constructor(feature: string) {
      super(`${feature} premium`);
      this.name = 'PremiumFeatureRequiredError';
    }
  },
}));

import { revalidatePath } from 'next/cache';
import { requireUserId } from './helpers';
import {
  createAlertConfig,
  updateAlertConfig,
} from '@/lib/services/alert-config.service';
import { PremiumFeatureRequiredError } from '@/lib/services/freemium.service';
import { addAlertConfig, editAlertConfig } from './alerts';

const mockRequireUserId = vi.mocked(requireUserId);
const mockCreateAlertConfig = vi.mocked(createAlertConfig);
const mockUpdateAlertConfig = vi.mocked(updateAlertConfig);
const mockRevalidatePath = vi.mocked(revalidatePath);

describe('alerts actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUserId.mockResolvedValue('user-1');
  });

  it('should create an alert rule successfully', async () => {
    mockCreateAlertConfig.mockResolvedValue({ id: 'alert-1' } as never);

    const result = await addAlertConfig({
      name: 'Smiles bonus',
      channels: ['IN_APP'],
      programNames: ['Smiles'],
      promoTypes: ['TRANSFER_BONUS'],
    });

    expect(result.success).toBe(true);
    expect(mockCreateAlertConfig).toHaveBeenCalledWith('user-1', {
      name: 'Smiles bonus',
      channels: ['IN_APP'],
      programNames: ['Smiles'],
      promoTypes: ['TRANSFER_BONUS'],
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/alerts');
  });

  it('should return a premium error when a free user chooses Telegram', async () => {
    mockCreateAlertConfig.mockRejectedValue(
      new PremiumFeatureRequiredError('telegramAlerts'),
    );

    const result = await addAlertConfig({
      name: 'Telegram alert',
      channels: ['TELEGRAM'],
      programNames: [],
      promoTypes: [],
      telegramChatId: '123',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('telegramAlerts premium');
  });

  it('should return a premium error when editing a rule with Telegram', async () => {
    mockUpdateAlertConfig.mockRejectedValue(
      new PremiumFeatureRequiredError('telegramAlerts'),
    );

    const result = await editAlertConfig({
      alertConfigId: 'alert-1',
      channels: ['IN_APP', 'TELEGRAM'],
      telegramChatId: '123',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('telegramAlerts premium');
  });
});
