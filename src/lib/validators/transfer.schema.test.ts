import { describe, it, expect } from 'vitest';
import { createTransferSchema, updateTransferSchema, deleteTransferSchema } from './transfer.schema';

describe('createTransferSchema', () => {
  const VALID_INPUT = {
    sourceProgramName: 'Livelo',
    destProgramName: 'Smiles',
    pointsTransferred: 10000,
    bonusPercent: 90,
    milesReceived: 19000,
    totalCost: 280,
    notes: 'Black Friday promo',
    transferDate: '2026-03-15',
  };

  it('should accept valid input with all fields', () => {
    const result = createTransferSchema.safeParse(VALID_INPUT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sourceProgramName).toBe('Livelo');
      expect(result.data.destProgramName).toBe('Smiles');
      expect(result.data.pointsTransferred).toBe(10000);
      expect(result.data.bonusPercent).toBe(90);
      expect(result.data.milesReceived).toBe(19000);
      expect(result.data.totalCost).toBe(280);
    }
  });

  it('should accept valid input with only required fields', () => {
    const result = createTransferSchema.safeParse({
      sourceProgramName: 'Livelo',
      destProgramName: 'Smiles',
      pointsTransferred: 10000,
      milesReceived: 10000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bonusPercent).toBe(0);
      expect(result.data.totalCost).toBeUndefined();
    }
  });

  it('should accept null totalCost', () => {
    const result = createTransferSchema.safeParse({
      sourceProgramName: 'Esfera',
      destProgramName: 'Smiles',
      pointsTransferred: 5000,
      milesReceived: 5000,
      totalCost: null,
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty source program name', () => {
    const result = createTransferSchema.safeParse({
      ...VALID_INPUT,
      sourceProgramName: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty destination program name', () => {
    const result = createTransferSchema.safeParse({
      ...VALID_INPUT,
      destProgramName: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject zero points transferred', () => {
    const result = createTransferSchema.safeParse({
      ...VALID_INPUT,
      pointsTransferred: 0,
    });
    expect(result.success).toBe(false);
  });

  it('should reject negative points transferred', () => {
    const result = createTransferSchema.safeParse({
      ...VALID_INPUT,
      pointsTransferred: -100,
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-integer points transferred', () => {
    const result = createTransferSchema.safeParse({
      ...VALID_INPUT,
      pointsTransferred: 10.5,
    });
    expect(result.success).toBe(false);
  });

  it('should reject zero miles received', () => {
    const result = createTransferSchema.safeParse({
      ...VALID_INPUT,
      milesReceived: 0,
    });
    expect(result.success).toBe(false);
  });

  it('should reject negative bonus percent', () => {
    const result = createTransferSchema.safeParse({
      ...VALID_INPUT,
      bonusPercent: -5,
    });
    expect(result.success).toBe(false);
  });

  it('should reject negative total cost', () => {
    const result = createTransferSchema.safeParse({
      ...VALID_INPUT,
      totalCost: -100,
    });
    expect(result.success).toBe(false);
  });

  it('should accept zero total cost', () => {
    const result = createTransferSchema.safeParse({
      ...VALID_INPUT,
      totalCost: 0,
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid transferDate', () => {
    const result = createTransferSchema.safeParse({
      ...VALID_INPUT,
      transferDate: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });

  it('should accept promotionId', () => {
    const result = createTransferSchema.safeParse({
      ...VALID_INPUT,
      promotionId: 'promo-123',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.promotionId).toBe('promo-123');
    }
  });
});

describe('updateTransferSchema', () => {
  it('should accept valid partial update', () => {
    const result = updateTransferSchema.safeParse({
      transferId: 'transfer-123',
      pointsTransferred: 15000,
      milesReceived: 28500,
      bonusPercent: 90,
    });
    expect(result.success).toBe(true);
  });

  it('should accept update with only transferId', () => {
    const result = updateTransferSchema.safeParse({
      transferId: 'transfer-123',
    });
    expect(result.success).toBe(true);
  });

  it('should accept null totalCost for clearing', () => {
    const result = updateTransferSchema.safeParse({
      transferId: 'transfer-123',
      totalCost: null,
    });
    expect(result.success).toBe(true);
  });

  it('should accept null notes for clearing', () => {
    const result = updateTransferSchema.safeParse({
      transferId: 'transfer-123',
      notes: null,
    });
    expect(result.success).toBe(true);
  });

  it('should accept null promotionId for clearing', () => {
    const result = updateTransferSchema.safeParse({
      transferId: 'transfer-123',
      promotionId: null,
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty transferId', () => {
    const result = updateTransferSchema.safeParse({ transferId: '' });
    expect(result.success).toBe(false);
  });

  it('should reject negative points transferred', () => {
    const result = updateTransferSchema.safeParse({
      transferId: 'transfer-123',
      pointsTransferred: -1,
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid transferDate', () => {
    const result = updateTransferSchema.safeParse({
      transferId: 'transfer-123',
      transferDate: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });
});

describe('deleteTransferSchema', () => {
  it('should accept valid transferId', () => {
    const result = deleteTransferSchema.safeParse({ transferId: 'transfer-123' });
    expect(result.success).toBe(true);
  });

  it('should reject empty transferId', () => {
    const result = deleteTransferSchema.safeParse({ transferId: '' });
    expect(result.success).toBe(false);
  });
});
