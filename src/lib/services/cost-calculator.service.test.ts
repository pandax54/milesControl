import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  calculateTotalMiles,
  calculateTotalCost,
  computeCostPerMilheiro,
  rateByThreshold,
  calculateCostPerMilheiro,
  ratePromotion,
  compareScenarios,
  computeRedemptionAdvisor,
  InsufficientScenariosError,
  TooManyScenariosError,
  PRESET_SCENARIOS,
} from './cost-calculator.service';
import type { CalculatorInput } from '@/lib/validators/cost-calculator.schema';

// ==================== calculateTotalMiles ====================

describe('calculateTotalMiles', () => {
  it('should calculate miles with transfer bonus', () => {
    // 10,000 points with 90% bonus = 19,000 miles
    expect(calculateTotalMiles(10000, 90)).toBe(19000);
  });

  it('should calculate miles with 100% bonus', () => {
    expect(calculateTotalMiles(10000, 100)).toBe(20000);
  });

  it('should return base quantity when bonus is 0', () => {
    expect(calculateTotalMiles(10000, 0)).toBe(10000);
  });

  it('should add club exclusive bonus to transfer bonus', () => {
    // 10,000 points with 90% transfer + 10% club = 100% total = 20,000
    expect(calculateTotalMiles(10000, 90, 10)).toBe(20000);
  });

  it('should handle club bonus without transfer bonus', () => {
    expect(calculateTotalMiles(10000, 0, 15)).toBe(11500);
  });

  it('should round to nearest integer', () => {
    // 333 * 1.50 = 499.5 → rounds to 500
    expect(calculateTotalMiles(333, 50)).toBe(500);
  });
});

// ==================== calculateTotalCost ====================

describe('calculateTotalCost', () => {
  it('should calculate cost from purchase price and quantity', () => {
    // R$0.028/point × 10,000 = R$280
    expect(calculateTotalCost(0.028, 10000)).toBeCloseTo(280, 2);
  });

  it('should add club monthly cost', () => {
    // R$280 + R$42.90 = R$322.90
    expect(calculateTotalCost(0.028, 10000, 42.9)).toBeCloseTo(322.9, 2);
  });

  it('should handle zero purchase price', () => {
    expect(calculateTotalCost(0, 10000, 42.9)).toBeCloseTo(42.9, 2);
  });

  it('should handle no club cost', () => {
    expect(calculateTotalCost(0.028, 10000)).toBeCloseTo(280, 2);
  });

  it('should handle undefined club cost', () => {
    expect(calculateTotalCost(0.028, 10000, undefined)).toBeCloseTo(280, 2);
  });
});

// ==================== computeCostPerMilheiro ====================

describe('computeCostPerMilheiro', () => {
  it('should calculate cost per 1000 miles', () => {
    // R$280 / 19 milheiros = R$14.74/k
    expect(computeCostPerMilheiro(280, 19000)).toBeCloseTo(14.74, 1);
  });

  it('should return 0 when totalMiles is zero', () => {
    expect(computeCostPerMilheiro(280, 0)).toBe(0);
  });

  it('should return 0 when totalMiles is negative', () => {
    expect(computeCostPerMilheiro(280, -1000)).toBe(0);
  });

  it('should handle zero cost', () => {
    expect(computeCostPerMilheiro(0, 19000)).toBe(0);
  });

  it('should handle exact milheiro boundary', () => {
    // R$12 / 1 milheiro = R$12/k
    expect(computeCostPerMilheiro(12, 1000)).toBe(12);
  });
});

// ==================== rateByThreshold ====================

describe('rateByThreshold', () => {
  it('should rate below R$12 as EXCELLENT', () => {
    expect(rateByThreshold(11.99)).toBe('EXCELLENT');
    expect(rateByThreshold(8)).toBe('EXCELLENT');
    expect(rateByThreshold(0.01)).toBe('EXCELLENT');
  });

  it('should rate R$12-16 as GOOD', () => {
    expect(rateByThreshold(12)).toBe('GOOD');
    expect(rateByThreshold(14)).toBe('GOOD');
    expect(rateByThreshold(15.99)).toBe('GOOD');
  });

  it('should rate R$16-20 as ACCEPTABLE', () => {
    expect(rateByThreshold(16)).toBe('ACCEPTABLE');
    expect(rateByThreshold(18)).toBe('ACCEPTABLE');
    expect(rateByThreshold(19.99)).toBe('ACCEPTABLE');
  });

  it('should rate above R$20 as AVOID', () => {
    expect(rateByThreshold(20)).toBe('AVOID');
    expect(rateByThreshold(25)).toBe('AVOID');
    expect(rateByThreshold(100)).toBe('AVOID');
  });

  it('should rate zero as AVOID', () => {
    expect(rateByThreshold(0)).toBe('AVOID');
  });

  it('should rate negative as AVOID', () => {
    expect(rateByThreshold(-5)).toBe('AVOID');
  });
});

