'use server';

import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import {
  exploreDestinationsParamsSchema,
  type ExploreDestinationsParams,
} from '@/lib/validators/explore-destinations.schema';
import { exploreDestinations, type ExploreDestination } from '@/lib/services/explore-destinations.service';
import { getUserAverageCostPerMilheiro } from '@/lib/services/transfer.service';

// ==================== Types ====================

interface ExploreDestinationsActionResult {
  success: boolean;
  data?: {
    destinations: ExploreDestination[];
    departureDate: string;
    returnDate: string;
    userAvgCostPerMilheiro?: number;
  };
  error?: string;
}

// ==================== Actions ====================

/**
 * Explore destinations by region and date type, sorted by best value.
 *
 * PRD F4.8: Explore destinations mode — browse flights by region, date type
 * (holidays, weekends, flexible), sorted by best value in miles or cash.
 */
export async function exploreDestinationsAction(
  params: ExploreDestinationsParams,
): Promise<ExploreDestinationsActionResult> {
  const parsed = exploreDestinationsParamsSchema.safeParse(params);
  if (!parsed.success) {
    return { success: false, error: 'Invalid explore parameters' };
  }

  try {
    const session = await auth();

    const userAvgCost = session?.user?.id
      ? await getUserAverageCostPerMilheiro(session.user.id, undefined)
      : null;

    const destinations = await exploreDestinations(parsed.data, userAvgCost ?? undefined);

    // Extract dates from first result (all results share the same dates)
    const departureDate = destinations[0]?.departureDate ?? '';
    const returnDate = destinations[0]?.returnDate ?? '';

    logger.info(
      {
        origin: parsed.data.origin,
        region: parsed.data.region,
        dateType: parsed.data.dateType,
        resultsCount: destinations.length,
      },
      'Explore destinations action completed',
    );

    return {
      success: true,
      data: {
        destinations,
        departureDate,
        returnDate,
        userAvgCostPerMilheiro: userAvgCost ?? undefined,
      },
    };
  } catch (error) {
    logger.error({ err: error }, 'Explore destinations action failed');
    return { success: false, error: 'Explore search failed. Please try again.' };
  }
}
