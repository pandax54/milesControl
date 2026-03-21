import type { PromoType } from '@/generated/prisma/client';
import { logger } from '@/lib/logger';
import type { CalculatorInput, PromotionRating } from '@/lib/validators/cost-calculator.schema';

// ==================== Constants ====================

const RATING_THRESHOLD_EXCELLENT = 12;
const RATING_THRESHOLD_GOOD = 16;
const RATING_THRESHOLD_ACCEPTABLE = 20;
const POINTS_PER_MILHEIRO = 1000;
const STANDARD_PRICE_PER_POINT = 0.028; // R$28/k — standard Livelo baseline
const STANDARD_QUANTITY = 10000;

// ==================== Types ====================

export interface CostCalculation {
  readonly totalCost: number;
  readonly totalMiles: number;
  readonly costPerMilheiro: number;
  readonly rating: PromotionRating;
}

export interface ScenarioComparison {
  readonly scenarios: readonly CostCalculation[];
  readonly bestIndex: number;
  readonly worstIndex: number;
  readonly savingsVsWorst: number;
}

// ==================== Preset scenarios ====================

export interface PresetScenario {
  readonly name: string;
  readonly description: string;
  readonly input: CalculatorInput;
}

export const PRESET_SCENARIOS: readonly PresetScenario[] = [
  {
    name: 'Livelo → Smiles 90%',
    description: 'Buy Livelo at R$28/k, transfer to Smiles with 90% bonus',
    input: {
      purchasePricePerPoint: 0.028,
      quantity: 10000,
      transferBonusPercent: 90,
    },
  },
  {
    name: 'Livelo → Smiles 100%',
    description: 'Buy Livelo at R$28/k, transfer to Smiles with 100% bonus',
    input: {
      purchasePricePerPoint: 0.028,
      quantity: 10000,
      transferBonusPercent: 100,
    },
  },
  {
    name: 'Esfera → Smiles 80%',
    description: 'Buy Esfera at R$30/k, transfer to Smiles with 80% bonus',
    input: {
      purchasePricePerPoint: 0.030,
      quantity: 10000,
      transferBonusPercent: 80,
    },
  },
  {
    name: 'Livelo → Azul 70%',
    description: 'Buy Livelo at R$28/k, transfer to Azul with 70% bonus',
    input: {
      purchasePricePerPoint: 0.028,
      quantity: 10000,
      transferBonusPercent: 70,
    },
  },
  {
    name: 'Clube Smiles 2.000 + Livelo 90%',
    description: 'Club member buying Livelo at R$28/k with 90% + 10% club extra bonus',
    input: {
      purchasePricePerPoint: 0.028,
      quantity: 10000,
      transferBonusPercent: 90,
      clubMonthlyCost: 42.9,
      clubExclusiveBonusPercent: 10,
    },
  },
] as const;

// ==================== Pure calculation functions ====================

/**
 * Calculate the total number of miles received after applying transfer and club bonuses.
 * Transfer bonus: 90% on 10,000 points = 19,000 miles.
 * Club bonus: additional 10% on base points = 1,000 extra miles.
 * Both bonuses stack additively on the base quantity.
 */
export function calculateTotalMiles(
  quantity: number,
  transferBonusPercent: number,
  clubExclusiveBonusPercent?: number,
): number {
  const totalBonusPercent = transferBonusPercent + (clubExclusiveBonusPercent ?? 0);
  return Math.round(quantity * (1 + totalBonusPercent / 100));
}

/**
 * Calculate the total acquisition cost including point purchase and optional club membership.
 */
export function calculateTotalCost(
  purchasePricePerPoint: number,
  quantity: number,
  clubMonthlyCost?: number,
): number {
  const purchaseCost = purchasePricePerPoint * quantity;
  const clubCost = clubMonthlyCost ?? 0;
  return purchaseCost + clubCost;
}

/**
 * Calculate cost per milheiro (R$ per 1,000 miles).
 * Returns 0 if totalMiles is zero or negative to avoid division errors.
 */
export function computeCostPerMilheiro(totalCost: number, totalMiles: number): number {
  if (totalMiles <= 0) return 0;
  return totalCost / (totalMiles / POINTS_PER_MILHEIRO);
}

/**
 * Rate a cost-per-milheiro value according to market thresholds.
 * - EXCELLENT: < R$12/k (exclusive)
 * - GOOD: >= R$12/k and < R$16/k
 * - ACCEPTABLE: >= R$16/k and < R$20/k
 * - AVOID: <= 0 or >= R$20/k
 */
export function rateByThreshold(costPerMilheiro: number): PromotionRating {
  if (costPerMilheiro <= 0) return 'AVOID';
  if (costPerMilheiro < RATING_THRESHOLD_EXCELLENT) return 'EXCELLENT';
  if (costPerMilheiro < RATING_THRESHOLD_GOOD) return 'GOOD';
  if (costPerMilheiro < RATING_THRESHOLD_ACCEPTABLE) return 'ACCEPTABLE';
  return 'AVOID';
}

// ==================== Main calculator function ====================

/**
 * Calculate cost per milheiro for a given acquisition scenario.
 * Combines purchase cost, transfer bonus, and optional club costs/bonuses.
 *
 * PRD F3.1: Input: source program, purchase price per point, quantity,
 * destination program, transfer bonus %, club membership cost, club-exclusive bonus %
 * PRD F3.2: Output: total cost, total miles received, cost-per-milheiro, rating
 */
