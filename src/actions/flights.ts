'use server';

import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { flightSearchParamsSchema, type FlightSearchParams } from '@/lib/validators/flight-search.schema';
import { searchFlights, type FlightSearchResult } from '@/lib/services/flight-search.service';
import { getUserAverageCostPerMilheiro } from '@/lib/services/transfer.service';
import {
  computeFlightMilesValues,
  type FlightMilesValue,
} from '@/lib/services/miles-value-comparison.service';

// ==================== Types ====================

interface FlightSearchActionResult {
  success: boolean;
  data?: FlightSearchResult & {
    userAvgCostPerMilheiro?: number;
    isUsingPersonalData: boolean;
    flightMilesValues: readonly (FlightMilesValue | null)[];
  };
  error?: string;
}

// ==================== Actions ====================

/**
 * Search for flights and pre-compute miles value comparisons per award flight.
 *
 * PRD F4.1-F4.4: Validate params, search cash and award flights,
 * attach user cost history so each result card can show the miles value inline.
 * PRD F4.10: Integrate Miles Value Advisor into every flight result card.
 */
export async function searchFlightsAction(params: FlightSearchParams): Promise<FlightSearchActionResult> {
  const parsed = flightSearchParamsSchema.safeParse(params);
  if (!parsed.success) {
    return { success: false, error: 'Invalid search parameters' };
  }

  try {
    const session = await auth();

    const [result, userAvgCost] = await Promise.all([
      searchFlights(parsed.data),
      session?.user?.id
        ? getUserAverageCostPerMilheiro(session.user.id, undefined)
        : Promise.resolve(null),
    ]);

    const flightMilesValues = computeFlightMilesValues(
      result.awardFlights,
      result.cashFlights,
      userAvgCost ?? undefined,
    );

    logger.info(
      {
        origin: parsed.data.origin,
        destination: parsed.data.destination,
        cashFlights: result.cashFlights.length,
        awardFlights: result.awardFlights.length,
        milesValuesComputed: flightMilesValues.filter(Boolean).length,
      },
      'Flight search completed',
    );

    return {
      success: true,
      data: {
        ...result,
        userAvgCostPerMilheiro: userAvgCost ?? undefined,
        isUsingPersonalData: userAvgCost != null,
        flightMilesValues,
      },
    };
  } catch (error) {
    logger.error({ err: error }, 'Flight search failed');
    return { success: false, error: 'Flight search failed. Please try again.' };
  }
}
