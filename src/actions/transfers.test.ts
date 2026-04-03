import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Session } from 'next-auth';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

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

vi.mock('@/lib/services/transfer.service', () => ({
  createTransfer: vi.fn(),
  updateTransfer: vi.fn(),
  deleteTransfer: vi.fn(),
  getUserAverageCostPerMilheiro: vi.fn(),
  TransferNotFoundError: class extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = 'TransferNotFoundError';
    }
  },
}));

vi.mock('@/lib/services/promotion.service', () => ({
  listPromotions: vi.fn(),
  resolveProgramId: vi.fn(),
}));

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import {
  createTransfer,
  updateTransfer,
  deleteTransfer,
  getUserAverageCostPerMilheiro,
  TransferNotFoundError,
} from '@/lib/services/transfer.service';
import {
  listPromotions,
  resolveProgramId,
} from '@/lib/services/promotion.service';
import {
  logTransfer,
  getTransferConversionData,
  editTransfer,
  removeTransfer,
} from './transfers';

const mockAuth = auth as unknown as ReturnType<typeof vi.fn<() => Promise<Session | null>>>;
const mockCreateTransfer = vi.mocked(createTransfer);
const mockUpdateTransfer = vi.mocked(updateTransfer);
const mockDeleteTransfer = vi.mocked(deleteTransfer);
const mockGetUserAverageCostPerMilheiro = vi.mocked(getUserAverageCostPerMilheiro);
const mockListPromotions = vi.mocked(listPromotions);
const mockResolveProgramId = vi.mocked(resolveProgramId);
const mockRevalidatePath = vi.mocked(revalidatePath);

const MOCK_SESSION: Session = {
  user: { id: 'user-123', email: 'test@example.com', role: 'USER' },
  expires: '2026-12-31',
};

const VALID_CREATE_INPUT = {
  sourceProgramName: 'Livelo',
  destProgramName: 'Smiles',
  pointsTransferred: 10000,
  bonusPercent: 90,
  milesReceived: 19000,
  totalCost: 280,
};

function buildMockPromotions(
  overrides: Array<Partial<Awaited<ReturnType<typeof listPromotions>>[number]>>,
): Awaited<ReturnType<typeof listPromotions>> {
  const baseDate = new Date('2026-04-02T00:00:00.000Z');

  return overrides.map((promotion, index) => ({
    id: `promotion-${index}`,
    title: `Promotion ${index}`,
    type: 'TRANSFER_BONUS',
    status: 'ACTIVE',
    sourceProgramId: null,
    destProgramId: 'dest-program-id',
    bonusPercent: 100,
    purchaseDiscount: null,
    purchasePricePerK: null,
    minimumTransfer: null,
    maxBonusCap: null,
    deadline: null,
    sourceUrl: `https://example.com/promotion-${index}`,
    sourceSiteName: 'MilesControl',
    rawContent: null,
    costPerMilheiro: null,
    rating: null,
    isVerified: false,
    requiresClub: false,
    clubExtraBonus: null,
    detectedAt: baseDate,
    createdAt: baseDate,
    updatedAt: baseDate,
    sourceProgram: null,
    destProgram: null,
    ...promotion,
  })) as Awaited<ReturnType<typeof listPromotions>>;
}

describe('logTransfer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(MOCK_SESSION);
  });

  it('should create transfer successfully', async () => {
    mockCreateTransfer.mockResolvedValue({} as Awaited<ReturnType<typeof createTransfer>>);

    const result = await logTransfer(VALID_CREATE_INPUT);

    expect(result.success).toBe(true);
    expect(mockCreateTransfer).toHaveBeenCalledWith('user-123', expect.objectContaining({
      sourceProgramName: 'Livelo',
      destProgramName: 'Smiles',
      pointsTransferred: 10000,
      bonusPercent: 90,
      milesReceived: 19000,
      totalCost: 280,
    }));
    expect(mockRevalidatePath).toHaveBeenCalledWith('/transfers');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/');
  });

  it('should return error for invalid input', async () => {
    const result = await logTransfer({
      sourceProgramName: '',
      destProgramName: '',
      pointsTransferred: 0,
      bonusPercent: 0,
      milesReceived: 0,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
    expect(mockCreateTransfer).not.toHaveBeenCalled();
  });

  it('should return error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await logTransfer(VALID_CREATE_INPUT);

    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be logged in to perform this action');
  });

  it('should return generic error on unexpected failure', async () => {
    mockCreateTransfer.mockRejectedValue(new Error('DB error'));

    const result = await logTransfer(VALID_CREATE_INPUT);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to log transfer. Please try again.');
  });
});

