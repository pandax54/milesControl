import { describe, it, expect } from 'vitest';
import {
  createBenefitSchema,
  updateBenefitSchema,
  deleteBenefitSchema,
  markBenefitUsedSchema,
} from './benefit.schema';

describe('createBenefitSchema', () => {
  it('should accept valid input with all fields', () => {
    const result = createBenefitSchema.safeParse({
      type: 'FREE_NIGHT',
      programOrCard: 'Clube Smiles',
      description: 'Free night at Marriott',
      quantity: 2,
      expirationDate: '2026-12-31',
      notes: 'Must use by end of year',
    });

    expect(result.success).toBe(true);
  });

  it('should accept valid input with only required fields', () => {
    const result = createBenefitSchema.safeParse({
      type: 'LOUNGE_ACCESS',
      programOrCard: 'Itaú The One',
      description: 'Priority Pass lounge visit',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity).toBe(1);
    }
  });

  it('should accept null expirationDate', () => {
    const result = createBenefitSchema.safeParse({
      type: 'TRAVEL_CREDIT',
      programOrCard: 'Amex Platinum',
      description: 'Annual travel credit',
      expirationDate: null,
    });

    expect(result.success).toBe(true);
  });

  it('should reject missing type', () => {
    const result = createBenefitSchema.safeParse({
      programOrCard: 'Clube Smiles',
      description: 'Free night',
    });

    expect(result.success).toBe(false);
  });

  it('should reject invalid type', () => {
    const result = createBenefitSchema.safeParse({
      type: 'INVALID_TYPE',
      programOrCard: 'Clube Smiles',
      description: 'Free night',
    });

    expect(result.success).toBe(false);
  });

  it('should reject empty programOrCard', () => {
    const result = createBenefitSchema.safeParse({
      type: 'FREE_NIGHT',
      programOrCard: '',
      description: 'Free night',
    });

    expect(result.success).toBe(false);
  });

  it('should reject empty description', () => {
    const result = createBenefitSchema.safeParse({
      type: 'FREE_NIGHT',
      programOrCard: 'Clube Smiles',
      description: '',
    });

    expect(result.success).toBe(false);
  });

  it('should reject quantity less than 1', () => {
    const result = createBenefitSchema.safeParse({
      type: 'FREE_NIGHT',
      programOrCard: 'Clube Smiles',
      description: 'Free night',
      quantity: 0,
    });

    expect(result.success).toBe(false);
  });

  it('should reject non-integer quantity', () => {
    const result = createBenefitSchema.safeParse({
      type: 'FREE_NIGHT',
      programOrCard: 'Clube Smiles',
      description: 'Free night',
      quantity: 1.5,
    });

    expect(result.success).toBe(false);
  });

  it('should reject invalid expirationDate string', () => {
    const result = createBenefitSchema.safeParse({
      type: 'FREE_NIGHT',
      programOrCard: 'Clube Smiles',
      description: 'Free night',
      expirationDate: 'not-a-date',
    });

    expect(result.success).toBe(false);
  });

  it('should accept all valid benefit types', () => {
    const types = [
      'FREE_NIGHT',
      'COMPANION_PASS',
      'UPGRADE_CREDIT',
      'LOUNGE_ACCESS',
      'TRAVEL_CREDIT',
      'OTHER',
    ];

    for (const type of types) {
      const result = createBenefitSchema.safeParse({
        type,
        programOrCard: 'Test Program',
        description: 'Test description',
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('updateBenefitSchema', () => {
  it('should accept partial update with only benefitId', () => {
    const result = updateBenefitSchema.safeParse({
      benefitId: 'benefit-123',
    });

    expect(result.success).toBe(true);
  });

  it('should accept all optional fields', () => {
    const result = updateBenefitSchema.safeParse({
      benefitId: 'benefit-123',
      type: 'COMPANION_PASS',
      programOrCard: 'Updated Program',
      description: 'Updated description',
      quantity: 3,
      remainingQty: 2,
      expirationDate: '2027-06-30',
      isUsed: false,
      notes: 'Updated notes',
    });

    expect(result.success).toBe(true);
  });

  it('should reject empty benefitId', () => {
    const result = updateBenefitSchema.safeParse({
      benefitId: '',
    });

    expect(result.success).toBe(false);
  });

  it('should reject negative remainingQty', () => {
    const result = updateBenefitSchema.safeParse({
      benefitId: 'benefit-123',
      remainingQty: -1,
    });

    expect(result.success).toBe(false);
  });

  it('should accept null expirationDate for clearing', () => {
    const result = updateBenefitSchema.safeParse({
      benefitId: 'benefit-123',
      expirationDate: null,
    });

    expect(result.success).toBe(true);
  });

  it('should reject invalid expirationDate string', () => {
    const result = updateBenefitSchema.safeParse({
      benefitId: 'benefit-123',
      expirationDate: 'not-a-date',
    });

    expect(result.success).toBe(false);
  });

  it('should accept null notes for clearing', () => {
    const result = updateBenefitSchema.safeParse({
      benefitId: 'benefit-123',
      notes: null,
    });

    expect(result.success).toBe(true);
  });
});

describe('deleteBenefitSchema', () => {
  it('should accept valid benefitId', () => {
    const result = deleteBenefitSchema.safeParse({
      benefitId: 'benefit-123',
    });

    expect(result.success).toBe(true);
  });

  it('should reject empty benefitId', () => {
    const result = deleteBenefitSchema.safeParse({
      benefitId: '',
    });

    expect(result.success).toBe(false);
  });
});

describe('markBenefitUsedSchema', () => {
  it('should accept valid benefitId', () => {
    const result = markBenefitUsedSchema.safeParse({
      benefitId: 'benefit-123',
    });

    expect(result.success).toBe(true);
  });

  it('should reject empty benefitId', () => {
    const result = markBenefitUsedSchema.safeParse({
      benefitId: '',
    });

    expect(result.success).toBe(false);
  });
});