// ==================== calculateCostPerMilheiro (main) ====================

describe('calculateCostPerMilheiro', () => {
  it('should calculate Livelo → Smiles 90% scenario', () => {
    const result = calculateCostPerMilheiro({
      purchasePricePerPoint: 0.028,
      quantity: 10000,
      transferBonusPercent: 90,
    });

    expect(result.totalCost).toBeCloseTo(280, 2);
    expect(result.totalMiles).toBe(19000);
    expect(result.costPerMilheiro).toBeCloseTo(14.74, 1);
    expect(result.rating).toBe('GOOD');
  });

  it('should calculate Livelo → Smiles 100% scenario as EXCELLENT', () => {
    const result = calculateCostPerMilheiro({
      purchasePricePerPoint: 0.028,
      quantity: 10000,
      transferBonusPercent: 100,
    });

    expect(result.totalCost).toBeCloseTo(280, 2);
    expect(result.totalMiles).toBe(20000);
    expect(result.costPerMilheiro).toBeCloseTo(14, 2);
    expect(result.rating).toBe('GOOD');
  });

  it('should factor in club costs and bonuses', () => {
    const result = calculateCostPerMilheiro({
      purchasePricePerPoint: 0.028,
      quantity: 10000,
      transferBonusPercent: 90,
      clubMonthlyCost: 42.9,
      clubExclusiveBonusPercent: 10,
    });

    // Cost: 280 + 42.9 = 322.9
    // Miles: 10000 × (1 + 100%) = 20000
    // CPM: 322.9 / 20 = 16.145
    expect(result.totalCost).toBeCloseTo(322.9, 2);
    expect(result.totalMiles).toBe(20000);
    expect(result.costPerMilheiro).toBeCloseTo(16.145, 2);
    expect(result.rating).toBe('ACCEPTABLE');
  });

  it('should handle no bonus (direct 1:1 transfer)', () => {
    const result = calculateCostPerMilheiro({
      purchasePricePerPoint: 0.028,
      quantity: 10000,
      transferBonusPercent: 0,
    });

    expect(result.totalMiles).toBe(10000);
    expect(result.costPerMilheiro).toBeCloseTo(28, 2);
    expect(result.rating).toBe('AVOID');
  });

  it('should handle very high bonus as EXCELLENT', () => {
    const result = calculateCostPerMilheiro({
      purchasePricePerPoint: 0.028,
      quantity: 10000,
      transferBonusPercent: 200,
    });

    // 10000 × 3 = 30000 miles, R$280 / 30 = R$9.33/k
    expect(result.totalMiles).toBe(30000);
    expect(result.costPerMilheiro).toBeCloseTo(9.33, 1);
    expect(result.rating).toBe('EXCELLENT');
  });

  it('should return AVOID when quantity results in zero miles', () => {
    const result = calculateCostPerMilheiro({
      purchasePricePerPoint: 0.028,
      quantity: 1,
      transferBonusPercent: 0,
    });

    // 1 point = 1 mile, cost = 0.028
    // CPM = 0.028 / (1/1000) = 28
    expect(result.totalMiles).toBe(1);
    expect(result.rating).toBe('AVOID');
  });
});

// ==================== ratePromotion ====================

