'use server';

import { logger } from '@/lib/logger';
import {
  calculatorInputSchema,
  compareInputSchema,
  type CalculatorInput,
  type CompareInput,
} from '@/lib/validators/cost-calculator.schema';
import {
  calculateCostPerMilheiro,
  compareScenarios,
  InsufficientScenariosError,
  TooManyScenariosError,
  type CostCalculation,
  type ScenarioComparison,
} from '@/lib/services/cost-calculator.service';

interface CalculateResult {
  success: boolean;
  data?: CostCalculation;
  error?: string;
}

interface CompareResult {
  success: boolean;
  data?: ScenarioComparison;
  error?: string;
}

export async function calculateCostPerMilheiroAction(input: CalculatorInput): Promise<CalculateResult> {
  const parsed = calculatorInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const result = calculateCostPerMilheiro(parsed.data);
    return { success: true, data: result };
  } catch (error) {
    logger.error({ err: error }, 'Failed to calculate cost per milheiro');
    return { success: false, error: 'Calculation failed. Please try again.' };
  }
}

export async function compareScenariosAction(input: CompareInput): Promise<CompareResult> {
  const parsed = compareInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input. Provide 2-3 scenarios.' };
  }

  try {
    const result = compareScenarios(parsed.data.scenarios);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof InsufficientScenariosError) {
      return { success: false, error: 'At least 2 scenarios are required for comparison.' };
    }
    if (error instanceof TooManyScenariosError) {
      return { success: false, error: 'At most 3 scenarios are allowed.' };
    }
    logger.error({ err: error }, 'Failed to compare scenarios');
    return { success: false, error: 'Comparison failed. Please try again.' };
  }
}
