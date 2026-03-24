'use server';

import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import {
  calculatorInputSchema,
  compareInputSchema,
  redemptionAdvisorInputSchema,
  type CalculatorInput,
  type CompareInput,
  type RedemptionAdvisorInput,
} from '@/lib/validators/cost-calculator.schema';
import {
  calculateCostPerMilheiro,
  compareScenarios,
  computeRedemptionAdvisor,
  InsufficientScenariosError,
  TooManyScenariosError,
  type CostCalculation,
  type RedemptionAdvisorResult,
  type ScenarioComparison,
} from '@/lib/services/cost-calculator.service';
import { getUserAverageCostPerMilheiro } from '@/lib/services/transfer.service';

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

interface RedemptionResult {
  success: boolean;
  data?: RedemptionAdvisorResult;
  error?: string;
}

/**
 * Server action for the Miles Value Advisor (Redemption Advisor).
 * Fetches user's actual average cost-per-milheiro from transfer history,
 * then calculates redemption value for a flight.
 *
 * PRD F3.6-F3.7: Uses user's personal cost history, not generic averages.
 */
export async function computeRedemptionAdvisorAction(
  input: RedemptionAdvisorInput,
): Promise<RedemptionResult> {
  const parsed = redemptionAdvisorInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const session = await auth();
    let userAvgCost = parsed.data.userAvgCostPerMilheiro;

    // If user is authenticated and didn't provide a manual override, fetch from history
    if (userAvgCost == null && session?.user?.id) {
      userAvgCost = (await getUserAverageCostPerMilheiro(session.user.id, parsed.data.program)) ?? undefined;
    }

    const result = computeRedemptionAdvisor({
      ...parsed.data,
      userAvgCostPerMilheiro: userAvgCost,
    });

    return { success: true, data: result };
  } catch (error) {
    logger.error({ err: error }, 'Failed to compute redemption advisor');
    return { success: false, error: 'Redemption calculation failed. Please try again.' };
  }
}
