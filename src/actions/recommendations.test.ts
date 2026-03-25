import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./helpers', () => {
  class AuthenticationError extends Error {
    constructor() {
      super('Not authenticated');
      this.name = 'AuthenticationError';
    }
  }
  class AuthorizationError extends Error {
    constructor() {
      super('Not authorized');
      this.name = 'AuthorizationError';
    }
  }
  return {
    requireAdminRole: vi.fn(),
    isAuthenticationError: (error: unknown) => error instanceof AuthenticationError,
    isAuthorizationError: (error: unknown) => error instanceof AuthorizationError,
    AuthenticationError,
    AuthorizationError,
  };
});

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/services/admin-recommendation.service', () => ({
  sendRecommendation: vi.fn(),
  sendBatchRecommendations: vi.fn(),
  ClientNotManagedByAdminError: class extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = 'ClientNotManagedByAdminError';
    }
  },
}));

vi.mock('@/lib/services/client-management.service', () => ({
  ClientNotFoundError: class extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = 'ClientNotFoundError';
    }
  },
}));

vi.mock('@/lib/services/promotion.service', () => ({
  PromotionNotFoundError: class extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = 'PromotionNotFoundError';
    }
  },
}));

import { revalidatePath } from 'next/cache';
import {
  sendRecommendation as sendRecommendationService,
  sendBatchRecommendations as sendBatchRecommendationsService,
  ClientNotManagedByAdminError,
} from '@/lib/services/admin-recommendation.service';
import { ClientNotFoundError } from '@/lib/services/client-management.service';
import { PromotionNotFoundError } from '@/lib/services/promotion.service';
import { requireAdminRole, AuthenticationError, AuthorizationError } from './helpers';
import { sendPromoRecommendation, sendBatchPromoRecommendations } from './recommendations';

const mockRequireAdminRole = vi.mocked(requireAdminRole);
const mockSendRecommendationService = vi.mocked(sendRecommendationService);
const mockSendBatchRecommendationsService = vi.mocked(sendBatchRecommendationsService);

const ADMIN_ID = 'admin-1';
const CLIENT_ID = 'client-1';
const PROMO_ID = 'promo-1';

// ==================== sendPromoRecommendation ====================

describe('sendPromoRecommendation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send recommendation and revalidate path', async () => {
    mockRequireAdminRole.mockResolvedValue(ADMIN_ID);
    mockSendRecommendationService.mockResolvedValue(undefined);

    const result = await sendPromoRecommendation({ clientId: CLIENT_ID, promotionId: PROMO_ID });

    expect(result.success).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/promotions');
  });

  it('should pass custom message to service', async () => {
    mockRequireAdminRole.mockResolvedValue(ADMIN_ID);
    mockSendRecommendationService.mockResolvedValue(undefined);

    const message = 'Great deal for you!';
    await sendPromoRecommendation({ clientId: CLIENT_ID, promotionId: PROMO_ID, message });

    expect(mockSendRecommendationService).toHaveBeenCalledWith(
      ADMIN_ID,
      CLIENT_ID,
      PROMO_ID,
      message,
    );
  });

  it('should return error for invalid input', async () => {
    const result = await sendPromoRecommendation({ clientId: '', promotionId: PROMO_ID });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
    expect(mockSendRecommendationService).not.toHaveBeenCalled();
  });

  it('should return authentication error', async () => {
    mockRequireAdminRole.mockRejectedValue(new AuthenticationError());

    const result = await sendPromoRecommendation({ clientId: CLIENT_ID, promotionId: PROMO_ID });

    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be logged in to perform this action');
  });

  it('should return authorization error for non-admin', async () => {
    mockRequireAdminRole.mockRejectedValue(new AuthorizationError());

    const result = await sendPromoRecommendation({ clientId: CLIENT_ID, promotionId: PROMO_ID });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Admin access required');
  });

  it('should return error when client not found', async () => {
    mockRequireAdminRole.mockResolvedValue(ADMIN_ID);
    mockSendRecommendationService.mockRejectedValue(new ClientNotFoundError(CLIENT_ID));

    const result = await sendPromoRecommendation({ clientId: CLIENT_ID, promotionId: PROMO_ID });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Client not found');
  });

  it('should return error when client not managed by admin', async () => {
    mockRequireAdminRole.mockResolvedValue(ADMIN_ID);
    mockSendRecommendationService.mockRejectedValue(new ClientNotManagedByAdminError(CLIENT_ID));

    const result = await sendPromoRecommendation({ clientId: CLIENT_ID, promotionId: PROMO_ID });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Client is not managed by you');
  });

  it('should return error when promotion not found', async () => {
    mockRequireAdminRole.mockResolvedValue(ADMIN_ID);
    mockSendRecommendationService.mockRejectedValue(new PromotionNotFoundError(PROMO_ID));

    const result = await sendPromoRecommendation({ clientId: CLIENT_ID, promotionId: PROMO_ID });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Promotion not found');
  });

  it('should return generic error for unexpected exceptions', async () => {
    mockRequireAdminRole.mockResolvedValue(ADMIN_ID);
    mockSendRecommendationService.mockRejectedValue(new Error('unexpected'));

    const result = await sendPromoRecommendation({ clientId: CLIENT_ID, promotionId: PROMO_ID });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to send recommendation. Please try again.');
  });
});

