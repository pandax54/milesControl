import { logger } from '@/lib/logger';
import type { PromotionRating, RedemptionAdvisorInput } from '@/lib/validators/cost-calculator.schema';

// ==================== Constants ====================

const POINTS_PER_MILHEIRO = 1000;
const DEFAULT_AVG_COST_PER_MILHEIRO = 15; // R$15/k — market average fallback

// Redemption value thresholds (R$ per 1,000 miles) — higher = better redemption
const REDEMPTION_THRESHOLD_EXCELLENT = 60;
const REDEMPTION_THRESHOLD_GOOD = 30;
const REDEMPTION_THRESHOLD_ACCEPTABLE = 15;

// Tolerance for floating-point break-even comparison
const BREAK_EVEN_TOLERANCE = 0.01;

// ==================== Types ====================

export interface RedemptionAdvisorResult {
  readonly milesValuePerK: number;
  readonly equivalentCashCost: number;
  readonly cashSavings: number;
  readonly rating: PromotionRating;
  readonly recommendation: string;
  readonly userAvgCostPerMilheiro: number;
  readonly isUsingPersonalData: boolean;
}

// ==================== Main calculation ====================

/**
 * Calculate redemption value for a flight and recommend miles vs. cash.
 *
 * PRD F3.6: "This flight costs R$1,200 cash or 15,000 Smiles miles.
 * Your average cost-per-milheiro is R$14. So using miles costs you
 * the equivalent of R$210 (15k × R$14/k) vs R$1,200 cash."
 *
 * PRD F3.7: Uses user's personal cost history, not generic averages.
 */
export function computeRedemptionAdvisor(input: RedemptionAdvisorInput): RedemptionAdvisorResult {
  const { cashPriceBRL, milesRequired, taxesBRL } = input;

  // Miles value = how much each 1,000 miles is "worth" in this redemption
  const milheirosUsed = milesRequired / POINTS_PER_MILHEIRO;
  const netCashValue = cashPriceBRL - taxesBRL;
  const milesValuePerK = milheirosUsed > 0 ? netCashValue / milheirosUsed : 0;

  // User's actual cost basis
  const avgCost = input.userAvgCostPerMilheiro ?? DEFAULT_AVG_COST_PER_MILHEIRO;
  const isUsingPersonalData = input.userAvgCostPerMilheiro != null;

  // What the user "paid" for these miles based on their history
  const equivalentCashCost = avgCost * milheirosUsed;

  // How much the user saves by using miles instead of cash
  const cashSavings = cashPriceBRL - equivalentCashCost - taxesBRL;

  // Rate the redemption value based on how much each 1k miles is "worth"
  const rating = rateRedemptionValue(milesValuePerK);

  const recommendation = buildRecommendation(cashSavings, milesValuePerK, avgCost, isUsingPersonalData);

  logger.debug(
    { milesValuePerK, equivalentCashCost, cashSavings, rating, program: input.program },
    'Redemption advisor calculation completed',
  );

  return {
    milesValuePerK: Math.round(milesValuePerK * 100) / 100,
    equivalentCashCost: Math.round(equivalentCashCost * 100) / 100,
    cashSavings: Math.round(cashSavings * 100) / 100,
    rating,
    recommendation,
    userAvgCostPerMilheiro: Math.round(avgCost * 100) / 100,
    isUsingPersonalData,
  };
}

// ==================== Internal helpers ====================

/**
 * Rate how valuable a miles redemption is.
 * Higher milesValuePerK = better redemption (miles are "worth" more).
 * Thresholds mirror acquisition ratings but inverted:
 *  - EXCELLENT: > R$60/k (each 1k miles saves you R$60+)
 *  - GOOD: R$30-60/k
 *  - ACCEPTABLE: R$15-30/k
 *  - AVOID: < R$15/k (you'd be better off paying cash)
 */
function rateRedemptionValue(milesValuePerK: number): PromotionRating {
  if (milesValuePerK <= 0) return 'AVOID';
  if (milesValuePerK >= REDEMPTION_THRESHOLD_EXCELLENT) return 'EXCELLENT';
  if (milesValuePerK >= REDEMPTION_THRESHOLD_GOOD) return 'GOOD';
  if (milesValuePerK >= REDEMPTION_THRESHOLD_ACCEPTABLE) return 'ACCEPTABLE';
  return 'AVOID';
}

function buildRecommendation(
  cashSavings: number,
  milesValuePerK: number,
  avgCost: number,
  isUsingPersonalData: boolean,
): string {
  const costBasis = isUsingPersonalData ? 'your cost history' : 'market average';
  const formattedSavings = `R$${Math.abs(cashSavings).toFixed(2)}`;
  const formattedValue = `R$${milesValuePerK.toFixed(2)}/k`;

  if (cashSavings > BREAK_EVEN_TOLERANCE) {
    return `Use miles — you save ${formattedSavings} based on ${costBasis} (R$${avgCost.toFixed(2)}/k). Redemption value: ${formattedValue}.`;
  }

  if (Math.abs(cashSavings) <= BREAK_EVEN_TOLERANCE) {
    return `Break even — miles vs. cash costs the same based on ${costBasis} (R$${avgCost.toFixed(2)}/k). Redemption value: ${formattedValue}.`;
  }

  return `Pay cash — using miles costs ${formattedSavings} more based on ${costBasis} (R$${avgCost.toFixed(2)}/k). Redemption value: ${formattedValue}.`;
}