describe('ratePromotion', () => {
  it('should rate TRANSFER_BONUS with 90% bonus', () => {
    const result = ratePromotion({
      type: 'TRANSFER_BONUS',
      bonusPercent: 90,
    });

    expect(result).not.toBeNull();
    expect(result!.costPerMilheiro).toBeCloseTo(14.74, 1);
    expect(result!.rating).toBe('GOOD');
  });

  it('should rate TRANSFER_BONUS with 100% bonus', () => {
    const result = ratePromotion({
      type: 'TRANSFER_BONUS',
      bonusPercent: 100,
    });

    expect(result).not.toBeNull();
    expect(result!.costPerMilheiro).toBeCloseTo(14, 2);
    expect(result!.rating).toBe('GOOD');
  });

  it('should rate TRANSFER_BONUS with club extra bonus', () => {
    const result = ratePromotion({
      type: 'TRANSFER_BONUS',
      bonusPercent: 90,
      clubExtraBonus: 10,
    });

    expect(result).not.toBeNull();
    // 10000 × 2.0 = 20000 miles, R$280 / 20 = R$14/k
    expect(result!.costPerMilheiro).toBeCloseTo(14, 2);
    expect(result!.rating).toBe('GOOD');
  });

  it('should return null for TRANSFER_BONUS without bonusPercent', () => {
    const result = ratePromotion({
      type: 'TRANSFER_BONUS',
      bonusPercent: null,
    });

    expect(result).toBeNull();
  });

  it('should rate POINT_PURCHASE with purchasePricePerK', () => {
    const result = ratePromotion({
      type: 'POINT_PURCHASE',
      purchasePricePerK: 15,
    });

    expect(result).not.toBeNull();
    // R$15/k directly
    expect(result!.costPerMilheiro).toBeCloseTo(15, 2);
    expect(result!.rating).toBe('GOOD');
  });

  it('should rate POINT_PURCHASE with discount', () => {
    const result = ratePromotion({
      type: 'POINT_PURCHASE',
      purchaseDiscount: 0.5,
    });

    expect(result).not.toBeNull();
    // 50% discount on R$0.028/point = R$0.014/point → R$14/k
    expect(result!.costPerMilheiro).toBeCloseTo(14, 2);
    expect(result!.rating).toBe('GOOD');
  });

  it('should return null for POINT_PURCHASE without price or discount', () => {
    const result = ratePromotion({
      type: 'POINT_PURCHASE',
    });

    expect(result).toBeNull();
  });

  it('should return null for CLUB_SIGNUP type', () => {
    const result = ratePromotion({
      type: 'CLUB_SIGNUP',
      bonusPercent: 50,
    });

    expect(result).toBeNull();
  });

  it('should return null for MIXED type', () => {
    const result = ratePromotion({
      type: 'MIXED',
      bonusPercent: 80,
    });

    expect(result).toBeNull();
  });

  it('should handle TRANSFER_BONUS with very high bonus as EXCELLENT', () => {
    const result = ratePromotion({
      type: 'TRANSFER_BONUS',
      bonusPercent: 200,
    });

    expect(result).not.toBeNull();
    expect(result!.rating).toBe('EXCELLENT');
  });

  it('should handle TRANSFER_BONUS with low bonus as AVOID', () => {
    const result = ratePromotion({
      type: 'TRANSFER_BONUS',
      bonusPercent: 10,
    });

    expect(result).not.toBeNull();
    // 10000 × 1.1 = 11000 miles, R$280 / 11 = R$25.45/k
    expect(result!.costPerMilheiro).toBeCloseTo(25.45, 0);
    expect(result!.rating).toBe('AVOID');
  });

  it('should prefer purchasePricePerK over purchaseDiscount', () => {
    const result = ratePromotion({
      type: 'POINT_PURCHASE',
      purchasePricePerK: 10,
      purchaseDiscount: 0.5,
    });

    expect(result).not.toBeNull();
    expect(result!.costPerMilheiro).toBeCloseTo(10, 2);
    expect(result!.rating).toBe('EXCELLENT');
  });
});

// ==================== compareScenarios ====================

