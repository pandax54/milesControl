import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  TransferNotFoundError: class extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = 'TransferNotFoundError';
    }
  },
}));

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import {
  createTransfer,
  updateTransfer,
  deleteTransfer,
  TransferNotFoundError,
} from '@/lib/services/transfer.service';
import { logTransfer, editTransfer, removeTransfer } from './transfers';

const mockAuth = vi.mocked(auth);
const mockCreateTransfer = vi.mocked(createTransfer);
const mockUpdateTransfer = vi.mocked(updateTransfer);
const mockDeleteTransfer = vi.mocked(deleteTransfer);
const mockRevalidatePath = vi.mocked(revalidatePath);

const MOCK_SESSION = {
  user: { id: 'user-123', email: 'test@example.com', role: 'USER' as const },
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

describe('logTransfer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(MOCK_SESSION as never);
  });

  it('should create transfer successfully', async () => {
    mockCreateTransfer.mockResolvedValue({} as never);

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
    mockAuth.mockResolvedValue(null as never);

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

describe('editTransfer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(MOCK_SESSION as never);
  });

  it('should update transfer successfully', async () => {
    mockUpdateTransfer.mockResolvedValue({} as never);

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
    mockAuth.mockResolvedValue(null as never);

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
    mockAuth.mockResolvedValue(MOCK_SESSION as never);
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
    mockAuth.mockResolvedValue(null as never);

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
