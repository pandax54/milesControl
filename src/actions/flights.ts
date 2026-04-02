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
import { canAccessPremiumFeature } from '@/lib/services/freemium.service';

// ==================== Types ====================

interface FlightSearchActionResult {
  success: boolean;
  data?: FlightSearchResult & {
    userAvgCostPerMilheiro?: number;
    isUsingPersonalData: boolean;
    flightMilesValues: readonly (FlightMilesValue | null)[];
    canAccessAwardFlights: boolean;
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
    const canAccessAwardFlights = session?.user?.id
      ? await canAccessPremiumFeature(session.user.id, 'awardFlights')
      : false;

    const [result, userAvgCost] = await Promise.all([
      searchFlights(parsed.data, { includeAwardFlights: canAccessAwardFlights }),
      canAccessAwardFlights && session?.user?.id
        ? getUserAverageCostPerMilheiro(session.user.id, undefined)
        : Promise.resolve(null),
    ]);

    const awardFlights = canAccessAwardFlights ? result.awardFlights : [];
    const flightMilesValues = canAccessAwardFlights
      ? computeFlightMilesValues(awardFlights, result.cashFlights, userAvgCost ?? undefined)
      : [];

    logger.info(
      {
        origin: parsed.data.origin,
        destination: parsed.data.destination,
        cashFlights: result.cashFlights.length,
        awardFlights: awardFlights.length,
        canAccessAwardFlights,
        milesValuesComputed: flightMilesValues.filter(Boolean).length,
      },
      'Flight search completed',
    );

    return {
      success: true,
      data: {
        ...result,
        awardFlights,
        userAvgCostPerMilheiro: canAccessAwardFlights ? userAvgCost ?? undefined : undefined,
        isUsingPersonalData: canAccessAwardFlights && userAvgCost != null,
        flightMilesValues,
        canAccessAwardFlights,
      },
    };
  } catch (error) {
    logger.error({ err: error }, 'Flight search failed');
    return { success: false, error: 'Flight search failed. Please try again.' };
  }
}
