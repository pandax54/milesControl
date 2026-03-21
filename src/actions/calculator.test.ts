import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/services/cost-calculator.service', () => ({
  calculateCostPerMilheiro: vi.fn(),
  compareScenarios: vi.fn(),
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

import {
  calculateCostPerMilheiro,
  compareScenarios,
  InsufficientScenariosError,
  TooManyScenariosError,
} from '@/lib/services/cost-calculator.service';
import { calculateCostPerMilheiroAction, compareScenariosAction } from './calculator';
import type { CostCalculation, ScenarioComparison } from '@/lib/services/cost-calculator.service';
import type { CalculatorInput } from '@/lib/validators/cost-calculator.schema';

const mockCalculate = vi.mocked(calculateCostPerMilheiro);
const mockCompare = vi.mocked(compareScenarios);

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