describe('getTransferConversionData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(MOCK_SESSION);
  });

  it('should return CPM data and the highest matching destination promotion', async () => {
    mockGetUserAverageCostPerMilheiro
      .mockResolvedValueOnce(15.5)
      .mockResolvedValueOnce(12);
    mockResolveProgramId.mockResolvedValue('smiles-id');
    mockListPromotions.mockResolvedValue(buildMockPromotions([
      {
        id: 'promotion-source-match',
        title: 'Wrong side promotion',
        sourceProgramId: 'smiles-id',
        destProgramId: 'other-program-id',
        bonusPercent: 120,
      },
      {
        id: 'promotion-dest-match',
        title: 'Best Smiles bonus',
        destProgramId: 'smiles-id',
        bonusPercent: 100,
      },
    ]));

    const result = await getTransferConversionData({
      sourceProgramName: 'Livelo',
      destProgramName: 'Smiles',
    });

    expect(result).toEqual({
      sourceCpm: 15.5,
      destCpm: 12,
      activePromotion: {
        id: 'promotion-dest-match',
        bonusPercent: 100,
        title: 'Best Smiles bonus',
      },
    });
    expect(mockGetUserAverageCostPerMilheiro).toHaveBeenNthCalledWith(1, 'user-123', 'Livelo');
    expect(mockGetUserAverageCostPerMilheiro).toHaveBeenNthCalledWith(2, 'user-123', 'Smiles');
    expect(mockResolveProgramId).toHaveBeenCalledWith('Smiles');
    expect(mockListPromotions).toHaveBeenCalledWith({
      status: 'ACTIVE',
      type: 'TRANSFER_BONUS',
      programId: 'smiles-id',
      sortBy: 'bonusPercent',
      sortOrder: 'desc',
    });
  });

  it('should return null CPM values when no transfer history exists', async () => {
    mockGetUserAverageCostPerMilheiro
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mockResolveProgramId.mockResolvedValue('smiles-id');
    mockListPromotions.mockResolvedValue(buildMockPromotions([]));

    const result = await getTransferConversionData({
      sourceProgramName: 'Livelo',
      destProgramName: 'Smiles',
    });

    expect(result).toEqual({
      sourceCpm: null,
      destCpm: null,
      activePromotion: null,
    });
    expect(mockListPromotions).toHaveBeenCalledTimes(1);
  });

  it('should return null promotion when destination program cannot be resolved', async () => {
    mockGetUserAverageCostPerMilheiro
      .mockResolvedValueOnce(15.5)
      .mockResolvedValueOnce(12);
    mockResolveProgramId.mockResolvedValue(null);

    const result = await getTransferConversionData({
      sourceProgramName: 'Livelo',
      destProgramName: 'Smiles',
    });

    expect(result).toEqual({
      sourceCpm: 15.5,
      destCpm: 12,
      activePromotion: null,
    });
    expect(mockListPromotions).not.toHaveBeenCalled();
  });

  it('should return null promotion when there is no exact destination match', async () => {
    mockGetUserAverageCostPerMilheiro
      .mockResolvedValueOnce(15.5)
      .mockResolvedValueOnce(12);
    mockResolveProgramId.mockResolvedValue('smiles-id');
    mockListPromotions.mockResolvedValue(buildMockPromotions([
      {
        id: 'promotion-source-match',
        title: 'Only source match',
        sourceProgramId: 'smiles-id',
        destProgramId: 'other-program-id',
        bonusPercent: 120,
      },
    ]));

    const result = await getTransferConversionData({
      sourceProgramName: 'Livelo',
      destProgramName: 'Smiles',
    });

    expect(result.activePromotion).toBeNull();
  });

  it('should return empty data for invalid input', async () => {
    const result = await getTransferConversionData({
      sourceProgramName: '   ',
      destProgramName: '',
    });

    expect(result).toEqual({
      sourceCpm: null,
      destCpm: null,
      activePromotion: null,
    });
    expect(mockAuth).not.toHaveBeenCalled();
    expect(mockGetUserAverageCostPerMilheiro).not.toHaveBeenCalled();
  });

  it('should return empty data when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await getTransferConversionData({
      sourceProgramName: 'Livelo',
      destProgramName: 'Smiles',
    });

    expect(result).toEqual({
      sourceCpm: null,
      destCpm: null,
      activePromotion: null,
    });
    expect(mockGetUserAverageCostPerMilheiro).not.toHaveBeenCalled();
  });

  it('should log debug messages when CPM data is unavailable', async () => {
    const { logger } = await import('@/lib/logger');

    mockGetUserAverageCostPerMilheiro
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mockResolveProgramId.mockResolvedValue('smiles-id');
    mockListPromotions.mockResolvedValue(buildMockPromotions([]));

    await getTransferConversionData({
      sourceProgramName: 'Livelo',
      destProgramName: 'Smiles',
    });

    expect(logger.debug).toHaveBeenCalledWith(
      { userId: 'user-123', program: 'Livelo' },
      'No CPM data available for conversion display',
    );
    expect(logger.debug).toHaveBeenCalledWith(
      { userId: 'user-123', program: 'Smiles' },
      'No CPM data available for conversion display',
    );
  });

  it('should log errors and return empty data when a service fails', async () => {
    const { logger } = await import('@/lib/logger');

    mockGetUserAverageCostPerMilheiro.mockRejectedValue(new Error('DB error'));

    const result = await getTransferConversionData({
      sourceProgramName: 'Livelo',
      destProgramName: 'Smiles',
    });

    expect(result).toEqual({
      sourceCpm: null,
      destCpm: null,
      activePromotion: null,
    });
    expect(logger.error).toHaveBeenCalledWith(
      {
        err: expect.any(Error),
        input: {
          sourceProgramName: 'Livelo',
          destProgramName: 'Smiles',
        },
      },
      'Failed to fetch transfer conversion data',
    );
  });
});