export function calculateCostPerMilheiro(input: CalculatorInput): CostCalculation {
  const totalMiles = calculateTotalMiles(
    input.quantity,
    input.transferBonusPercent,
    input.clubExclusiveBonusPercent,
  );

  const totalCost = calculateTotalCost(
    input.purchasePricePerPoint,
    input.quantity,
    input.clubMonthlyCost,
  );

  const costPerMilheiro = computeCostPerMilheiro(totalCost, totalMiles);
  const rating = rateByThreshold(costPerMilheiro);

  return { totalCost, totalMiles, costPerMilheiro, rating };
}

// ==================== Promotion rating ====================

/**
 * Rate a promotion based on its characteristics.
 * For TRANSFER_BONUS: calculates effective cost assuming standard point purchase prices.
 * For POINT_PURCHASE: uses the purchase price directly.
 * Returns null if the promotion lacks enough data to calculate.
 */
export function ratePromotion(promotion: {
  type: PromoType;
  bonusPercent?: number | null;
  purchasePricePerK?: number | null;
  purchaseDiscount?: number | null;
  requiresClub?: boolean;
  clubExtraBonus?: number | null;
}): CostCalculation | null {
  if (promotion.type === 'TRANSFER_BONUS') {
    return rateTransferBonus(promotion);
  }

  if (promotion.type === 'POINT_PURCHASE') {
    return ratePointPurchase(promotion);
  }

  // CLUB_SIGNUP and MIXED cannot be rated automatically without more data
  logger.debug({ type: promotion.type }, 'Promotion type not ratable without additional input');
  return null;
}

function rateTransferBonus(promotion: {
  bonusPercent?: number | null;
  clubExtraBonus?: number | null;
}): CostCalculation | null {
  if (promotion.bonusPercent == null) return null;

  return calculateCostPerMilheiro({
    purchasePricePerPoint: STANDARD_PRICE_PER_POINT,
    quantity: STANDARD_QUANTITY,
    transferBonusPercent: promotion.bonusPercent,
    clubExclusiveBonusPercent: promotion.clubExtraBonus ?? undefined,
  });
}

function ratePointPurchase(promotion: {
  purchasePricePerK?: number | null;
  purchaseDiscount?: number | null;
}): CostCalculation | null {
  if (promotion.purchasePricePerK != null) {
    const pricePerPoint = Number(promotion.purchasePricePerK) / POINTS_PER_MILHEIRO;
    return calculateCostPerMilheiro({
      purchasePricePerPoint: pricePerPoint,
      quantity: POINTS_PER_MILHEIRO,
      transferBonusPercent: 0,
    });
  }

  if (promotion.purchaseDiscount != null) {
    const discountedPrice = STANDARD_PRICE_PER_POINT * (1 - promotion.purchaseDiscount);
    return calculateCostPerMilheiro({
      purchasePricePerPoint: discountedPrice,
      quantity: POINTS_PER_MILHEIRO,
      transferBonusPercent: 0,
    });
  }

  return null;
}

// ==================== Scenario comparison ====================

/**
 * Compare up to 3 acquisition scenarios side-by-side.
 * Returns all calculations plus best/worst indices and potential savings.
 *
 * PRD F3.4: Side-by-side comparison of up to 3 scenarios.
 */
export function compareScenarios(scenarios: readonly CalculatorInput[]): ScenarioComparison {
  if (scenarios.length < 2) {
    throw new InsufficientScenariosError(scenarios.length);
  }
  if (scenarios.length > 3) {
    throw new TooManyScenariosError(scenarios.length);
  }

  const calculations = scenarios.map(calculateCostPerMilheiro);

  let bestIndex = 0;
  let worstIndex = 0;

  for (let i = 1; i < calculations.length; i++) {
    if (calculations[i].costPerMilheiro < calculations[bestIndex].costPerMilheiro) {
      bestIndex = i;
    }
    if (calculations[i].costPerMilheiro > calculations[worstIndex].costPerMilheiro) {
      worstIndex = i;
    }
  }

  // Savings = how much cheaper the best is vs the worst per milheiro, scaled to the best scenario's miles
  const savingsPerMilheiro = calculations[worstIndex].costPerMilheiro - calculations[bestIndex].costPerMilheiro;
  const bestMilheiros = calculations[bestIndex].totalMiles / POINTS_PER_MILHEIRO;
  const savingsVsWorst = savingsPerMilheiro * bestMilheiros;

  logger.debug(
    { bestIndex, worstIndex, savingsVsWorst, scenarioCount: scenarios.length },
    'Scenario comparison completed',
  );

  return {
    scenarios: calculations,
    bestIndex,
    worstIndex,
    savingsVsWorst: Math.round(savingsVsWorst * 100) / 100,
  };
}

// ==================== Error classes ====================

export class InsufficientScenariosError extends Error {
  constructor(count: number) {
    super(`At least 2 scenarios are required for comparison, received ${count}`);
    this.name = 'InsufficientScenariosError';
  }
}

export class TooManyScenariosError extends Error {
  constructor(count: number) {
    super(`At most 3 scenarios are allowed for comparison, received ${count}`);
    this.name = 'TooManyScenariosError';
  }
}