describe('compareScenarios', () => {
  const liveloSmiles90: CalculatorInput = {
    purchasePricePerPoint: 0.028,
    quantity: 10000,
    transferBonusPercent: 90,
  };

  const liveloSmiles100: CalculatorInput = {
    purchasePricePerPoint: 0.028,
    quantity: 10000,
    transferBonusPercent: 100,
  };

  const esferaSmiles80: CalculatorInput = {
    purchasePricePerPoint: 0.030,
    quantity: 10000,
    transferBonusPercent: 80,
  };

  it('should compare 2 scenarios and identify best/worst', () => {
    const result = compareScenarios([liveloSmiles90, liveloSmiles100]);

    expect(result.scenarios).toHaveLength(2);
    expect(result.bestIndex).toBe(1); // 100% bonus is cheaper per milheiro
    expect(result.worstIndex).toBe(0); // 90% bonus is more expensive
    expect(result.savingsVsWorst).toBeGreaterThan(0);
  });

  it('should compare 3 scenarios', () => {
    const result = compareScenarios([liveloSmiles90, liveloSmiles100, esferaSmiles80]);

    expect(result.scenarios).toHaveLength(3);
    // Esfera 80% is worst (R$30/k base, only 80% bonus = R$16.67/k)
    // Livelo 100% is best (R$28/k base, 100% bonus = R$14/k)
    expect(result.bestIndex).toBe(1);
    expect(result.worstIndex).toBe(2);
  });

  it('should calculate savings correctly', () => {
    const result = compareScenarios([liveloSmiles90, liveloSmiles100]);

    const best = result.scenarios[result.bestIndex];
    const worst = result.scenarios[result.worstIndex];
    const expectedSavings = (worst.costPerMilheiro - best.costPerMilheiro) * (best.totalMiles / 1000);

    expect(result.savingsVsWorst).toBeCloseTo(expectedSavings, 2);
  });

  it('should throw InsufficientScenariosError for 1 scenario', () => {
    expect(() => compareScenarios([liveloSmiles90])).toThrow(InsufficientScenariosError);
  });

  it('should throw InsufficientScenariosError for 0 scenarios', () => {
    expect(() => compareScenarios([])).toThrow(InsufficientScenariosError);
  });

  it('should throw TooManyScenariosError for 4+ scenarios', () => {
    expect(() =>
      compareScenarios([liveloSmiles90, liveloSmiles100, esferaSmiles80, liveloSmiles90]),
    ).toThrow(TooManyScenariosError);
  });

  it('should handle identical scenarios', () => {
    const result = compareScenarios([liveloSmiles90, liveloSmiles90]);

    expect(result.bestIndex).toBe(0);
    expect(result.worstIndex).toBe(0);
    expect(result.savingsVsWorst).toBe(0);
  });
});

// ==================== PRESET_SCENARIOS ====================

