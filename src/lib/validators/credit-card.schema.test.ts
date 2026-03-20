import { describe, it, expect } from 'vitest';
import { createCreditCardSchema, updateCreditCardSchema, deleteCreditCardSchema } from './credit-card.schema';

describe('createCreditCardSchema', () => {
  it('should accept valid input with all fields', () => {
    const input = {
      bankName: 'Itaú',
      cardName: 'Azul Infinite',
      pointsProgram: 'Livelo',
      pointsPerReal: 2.0,
      pointsPerDollar: 4.0,
      annualFee: 1200,
      isWaivedFee: false,
      benefits: ['Sala VIP', 'Seguro viagem'],
    };

    const result = createCreditCardSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bankName).toBe('Itaú');
      expect(result.data.pointsPerReal).toBe(2.0);
    }
  });

  it('should accept valid input with only required fields', () => {
    const input = {
      bankName: 'Bradesco',
      cardName: 'Smiles Platinum',
      pointsProgram: 'Livelo',
      pointsPerReal: 1.5,
    };

    const result = createCreditCardSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.annualFee).toBe(0);
      expect(result.data.isWaivedFee).toBe(false);
    }
  });

  it('should reject empty bankName', () => {
    const result = createCreditCardSchema.safeParse({
      bankName: '',
      cardName: 'Test',
      pointsProgram: 'Livelo',
      pointsPerReal: 1,
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty cardName', () => {
    const result = createCreditCardSchema.safeParse({
      bankName: 'Test',
      cardName: '',
      pointsProgram: 'Livelo',
      pointsPerReal: 1,
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty pointsProgram', () => {
    const result = createCreditCardSchema.safeParse({
      bankName: 'Test',
      cardName: 'Test',
      pointsProgram: '',
      pointsPerReal: 1,
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-positive pointsPerReal', () => {
    const result = createCreditCardSchema.safeParse({
      bankName: 'Test',
      cardName: 'Test',
      pointsProgram: 'Livelo',
      pointsPerReal: 0,
    });
    expect(result.success).toBe(false);
  });

  it('should reject negative pointsPerReal', () => {
    const result = createCreditCardSchema.safeParse({
      bankName: 'Test',
      cardName: 'Test',
      pointsProgram: 'Livelo',
      pointsPerReal: -1,
    });
    expect(result.success).toBe(false);
  });

  it('should reject negative annualFee', () => {
    const result = createCreditCardSchema.safeParse({
      bankName: 'Test',
      cardName: 'Test',
      pointsProgram: 'Livelo',
      pointsPerReal: 1,
      annualFee: -100,
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-positive pointsPerDollar when provided', () => {
    const result = createCreditCardSchema.safeParse({
      bankName: 'Test',
      cardName: 'Test',
      pointsProgram: 'Livelo',
      pointsPerReal: 1,
      pointsPerDollar: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe('updateCreditCardSchema', () => {
  it('should accept valid input with all fields', () => {
    const input = {
      cardId: 'card-123',
      bankName: 'Itaú',
      cardName: 'Azul Infinite',
      pointsProgram: 'Livelo',
      pointsPerReal: 3.0,
      pointsPerDollar: 5.0,
      annualFee: 1500,
      isWaivedFee: true,
      benefits: ['Sala VIP'],
    };

    const result = updateCreditCardSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should accept partial update with only cardId', () => {
    const result = updateCreditCardSchema.safeParse({ cardId: 'card-123' });
    expect(result.success).toBe(true);
  });

  it('should accept null pointsPerDollar for clearing', () => {
    const result = updateCreditCardSchema.safeParse({
      cardId: 'card-123',
      pointsPerDollar: null,
    });
    expect(result.success).toBe(true);
  });

  it('should accept null benefits for clearing', () => {
    const result = updateCreditCardSchema.safeParse({
      cardId: 'card-123',
      benefits: null,
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty cardId', () => {
    const result = updateCreditCardSchema.safeParse({ cardId: '' });
    expect(result.success).toBe(false);
  });

  it('should reject non-positive pointsPerReal', () => {
    const result = updateCreditCardSchema.safeParse({
      cardId: 'card-123',
      pointsPerReal: 0,
    });
    expect(result.success).toBe(false);
  });

  it('should reject negative annualFee', () => {
    const result = updateCreditCardSchema.safeParse({
      cardId: 'card-123',
      annualFee: -50,
    });
    expect(result.success).toBe(false);
  });
});

describe('deleteCreditCardSchema', () => {
  it('should accept valid cardId', () => {
    const result = deleteCreditCardSchema.safeParse({ cardId: 'card-123' });
    expect(result.success).toBe(true);
  });

  it('should reject empty cardId', () => {
    const result = deleteCreditCardSchema.safeParse({ cardId: '' });
    expect(result.success).toBe(false);
  });
});
