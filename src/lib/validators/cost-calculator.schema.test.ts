import { describe, it, expect } from 'vitest';
import { calculatorInputSchema, compareInputSchema, redemptionAdvisorInputSchema } from './cost-calculator.schema';

describe('calculatorInputSchema', () => {
  it('should accept valid input with required fields', () => {
    const result = calculatorInputSchema.safeParse({
      purchasePricePerPoint: 0.028,
      quantity: 10000,
      transferBonusPercent: 90,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      purchasePricePerPoint: 0.028,
      quantity: 10000,
      transferBonusPercent: 90,
    });
  });

  it('should accept valid input with all fields', () => {
    const result = calculatorInputSchema.safeParse({
      purchasePricePerPoint: 0.028,
      quantity: 10000,
      transferBonusPercent: 90,
      clubMonthlyCost: 42.9,
      clubExclusiveBonusPercent: 10,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      purchasePricePerPoint: 0.028,
      quantity: 10000,
      transferBonusPercent: 90,
      clubMonthlyCost: 42.9,
      clubExclusiveBonusPercent: 10,
    });
  });

  it('should default transferBonusPercent to 0 when not provided', () => {
    const result = calculatorInputSchema.safeParse({
      purchasePricePerPoint: 0.028,
      quantity: 10000,
    });

    expect(result.success).toBe(true);
    expect(result.data?.transferBonusPercent).toBe(0);
  });

  it('should reject negative purchasePricePerPoint', () => {
    const result = calculatorInputSchema.safeParse({
      purchasePricePerPoint: -0.01,
      quantity: 10000,
      transferBonusPercent: 90,
    });

    expect(result.success).toBe(false);
  });

  it('should reject quantity less than 1', () => {
    const result = calculatorInputSchema.safeParse({
      purchasePricePerPoint: 0.028,
      quantity: 0,
      transferBonusPercent: 90,
    });

    expect(result.success).toBe(false);
  });

  it('should reject non-integer quantity', () => {
    const result = calculatorInputSchema.safeParse({
      purchasePricePerPoint: 0.028,
      quantity: 10.5,
      transferBonusPercent: 90,
    });

    expect(result.success).toBe(false);
  });

  it('should reject negative transferBonusPercent', () => {
    const result = calculatorInputSchema.safeParse({
      purchasePricePerPoint: 0.028,
      quantity: 10000,
      transferBonusPercent: -10,
    });

    expect(result.success).toBe(false);
  });

  it('should reject negative clubMonthlyCost', () => {
    const result = calculatorInputSchema.safeParse({
      purchasePricePerPoint: 0.028,
      quantity: 10000,
      transferBonusPercent: 90,
      clubMonthlyCost: -5,
    });

    expect(result.success).toBe(false);
  });

  it('should reject negative clubExclusiveBonusPercent', () => {
    const result = calculatorInputSchema.safeParse({
      purchasePricePerPoint: 0.028,
      quantity: 10000,
      transferBonusPercent: 90,
      clubExclusiveBonusPercent: -10,
    });

    expect(result.success).toBe(false);
  });

  it('should accept zero purchasePricePerPoint', () => {
    const result = calculatorInputSchema.safeParse({
      purchasePricePerPoint: 0,
      quantity: 10000,
      transferBonusPercent: 90,
    });

    expect(result.success).toBe(true);
  });

  it('should reject missing required fields', () => {
    const result = calculatorInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('compareInputSchema', () => {
  const validScenario = {
    purchasePricePerPoint: 0.028,
    quantity: 10000,
    transferBonusPercent: 90,
  };

  it('should accept 2 valid scenarios', () => {
    const result = compareInputSchema.safeParse({
      scenarios: [validScenario, { ...validScenario, transferBonusPercent: 100 }],
    });

    expect(result.success).toBe(true);
    expect(result.data?.scenarios).toHaveLength(2);
  });

  it('should accept 3 valid scenarios', () => {
    const result = compareInputSchema.safeParse({
      scenarios: [
        validScenario,
        { ...validScenario, transferBonusPercent: 100 },
        { ...validScenario, transferBonusPercent: 70 },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.data?.scenarios).toHaveLength(3);
  });

  it('should reject fewer than 2 scenarios', () => {
    const result = compareInputSchema.safeParse({
      scenarios: [validScenario],
    });

    expect(result.success).toBe(false);
  });

  it('should reject more than 3 scenarios', () => {
    const result = compareInputSchema.safeParse({
      scenarios: [validScenario, validScenario, validScenario, validScenario],
    });

    expect(result.success).toBe(false);
  });

  it('should reject empty scenarios array', () => {
    const result = compareInputSchema.safeParse({ scenarios: [] });
    expect(result.success).toBe(false);
  });

  it('should reject scenarios with invalid inputs', () => {
    const result = compareInputSchema.safeParse({
      scenarios: [validScenario, { purchasePricePerPoint: -1, quantity: 0 }],
    });

    expect(result.success).toBe(false);
  });
});

describe('redemptionAdvisorInputSchema', () => {
  it('should accept valid input with required fields', () => {
    const result = redemptionAdvisorInputSchema.safeParse({
      cashPriceBRL: 3500,
      milesRequired: 35000,
      program: 'Smiles',
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      cashPriceBRL: 3500,
      milesRequired: 35000,
      taxesBRL: 0,
      program: 'Smiles',
    });
  });

  it('should accept valid input with all fields', () => {
    const result = redemptionAdvisorInputSchema.safeParse({
      cashPriceBRL: 3500,
      milesRequired: 35000,
      taxesBRL: 120,
      program: 'Smiles',
      userAvgCostPerMilheiro: 14,
    });

    expect(result.success).toBe(true);
    expect(result.data?.userAvgCostPerMilheiro).toBe(14);
  });

  it('should default taxesBRL to 0 when not provided', () => {
    const result = redemptionAdvisorInputSchema.safeParse({
      cashPriceBRL: 3500,
      milesRequired: 35000,
      program: 'Smiles',
    });

    expect(result.success).toBe(true);
    expect(result.data?.taxesBRL).toBe(0);
  });

  it('should reject negative cashPriceBRL', () => {
    const result = redemptionAdvisorInputSchema.safeParse({
      cashPriceBRL: -100,
      milesRequired: 35000,
      program: 'Smiles',
    });

    expect(result.success).toBe(false);
  });

  it('should reject milesRequired less than 1', () => {
    const result = redemptionAdvisorInputSchema.safeParse({
      cashPriceBRL: 3500,
      milesRequired: 0,
      program: 'Smiles',
    });

    expect(result.success).toBe(false);
  });

  it('should reject non-integer milesRequired', () => {
    const result = redemptionAdvisorInputSchema.safeParse({
      cashPriceBRL: 3500,
      milesRequired: 35000.5,
      program: 'Smiles',
    });

    expect(result.success).toBe(false);
  });

  it('should reject empty program', () => {
    const result = redemptionAdvisorInputSchema.safeParse({
      cashPriceBRL: 3500,
      milesRequired: 35000,
      program: '',
    });

    expect(result.success).toBe(false);
  });

  it('should reject negative taxes', () => {
    const result = redemptionAdvisorInputSchema.safeParse({
      cashPriceBRL: 3500,
      milesRequired: 35000,
      taxesBRL: -50,
      program: 'Smiles',
    });

    expect(result.success).toBe(false);
  });

  it('should reject negative userAvgCostPerMilheiro', () => {
    const result = redemptionAdvisorInputSchema.safeParse({
      cashPriceBRL: 3500,
      milesRequired: 35000,
      program: 'Smiles',
      userAvgCostPerMilheiro: -5,
    });

    expect(result.success).toBe(false);
  });

  it('should reject missing required fields', () => {
    const result = redemptionAdvisorInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