// ==================== sendBatchPromoRecommendations ====================

describe('sendBatchPromoRecommendations', () => {
  const CLIENT_IDS = ['client-1', 'client-2'];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send batch recommendations and return summary', async () => {
    mockRequireAdminRole.mockResolvedValue(ADMIN_ID);
    const mockSummary = {
      attempted: 2,
      succeeded: 2,
      failed: 0,
      results: [
        { clientId: 'client-1', success: true },
        { clientId: 'client-2', success: true },
      ],
    };
    mockSendBatchRecommendationsService.mockResolvedValue(mockSummary);

    const result = await sendBatchPromoRecommendations({
      clientIds: CLIENT_IDS,
      promotionId: PROMO_ID,
    });

    expect(result.success).toBe(true);
    expect(result.summary).toEqual(mockSummary);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/promotions');
  });

  it('should return error for invalid input — empty clientIds', async () => {
    const result = await sendBatchPromoRecommendations({
      clientIds: [],
      promotionId: PROMO_ID,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
    expect(mockSendBatchRecommendationsService).not.toHaveBeenCalled();
  });

  it('should return authentication error', async () => {
    mockRequireAdminRole.mockRejectedValue(new AuthenticationError());

    const result = await sendBatchPromoRecommendations({
      clientIds: CLIENT_IDS,
      promotionId: PROMO_ID,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be logged in to perform this action');
  });

  it('should return authorization error for non-admin', async () => {
    mockRequireAdminRole.mockRejectedValue(new AuthorizationError());

    const result = await sendBatchPromoRecommendations({
      clientIds: CLIENT_IDS,
      promotionId: PROMO_ID,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Admin access required');
  });

  it('should return error when promotion not found', async () => {
    mockRequireAdminRole.mockResolvedValue(ADMIN_ID);
    mockSendBatchRecommendationsService.mockRejectedValue(new PromotionNotFoundError(PROMO_ID));

    const result = await sendBatchPromoRecommendations({
      clientIds: CLIENT_IDS,
      promotionId: PROMO_ID,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Promotion not found');
  });

  it('should return generic error for unexpected exceptions', async () => {
    mockRequireAdminRole.mockResolvedValue(ADMIN_ID);
    mockSendBatchRecommendationsService.mockRejectedValue(new Error('unexpected'));

    const result = await sendBatchPromoRecommendations({
      clientIds: CLIENT_IDS,
      promotionId: PROMO_ID,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to send recommendations. Please try again.');
  });
});
