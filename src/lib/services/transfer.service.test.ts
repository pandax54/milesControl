import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma, type TransferLog } from '@/generated/prisma/client';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    transferLog: {
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
  listTransfers,
  createTransfer,
  updateTransfer,
  deleteTransfer,
  calculateCostPerMilheiro,
  TransferNotFoundError,
} from './transfer.service';

const mockFindMany = vi.mocked(prisma.transferLog.findMany);
const mockFindFirst = vi.mocked(prisma.transferLog.findFirst);
const mockCreate = vi.mocked(prisma.transferLog.create);
const mockUpdate = vi.mocked(prisma.transferLog.update);
const mockDelete = vi.mocked(prisma.transferLog.delete);

const USER_ID = 'user-123';

function buildMockTransfer(overrides: Partial<TransferLog> = {}): TransferLog {
  return {
    id: 'transfer-1',
    userId: USER_ID,
    sourceProgramName: 'Livelo',
    destProgramName: 'Smiles',
    pointsTransferred: 10000,
    bonusPercent: 90,
    milesReceived: 19000,
    totalCost: new Prisma.Decimal(280),
    costPerMilheiro: new Prisma.Decimal(14.74),
    promotionId: null,
    notes: null,
    transferDate: new Date('2026-03-15'),
    createdAt: new Date('2026-03-15'),
    ...overrides,
  };
}

describe('calculateCostPerMilheiro', () => {
  it('should calculate cost per milheiro correctly', () => {
    expect(calculateCostPerMilheiro(280, 19000)).toBeCloseTo(14.74, 1);
  });

  it('should return 0 when miles received is zero', () => {
    expect(calculateCostPerMilheiro(100, 0)).toBe(0);
  });

  it('should return 0 when miles received is negative', () => {
    expect(calculateCostPerMilheiro(100, -1000)).toBe(0);
  });

  it('should handle zero cost', () => {
    expect(calculateCostPerMilheiro(0, 10000)).toBe(0);
  });
});

describe('listTransfers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return transfers for user ordered by date desc', async () => {
    const mockTransfers = [buildMockTransfer()];
    mockFindMany.mockResolvedValue(mockTransfers);

    const result = await listTransfers(USER_ID);

    expect(result).toEqual(mockTransfers);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      orderBy: { transferDate: 'desc' },
    });
  });

  it('should return empty array when no transfers exist', async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await listTransfers(USER_ID);

    expect(result).toEqual([]);
  });
});

describe('createTransfer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create transfer with cost per milheiro calculated', async () => {
    const created = buildMockTransfer();
    mockCreate.mockResolvedValue(created);

    const result = await createTransfer(USER_ID, {
      sourceProgramName: 'Livelo',
      destProgramName: 'Smiles',
      pointsTransferred: 10000,
      bonusPercent: 90,
      milesReceived: 19000,
      totalCost: 280,
    });

    expect(result).toEqual(created);
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: USER_ID,
        sourceProgramName: 'Livelo',
        destProgramName: 'Smiles',
        pointsTransferred: 10000,
        bonusPercent: 90,
        milesReceived: 19000,
        totalCost: 280,
        costPerMilheiro: expect.closeTo(14.74, 1),
      }),
    });
  });

  it('should create transfer with null cost when totalCost is null', async () => {
    const created = buildMockTransfer({ totalCost: null, costPerMilheiro: null });
    mockCreate.mockResolvedValue(created);

    await createTransfer(USER_ID, {
      sourceProgramName: 'Esfera',
      destProgramName: 'Smiles',
      pointsTransferred: 5000,
      bonusPercent: 0,
      milesReceived: 5000,
      totalCost: null,
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        totalCost: null,
        costPerMilheiro: null,
      }),
    });
  });

  it('should use provided transferDate', async () => {
    mockCreate.mockResolvedValue(buildMockTransfer());

    await createTransfer(USER_ID, {
      sourceProgramName: 'Livelo',
      destProgramName: 'Smiles',
      pointsTransferred: 10000,
      bonusPercent: 0,
      milesReceived: 10000,
      transferDate: '2026-01-15',
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        transferDate: new Date('2026-01-15'),
      }),
    });
  });

  it('should store promotionId when provided', async () => {
    mockCreate.mockResolvedValue(buildMockTransfer({ promotionId: 'promo-1' }));

    await createTransfer(USER_ID, {
      sourceProgramName: 'Livelo',
      destProgramName: 'Smiles',
      pointsTransferred: 10000,
      bonusPercent: 90,
      milesReceived: 19000,
      promotionId: 'promo-1',
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        promotionId: 'promo-1',
      }),
    });
  });
});

describe('updateTransfer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update transfer successfully', async () => {
    const existing = buildMockTransfer();
    mockFindFirst.mockResolvedValue(existing);
    mockUpdate.mockResolvedValue(existing);

    const result = await updateTransfer(USER_ID, {
      transferId: 'transfer-1',
      pointsTransferred: 15000,
      milesReceived: 28500,
    });

    expect(result).toEqual(existing);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'transfer-1' },
      data: expect.objectContaining({
        pointsTransferred: 15000,
        milesReceived: 28500,
      }),
    });
  });

  it('should throw TransferNotFoundError when transfer does not exist', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      updateTransfer(USER_ID, { transferId: 'nonexistent' }),
    ).rejects.toThrow(TransferNotFoundError);
  });

  it('should recalculate costPerMilheiro when totalCost changes', async () => {
    const existing = buildMockTransfer();
    mockFindFirst.mockResolvedValue(existing);
    mockUpdate.mockResolvedValue(existing);

    await updateTransfer(USER_ID, {
      transferId: 'transfer-1',
      totalCost: 380,
    });

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'transfer-1' },
      data: expect.objectContaining({
        totalCost: 380,
        costPerMilheiro: expect.closeTo(20, 0),
      }),
    });
  });

  it('should set costPerMilheiro to null when totalCost is cleared', async () => {
    const existing = buildMockTransfer();
    mockFindFirst.mockResolvedValue(existing);
    mockUpdate.mockResolvedValue(existing);

    await updateTransfer(USER_ID, {
      transferId: 'transfer-1',
      totalCost: null,
    });

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'transfer-1' },
      data: expect.objectContaining({
        totalCost: null,
        costPerMilheiro: null,
      }),
    });
  });

  it('should update notes', async () => {
    const existing = buildMockTransfer();
    mockFindFirst.mockResolvedValue(existing);
    mockUpdate.mockResolvedValue(existing);

    await updateTransfer(USER_ID, {
      transferId: 'transfer-1',
      notes: 'Updated note',
    });

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'transfer-1' },
      data: expect.objectContaining({
        notes: 'Updated note',
      }),
    });
  });
});

describe('deleteTransfer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete transfer successfully', async () => {
    const existing = buildMockTransfer();
    mockFindFirst.mockResolvedValue(existing);
    mockDelete.mockResolvedValue(existing);

    await deleteTransfer(USER_ID, 'transfer-1');

    expect(mockDelete).toHaveBeenCalledWith({
      where: { id: 'transfer-1' },
    });
  });

  it('should throw TransferNotFoundError when transfer does not exist', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(deleteTransfer(USER_ID, 'nonexistent')).rejects.toThrow(TransferNotFoundError);
  });

  it('should only delete transfers owned by user', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(deleteTransfer('other-user', 'transfer-1')).rejects.toThrow(TransferNotFoundError);
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: 'transfer-1', userId: 'other-user' },
    });
  });
});