describe('editTransfer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(MOCK_SESSION);
  });

  it('should update transfer successfully', async () => {
    mockUpdateTransfer.mockResolvedValue({} as Awaited<ReturnType<typeof updateTransfer>>);

    const result = await editTransfer({
      transferId: 'transfer-123',
      pointsTransferred: 15000,
    });

    expect(result.success).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/transfers');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/');
  });

  it('should return error for invalid input', async () => {
    const result = await editTransfer({ transferId: '' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
  });

  it('should return error when transfer not found', async () => {
    mockUpdateTransfer.mockRejectedValue(new TransferNotFoundError('transfer-999'));

    const result = await editTransfer({ transferId: 'transfer-999', pointsTransferred: 1000 });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Transfer not found');
  });

  it('should return error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await editTransfer({ transferId: 'transfer-123' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be logged in to perform this action');
  });

  it('should return generic error on unexpected failure', async () => {
    mockUpdateTransfer.mockRejectedValue(new Error('DB error'));

    const result = await editTransfer({ transferId: 'transfer-123', pointsTransferred: 1000 });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to update transfer. Please try again.');
  });
});

describe('removeTransfer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(MOCK_SESSION);
  });

  it('should delete transfer successfully', async () => {
    mockDeleteTransfer.mockResolvedValue(undefined);

    const result = await removeTransfer('transfer-123');

    expect(result.success).toBe(true);
    expect(mockDeleteTransfer).toHaveBeenCalledWith('user-123', 'transfer-123');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/transfers');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/');
  });

  it('should return error for empty transferId', async () => {
    const result = await removeTransfer('');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
  });

  it('should return error when transfer not found', async () => {
    mockDeleteTransfer.mockRejectedValue(new TransferNotFoundError('transfer-999'));

    const result = await removeTransfer('transfer-999');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Transfer not found');
  });

  it('should return error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await removeTransfer('transfer-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be logged in to perform this action');
  });

  it('should return generic error on unexpected failure', async () => {
    mockDeleteTransfer.mockRejectedValue(new Error('DB error'));

    const result = await removeTransfer('transfer-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to delete transfer. Please try again.');
  });
});
