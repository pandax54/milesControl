import { computeRedemptionAdvisor } from './cost-calculator.service';
import type { AwardFlight, CashFlight } from './flight-search.service';
import type { PromotionRating } from '@/lib/validators/cost-calculator.schema';

// ==================== Types ====================

/**
 * Pre-computed miles value for a single award flight compared to the best cash price.
 * Serializable — safe to return from Server Actions.
 */
export interface FlightMilesValue {
  readonly milesValuePerK: number;
  readonly rating: PromotionRating;
  readonly cashSavings: number;
  readonly equivalentCashCost: number;
  readonly recommendation: string;
  readonly isUsingPersonalData: boolean;
  readonly cashPriceBRL: number;
}

// ==================== Functions ====================

/**
 * Find the lowest cash price across a list of cash flights.
 * Returns undefined when no cash flights are available.
 */
export function findLowestCashPrice(cashFlights: readonly CashFlight[]): number | undefined {
  if (cashFlights.length === 0) return undefined;
  return Math.min(...cashFlights.map((f) => f.price));
}

/**
 * Compute miles value comparison for a single award flight vs a reference cash price.
 *
 * PRD F4.4: miles value = (cash_price - taxes) / (miles_required / 1000)
 * PRD F3.6: Uses user's personal cost history, not generic averages.
 */
export function computeFlightMilesValue(
  awardFlight: AwardFlight,
  cashPriceBRL: number,
  userAvgCostPerMilheiro?: number,
): FlightMilesValue {
  const result = computeRedemptionAdvisor({
    cashPriceBRL,
    milesRequired: awardFlight.milesRequired,
    taxesBRL: awardFlight.taxes,
    program: awardFlight.program,
    userAvgCostPerMilheiro,
  });

  return {
    milesValuePerK: result.milesValuePerK,
    rating: result.rating,
    cashSavings: result.cashSavings,
    equivalentCashCost: result.equivalentCashCost,
    recommendation: result.recommendation,
    isUsingPersonalData: result.isUsingPersonalData,
    cashPriceBRL,
  };
}

/**
 * Pre-compute miles value comparisons for all award flights in a search result.
 *
 * Uses the lowest available cash price as the comparison reference.
 * Returns null entries when no cash price is available.
 *
 * PRD F4.10: Integrate Miles Value Advisor into every flight result card.
 */
export function computeFlightMilesValues(
  awardFlights: readonly AwardFlight[],
  cashFlights: readonly CashFlight[],
  userAvgCostPerMilheiro?: number,
): readonly (FlightMilesValue | null)[] {
  const lowestCashPrice = findLowestCashPrice(cashFlights);

  if (lowestCashPrice == null) {
    return awardFlights.map(() => null);
  }

  return awardFlights.map((flight) =>
    computeFlightMilesValue(flight, lowestCashPrice, userAvgCostPerMilheiro),
  );
}
