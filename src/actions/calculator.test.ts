import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/services/cost-calculator.service', () => ({
  calculateCostPerMilheiro: vi.fn(),
  compareScenarios: vi.fn(),
  computeRedemptionAdvisor: vi.fn(),
  InsufficientScenariosError: class extends Error {
    constructor(count: number) {
      super(`At least 2 scenarios are required for comparison, received ${count}`);
      this.name = 'InsufficientScenariosError';
    }
  },
  TooManyScenariosError: class extends Error {
    constructor(count: number) {
      super(`At most 3 scenarios are allowed for comparison, received ${count}`);
      this.name = 'TooManyScenariosError';
    }
  },
}));

vi.mock('@/lib/services/transfer.service', () => ({
  getUserAverageCostPerMilheiro: vi.fn(),
}));

vi.mock('@/lib/services/freemium.service', () => ({
  assertPremiumFeatureAccess: vi.fn(),
  PremiumFeatureRequiredError: class extends Error {
    constructor(feature: string) {
      super(`${feature} premium`);
      this.name = 'PremiumFeatureRequiredError';
    }
  },
}));

import {
  calculateCostPerMilheiro,
  compareScenarios,
  computeRedemptionAdvisor,
  InsufficientScenariosError,
  TooManyScenariosError,
} from '@/lib/services/cost-calculator.service';
import { getUserAverageCostPerMilheiro } from '@/lib/services/transfer.service';
import { auth } from '@/lib/auth';
import {
  assertPremiumFeatureAccess,
  PremiumFeatureRequiredError,
} from '@/lib/services/freemium.service';
import { calculateCostPerMilheiroAction, compareScenariosAction, computeRedemptionAdvisorAction } from './calculator';
import type { CostCalculation, ScenarioComparison, RedemptionAdvisorResult } from '@/lib/services/cost-calculator.service';
import type { CalculatorInput } from '@/lib/validators/cost-calculator.schema';

const mockCalculate = vi.mocked(calculateCostPerMilheiro);
const mockCompare = vi.mocked(compareScenarios);
const mockRedemption = vi.mocked(computeRedemptionAdvisor);
const mockGetUserAvgCost = vi.mocked(getUserAverageCostPerMilheiro);
const mockAuth = vi.mocked(auth);
const mockAssertPremiumFeatureAccess = vi.mocked(assertPremiumFeatureAccess);

function buildCalculation(overrides?: Partial<CostCalculation>): CostCalculation {
  return {
    totalCost: 280,
    totalMiles: 19000,
    costPerMilheiro: 14.74,
    rating: 'GOOD',
    ...overrides,
  };
}

function buildInput(overrides?: Partial<CalculatorInput>): CalculatorInput {
  return {
    purchasePricePerPoint: 0.028,
    quantity: 10000,
    transferBonusPercent: 90,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAssertPremiumFeatureAccess.mockResolvedValue(undefined);
});