describe('PRESET_SCENARIOS', () => {
  it('should have at least 3 presets', () => {
    expect(PRESET_SCENARIOS.length).toBeGreaterThanOrEqual(3);
  });

  it('should produce valid calculations for all presets', () => {
    for (const preset of PRESET_SCENARIOS) {
      const result = calculateCostPerMilheiro(preset.input);

      expect(result.totalCost).toBeGreaterThan(0);
      expect(result.totalMiles).toBeGreaterThan(0);
      expect(result.costPerMilheiro).toBeGreaterThan(0);
      expect(['EXCELLENT', 'GOOD', 'ACCEPTABLE', 'AVOID']).toContain(result.rating);
    }
  });

  it('should have unique names', () => {
    const names = PRESET_SCENARIOS.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

// ==================== computeRedemptionAdvisor ====================

describe('computeRedemptionAdvisor', () => {
  it('should calculate redemption value for a flight', () => {
    const result = computeRedemptionAdvisor({
      cashPriceBRL: 3500,
      milesRequired: 35000,
      taxesBRL: 120,
      program: 'Smiles',
      userAvgCostPerMilheiro: 14,
    });

    // milesValuePerK = (3500 - 120) / 35 = 96.57
    expect(result.milesValuePerK).toBeCloseTo(96.57, 1);
    // equivalentCashCost = 14 * 35 = 490
    expect(result.equivalentCashCost).toBe(490);
    // cashSavings = 3500 - 490 - 120 = 2890
    expect(result.cashSavings).toBe(2890);
    expect(result.rating).toBe('EXCELLENT');
    expect(result.isUsingPersonalData).toBe(true);
    expect(result.userAvgCostPerMilheiro).toBe(14);
    expect(result.recommendation).toContain('Use miles');
    expect(result.recommendation).toContain('your cost history');
  });

  it('should use market average when user has no cost history', () => {
    const result = computeRedemptionAdvisor({
      cashPriceBRL: 3500,
      milesRequired: 35000,
      taxesBRL: 120,
      program: 'Smiles',
    });

    // Falls back to R$15/k market average
    expect(result.userAvgCostPerMilheiro).toBe(15);
    expect(result.isUsingPersonalData).toBe(false);
    // equivalentCashCost = 15 * 35 = 525
    expect(result.equivalentCashCost).toBe(525);
    // cashSavings = 3500 - 525 - 120 = 2855
    expect(result.cashSavings).toBe(2855);
    expect(result.recommendation).toContain('market average');
  });

  it('should recommend paying cash when miles cost more', () => {
    const result = computeRedemptionAdvisor({
      cashPriceBRL: 800,
      milesRequired: 50000,
      taxesBRL: 80,
      program: 'Smiles',
      userAvgCostPerMilheiro: 18,
    });

    // milesValuePerK = (800 - 80) / 50 = 14.4
    expect(result.milesValuePerK).toBeCloseTo(14.4, 1);
    // equivalentCashCost = 18 * 50 = 900
    expect(result.equivalentCashCost).toBe(900);
    // cashSavings = 800 - 900 - 80 = -180 (negative = pay cash)
    expect(result.cashSavings).toBe(-180);
    expect(result.recommendation).toContain('Pay cash');
  });

  it('should handle break-even scenario', () => {
    // cashSavings = cashPrice - equivalentCashCost - taxes = 0
    // cashPrice = 1000, taxes = 0, equivalentCashCost = 1000
    // equivalentCashCost = avgCost * milheiros => avgCost = 1000 / 10 = 100
    const result = computeRedemptionAdvisor({
      cashPriceBRL: 1000,
      milesRequired: 10000,
      taxesBRL: 0,
      program: 'Smiles',
      userAvgCostPerMilheiro: 100,
    });

    expect(result.cashSavings).toBe(0);
    expect(result.recommendation).toContain('Break even');
  });

  it('should rate high-value redemptions as EXCELLENT', () => {
    const result = computeRedemptionAdvisor({
      cashPriceBRL: 18000,
      milesRequired: 90000,
      taxesBRL: 850,
      program: 'Smiles',
      userAvgCostPerMilheiro: 14,
    });

    // milesValuePerK = (18000 - 850) / 90 = 190.56
    expect(result.milesValuePerK).toBeCloseTo(190.56, 1);
    expect(result.rating).toBe('EXCELLENT');
  });

  it('should rate low-value redemptions as AVOID', () => {
    const result = computeRedemptionAdvisor({
      cashPriceBRL: 500,
      milesRequired: 50000,
      taxesBRL: 100,
      program: 'Azul Fidelidade',
      userAvgCostPerMilheiro: 14,
    });

    // milesValuePerK = (500 - 100) / 50 = 8
    expect(result.milesValuePerK).toBeCloseTo(8, 0);
    expect(result.rating).toBe('AVOID');
  });

  it('should rate R$30-60/k as GOOD', () => {
    const result = computeRedemptionAdvisor({
      cashPriceBRL: 2000,
      milesRequired: 50000,
      taxesBRL: 0,
      program: 'Smiles',
      userAvgCostPerMilheiro: 14,
    });

    // milesValuePerK = 2000 / 50 = 40
    expect(result.milesValuePerK).toBe(40);
    expect(result.rating).toBe('GOOD');
  });

  it('should rate R$15-30/k as ACCEPTABLE', () => {
    const result = computeRedemptionAdvisor({
      cashPriceBRL: 1000,
      milesRequired: 50000,
      taxesBRL: 0,
      program: 'Smiles',
      userAvgCostPerMilheiro: 14,
    });

    // milesValuePerK = 1000 / 50 = 20
    expect(result.milesValuePerK).toBe(20);
    expect(result.rating).toBe('ACCEPTABLE');
  });

  it('should handle zero miles as AVOID with zero value', () => {
    const result = computeRedemptionAdvisor({
      cashPriceBRL: 3500,
      milesRequired: 1,
      taxesBRL: 0,
      program: 'Smiles',
      userAvgCostPerMilheiro: 14,
    });

    // milesRequired=1, milheiros=0.001, milesValuePerK = 3500 / 0.001 = 3,500,000
    expect(result.milesValuePerK).toBeGreaterThan(0);
    expect(result.rating).toBe('EXCELLENT');
  });

  it('should round output values to 2 decimal places', () => {
    const result = computeRedemptionAdvisor({
      cashPriceBRL: 1234,
      milesRequired: 33333,
      taxesBRL: 56.78,
      program: 'Latam Pass',
      userAvgCostPerMilheiro: 13.37,
    });

    // Verify rounding — all values should have at most 2 decimal places
    const decimalPlaces = (n: number) => {
      const str = n.toString();
      const idx = str.indexOf('.');
      return idx === -1 ? 0 : str.length - idx - 1;
    };

    expect(decimalPlaces(result.milesValuePerK)).toBeLessThanOrEqual(2);
    expect(decimalPlaces(result.equivalentCashCost)).toBeLessThanOrEqual(2);
    expect(decimalPlaces(result.cashSavings)).toBeLessThanOrEqual(2);
    expect(decimalPlaces(result.userAvgCostPerMilheiro)).toBeLessThanOrEqual(2);
  });
});