describe('calculateCostPerMilheiroAction', () => {
  it('should return calculation result for valid input', async () => {
    const calculation = buildCalculation();
    mockCalculate.mockReturnValue(calculation);

    const result = await calculateCostPerMilheiroAction(buildInput());

    expect(result.success).toBe(true);
    expect(result.data).toEqual(calculation);
    expect(mockCalculate).toHaveBeenCalledOnce();
  });

  it('should return error for invalid input', async () => {
    const result = await calculateCostPerMilheiroAction({
      purchasePricePerPoint: -1,
      quantity: 10000,
      transferBonusPercent: 90,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
    expect(mockCalculate).not.toHaveBeenCalled();
  });

  it('should return error for non-integer quantity', async () => {
    const result = await calculateCostPerMilheiroAction({
      purchasePricePerPoint: 0.028,
      quantity: 10.5,
      transferBonusPercent: 90,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
  });

  it('should handle service error', async () => {
    mockCalculate.mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    const result = await calculateCostPerMilheiroAction(buildInput());

    expect(result.success).toBe(false);
    expect(result.error).toBe('Calculation failed. Please try again.');
  });

  it('should accept input with club fields', async () => {
    const calculation = buildCalculation({ costPerMilheiro: 16.1, rating: 'ACCEPTABLE' });
    mockCalculate.mockReturnValue(calculation);

    const result = await calculateCostPerMilheiroAction(buildInput({
      clubMonthlyCost: 42.9,
      clubExclusiveBonusPercent: 10,
    }));

    expect(result.success).toBe(true);
    expect(result.data).toEqual(calculation);
  });

  it('should apply default transferBonusPercent of 0', async () => {
    const calculation = buildCalculation();
    mockCalculate.mockReturnValue(calculation);

    const result = await calculateCostPerMilheiroAction({
      purchasePricePerPoint: 0.028,
      quantity: 10000,
    } as CalculatorInput);

    expect(result.success).toBe(true);
  });
});

describe('compareScenariosAction', () => {
  it('should return comparison result for 2 valid scenarios', async () => {
    const comparison: ScenarioComparison = {
      scenarios: [buildCalculation(), buildCalculation({ costPerMilheiro: 12, rating: 'GOOD' })],
      bestIndex: 1,
      worstIndex: 0,
      savingsVsWorst: 52.06,
    };
    mockCompare.mockReturnValue(comparison);

    const result = await compareScenariosAction({
      scenarios: [buildInput(), buildInput({ transferBonusPercent: 100 })],
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(comparison);
    expect(mockCompare).toHaveBeenCalledOnce();
  });

  it('should return comparison result for 3 valid scenarios', async () => {
    const comparison: ScenarioComparison = {
      scenarios: [buildCalculation(), buildCalculation(), buildCalculation()],
      bestIndex: 0,
      worstIndex: 2,
      savingsVsWorst: 10,
    };
    mockCompare.mockReturnValue(comparison);

    const result = await compareScenariosAction({
      scenarios: [buildInput(), buildInput(), buildInput()],
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(comparison);
  });

  it('should return error for fewer than 2 scenarios', async () => {
    const result = await compareScenariosAction({
      scenarios: [buildInput()],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input. Provide 2-3 scenarios.');
    expect(mockCompare).not.toHaveBeenCalled();
  });

  it('should return error for more than 3 scenarios', async () => {
    const result = await compareScenariosAction({
      scenarios: [buildInput(), buildInput(), buildInput(), buildInput()],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input. Provide 2-3 scenarios.');
    expect(mockCompare).not.toHaveBeenCalled();
  });

  it('should handle InsufficientScenariosError from service', async () => {
    mockCompare.mockImplementation(() => {
      throw new InsufficientScenariosError(1);
    });

    const result = await compareScenariosAction({
      scenarios: [buildInput(), buildInput()],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('At least 2 scenarios are required for comparison.');
  });

  it('should handle TooManyScenariosError from service', async () => {
    mockCompare.mockImplementation(() => {
      throw new TooManyScenariosError(4);
    });

    const result = await compareScenariosAction({
      scenarios: [buildInput(), buildInput()],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('At most 3 scenarios are allowed.');
  });

  it('should handle unexpected service error', async () => {
    mockCompare.mockImplementation(() => {
      throw new Error('Unexpected');
    });

    const result = await compareScenariosAction({
      scenarios: [buildInput(), buildInput()],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Comparison failed. Please try again.');
  });

  it('should return error for invalid scenario within input', async () => {
    const result = await compareScenariosAction({
      scenarios: [
        buildInput(),
        { purchasePricePerPoint: -5, quantity: 10000, transferBonusPercent: 0 },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input. Provide 2-3 scenarios.');
  });
});

// ==================== computeRedemptionAdvisorAction ====================

function buildRedemptionResult(overrides?: Partial<RedemptionAdvisorResult>): RedemptionAdvisorResult {
  return {
    milesValuePerK: 96.57,
    equivalentCashCost: 490,
    cashSavings: 2890,
    rating: 'EXCELLENT',
    recommendation: 'Use miles — you save R$2890.00 based on your cost history (R$14.00/k). Redemption value: R$96.57/k.',
    userAvgCostPerMilheiro: 14,
    isUsingPersonalData: true,
    ...overrides,
  };
}

describe('computeRedemptionAdvisorAction', () => {
  it('should return redemption result for valid input with user cost override', async () => {
    const redemptionResult = buildRedemptionResult();
    mockRedemption.mockReturnValue(redemptionResult);
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as unknown as Awaited<ReturnType<typeof auth>>);

    const result = await computeRedemptionAdvisorAction({
      cashPriceBRL: 3500,
      milesRequired: 35000,
      taxesBRL: 120,
      program: 'Smiles',
      userAvgCostPerMilheiro: 14,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(redemptionResult);
    expect(mockAssertPremiumFeatureAccess).toHaveBeenCalledWith('user-1', 'milesValueAdvisor');
    expect(mockRedemption).toHaveBeenCalledWith({
      cashPriceBRL: 3500,
      milesRequired: 35000,
      taxesBRL: 120,
      program: 'Smiles',
      userAvgCostPerMilheiro: 14,
    });
    // Should NOT fetch from transfer history when user provides manual override
    expect(mockGetUserAvgCost).not.toHaveBeenCalled();
  });

  it('should fetch user avg cost from transfer history when not provided', async () => {
    const redemptionResult = buildRedemptionResult();
    mockRedemption.mockReturnValue(redemptionResult);
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as unknown as Awaited<ReturnType<typeof auth>>);
    mockGetUserAvgCost.mockResolvedValue(13.5);

    const result = await computeRedemptionAdvisorAction({
      cashPriceBRL: 3500,
      milesRequired: 35000,
      taxesBRL: 120,
      program: 'Smiles',
    });

    expect(result.success).toBe(true);
    expect(mockGetUserAvgCost).toHaveBeenCalledWith('user-1', 'Smiles');
    expect(mockRedemption).toHaveBeenCalledWith(
      expect.objectContaining({ userAvgCostPerMilheiro: 13.5 }),
    );
  });

  it('should use undefined avg cost when user has no history', async () => {
    const redemptionResult = buildRedemptionResult({ isUsingPersonalData: false });
    mockRedemption.mockReturnValue(redemptionResult);
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as unknown as Awaited<ReturnType<typeof auth>>);
    mockGetUserAvgCost.mockResolvedValue(null);

    const result = await computeRedemptionAdvisorAction({
      cashPriceBRL: 3500,
      milesRequired: 35000,
      taxesBRL: 120,
      program: 'Smiles',
    });

    expect(result.success).toBe(true);
    expect(mockRedemption).toHaveBeenCalledWith(
      expect.objectContaining({ userAvgCostPerMilheiro: undefined }),
    );
  });

  it('should skip transfer history fetch when user is not authenticated', async () => {
    const redemptionResult = buildRedemptionResult({ isUsingPersonalData: false });
    mockRedemption.mockReturnValue(redemptionResult);
    mockAuth.mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);

    const result = await computeRedemptionAdvisorAction({
      cashPriceBRL: 3500,
      milesRequired: 35000,
      taxesBRL: 120,
      program: 'Smiles',
    });

    expect(result.success).toBe(true);
    expect(mockGetUserAvgCost).not.toHaveBeenCalled();
    expect(mockRedemption).toHaveBeenCalledWith(
      expect.objectContaining({ userAvgCostPerMilheiro: undefined }),
    );
  });

  it('should return error for invalid input', async () => {
    const result = await computeRedemptionAdvisorAction({
      cashPriceBRL: -100,
      milesRequired: 35000,
      taxesBRL: 120,
      program: 'Smiles',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
    expect(mockRedemption).not.toHaveBeenCalled();
  });

  it('should return error for empty program', async () => {
    const result = await computeRedemptionAdvisorAction({
      cashPriceBRL: 3500,
      milesRequired: 35000,
      taxesBRL: 120,
      program: '',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
  });

  it('should return error when service throws', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as unknown as Awaited<ReturnType<typeof auth>>);
    mockRedemption.mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    const result = await computeRedemptionAdvisorAction({
      cashPriceBRL: 3500,
      milesRequired: 35000,
      taxesBRL: 120,
      program: 'Smiles',
      userAvgCostPerMilheiro: 14,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Redemption calculation failed. Please try again.');
  });

  it('should return a premium error for free users', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as unknown as Awaited<ReturnType<typeof auth>>);
    mockAssertPremiumFeatureAccess.mockRejectedValue(
      new PremiumFeatureRequiredError('milesValueAdvisor'),
    );

    const result = await computeRedemptionAdvisorAction({
      cashPriceBRL: 3500,
      milesRequired: 35000,
      taxesBRL: 120,
      program: 'Smiles',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('milesValueAdvisor premium');
    expect(mockRedemption).not.toHaveBeenCalled();
  });

  it('should default taxesBRL to 0 when not provided', async () => {
    const redemptionResult = buildRedemptionResult();
    mockRedemption.mockReturnValue(redemptionResult);
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as unknown as Awaited<ReturnType<typeof auth>>);

    await computeRedemptionAdvisorAction({
      cashPriceBRL: 3500,
      milesRequired: 35000,
      program: 'Smiles',
      userAvgCostPerMilheiro: 14,
    } as Parameters<typeof computeRedemptionAdvisorAction>[0]);

    expect(mockRedemption).toHaveBeenCalledWith(
      expect.objectContaining({ taxesBRL: 0 }),
    );
  });
});
