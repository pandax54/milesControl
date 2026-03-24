import { logger } from '@/lib/logger';
import { searchFlights } from './flight-search.service';
import { computeFlightMilesValues, findLowestCashPrice } from './miles-value-comparison.service';
import type {
  ExploreDestinationsParams,
  ExploreRegion,
  ExploreSortBy,
} from '@/lib/validators/explore-destinations.schema';
import type { PromotionRating } from '@/lib/validators/cost-calculator.schema';

// ==================== Constants ====================

/** Airport hubs per region with human-readable labels. */
const REGION_DESTINATIONS: Record<ExploreRegion, Array<{ iata: string; label: string }>> = {
  BRAZIL: [
    { iata: 'GRU', label: 'São Paulo (GRU)' },
    { iata: 'GIG', label: 'Rio de Janeiro (GIG)' },
    { iata: 'BSB', label: 'Brasília (BSB)' },
    { iata: 'SSA', label: 'Salvador (SSA)' },
    { iata: 'FOR', label: 'Fortaleza (FOR)' },
    { iata: 'REC', label: 'Recife (REC)' },
    { iata: 'CNF', label: 'Belo Horizonte (CNF)' },
    { iata: 'CWB', label: 'Curitiba (CWB)' },
  ],
  SOUTH_AMERICA: [
    { iata: 'EZE', label: 'Buenos Aires (EZE)' },
    { iata: 'SCL', label: 'Santiago (SCL)' },
    { iata: 'BOG', label: 'Bogotá (BOG)' },
    { iata: 'LIM', label: 'Lima (LIM)' },
    { iata: 'MVD', label: 'Montevideo (MVD)' },
  ],
  NORTH_AMERICA: [
    { iata: 'JFK', label: 'New York (JFK)' },
    { iata: 'MIA', label: 'Miami (MIA)' },
    { iata: 'LAX', label: 'Los Angeles (LAX)' },
    { iata: 'ORD', label: 'Chicago (ORD)' },
    { iata: 'YYZ', label: 'Toronto (YYZ)' },
  ],
  EUROPE: [
    { iata: 'LIS', label: 'Lisbon (LIS)' },
    { iata: 'MAD', label: 'Madrid (MAD)' },
    { iata: 'CDG', label: 'Paris (CDG)' },
    { iata: 'LHR', label: 'London (LHR)' },
    { iata: 'FCO', label: 'Rome (FCO)' },
  ],
  CARIBBEAN: [
    { iata: 'CUN', label: 'Cancún (CUN)' },
    { iata: 'SJO', label: 'San José (SJO)' },
    { iata: 'SDQ', label: 'Santo Domingo (SDQ)' },
    { iata: 'NAS', label: 'Nassau (NAS)' },
    { iata: 'SXM', label: 'Sint Maarten (SXM)' },
  ],
};

/** Brazilian holidays for 2026 (YYYY-MM-DD). */
const BRAZIL_HOLIDAYS_2026: ReadonlyArray<{ date: string; name: string }> = [
  { date: '2026-02-28', name: 'Carnaval' },
  { date: '2026-04-04', name: 'Easter' },
  { date: '2026-05-01', name: 'Labor Day' },
  { date: '2026-06-04', name: 'Corpus Christi' },
  { date: '2026-09-07', name: 'Independence Day' },
  { date: '2026-11-02', name: 'Finados' },
  { date: '2026-11-15', name: 'Republic Day' },
  { date: '2026-12-25', name: 'Christmas' },
];

/** Maximum number of destinations to search per explore request (to respect API limits). */
const MAX_DESTINATIONS_PER_EXPLORE = 5;

/** Trip duration in days for explore searches (round trip). */
const EXPLORE_TRIP_DURATION_DAYS = 7;

// ==================== Types ====================

export interface ExploreDestination {
  readonly destination: string;
  readonly destinationLabel: string;
  readonly region: ExploreRegion;
  readonly departureDate: string;
  readonly returnDate: string;
  readonly lowestCashPrice?: number;
  readonly lowestMilesRequired?: number;
  readonly bestMilesValuePerK?: number;
  readonly bestMilesRating?: PromotionRating;
  readonly cashFlightsCount: number;
  readonly awardFlightsCount: number;
}

// ==================== Date Generation ====================

/**
 * Return the next upcoming Friday (or today if today is Friday).
 * Uses UTC methods to avoid timezone-dependent day-of-week shifts.
 */
export function getNextFriday(from: Date): Date {
  const date = new Date(from);
  const dayOfWeek = date.getUTCDay(); // 0=Sun, 5=Fri
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  date.setUTCDate(date.getUTCDate() + daysUntilFriday);
  return date;
}

/**
 * Return the next upcoming holiday date that is after `from`.
 * Falls back to the first holiday of next year if all 2026 holidays have passed.
 */
export function getNextHoliday(from: Date): string {
  const fromStr = from.toISOString().slice(0, 10);
  const upcoming = BRAZIL_HOLIDAYS_2026.find((h) => h.date > fromStr);
  if (upcoming) return upcoming.date;
  // All holidays passed — return first holiday of list (next occurrence)
  return BRAZIL_HOLIDAYS_2026[0].date;
}

/**
 * Return the first day of next month (or first day of `month` if provided in YYYY-MM).
 * Uses UTC methods to avoid timezone-dependent date shifts.
 */
export function getFlexibleDate(from: Date, month?: string): string {
  if (month) {
    return `${month}-01`;
  }
  const next = new Date(from);
  next.setUTCMonth(next.getUTCMonth() + 1);
  next.setUTCDate(1);
  return next.toISOString().slice(0, 10);
}

/**
 * Format a Date as YYYY-MM-DD.
 */
export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Add `days` to a YYYY-MM-DD date string and return the result.
 */
export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Generate the departure date to use for a given date type.
 */
export function generateDepartureDate(
  dateType: ExploreDestinationsParams['dateType'],
  referenceDate: Date,
  month?: string,
): string {
  switch (dateType) {
    case 'WEEKENDS':
      return formatDate(getNextFriday(referenceDate));
    case 'HOLIDAYS':
      return getNextHoliday(referenceDate);
    case 'FLEXIBLE':
      return getFlexibleDate(referenceDate, month);
  }
}

// ==================== Service ====================

/**
 * Get candidate destinations for a region, excluding the user's origin airport.
 * Limits to MAX_DESTINATIONS_PER_EXPLORE entries.
 */
export function getDestinationsForRegion(
  region: ExploreRegion,
  origin: string,
): Array<{ iata: string; label: string }> {
  return REGION_DESTINATIONS[region]
    .filter((d) => d.iata !== origin)
    .slice(0, MAX_DESTINATIONS_PER_EXPLORE);
}

/**
 * Search a single destination and build an ExploreDestination result.
 * Returns null if both cash and award searches return empty results.
 */
async function searchOneDestination(
  origin: string,
  destination: { iata: string; label: string },
  region: ExploreRegion,
  departureDate: string,
  returnDate: string,
  cabinClass: ExploreDestinationsParams['cabinClass'],
  userAvgCostPerMilheiro?: number,
): Promise<ExploreDestination | null> {
  const result = await searchFlights({
    origin,
    destination: destination.iata,
    departureDate,
    returnDate,
    passengers: 1,
    cabinClass,
  });

  if (result.cashFlights.length === 0 && result.awardFlights.length === 0) {
    return null;
  }

  const lowestCashPrice = findLowestCashPrice(result.cashFlights);
  const lowestMilesRequired =
    result.awardFlights.length > 0
      ? Math.min(...result.awardFlights.map((f) => f.milesRequired))
      : undefined;

  const milesValues = computeFlightMilesValues(
    result.awardFlights,
    result.cashFlights,
    userAvgCostPerMilheiro,
  );

  const validMilesValues = milesValues.filter((v): v is NonNullable<typeof v> => v !== null);
  const bestMilesValue =
    validMilesValues.length > 0
      ? validMilesValues.reduce((best, v) => (v.milesValuePerK > best.milesValuePerK ? v : best))
      : undefined;

  return {
    destination: destination.iata,
    destinationLabel: destination.label,
    region,
    departureDate,
    returnDate,
    lowestCashPrice,
    lowestMilesRequired,
    bestMilesValuePerK: bestMilesValue?.milesValuePerK,
    bestMilesRating: bestMilesValue?.rating,
    cashFlightsCount: result.cashFlights.length,
    awardFlightsCount: result.awardFlights.length,
  };
}

/**
 * Sort explore results by the requested option.
 * Destinations with no data for a sort field are pushed to the end.
 */
function sortDestinations(destinations: ExploreDestination[], sortBy: ExploreSortBy): ExploreDestination[] {
  return [...destinations].sort((a, b) => {
    switch (sortBy) {
      case 'BEST_MILES_VALUE': {
        const aVal = a.bestMilesValuePerK ?? -Infinity;
        const bVal = b.bestMilesValuePerK ?? -Infinity;
        return bVal - aVal; // higher = better
      }
      case 'LOWEST_CASH': {
        const aVal = a.lowestCashPrice ?? Infinity;
        const bVal = b.lowestCashPrice ?? Infinity;
        return aVal - bVal; // lower = better
      }
      case 'LOWEST_MILES': {
        const aVal = a.lowestMilesRequired ?? Infinity;
        const bVal = b.lowestMilesRequired ?? Infinity;
        return aVal - bVal; // lower = better
      }
    }
  });
}

/**
 * Browse flights by region and date type, sorted by best value.
 *
 * PRD F4.8: Explore destinations mode — browse flights by region, by date type
 * (holidays, weekends, flexible), sorted by best value in miles or cash.
 *
 * Searches up to MAX_DESTINATIONS_PER_EXPLORE destinations in parallel.
 * Failed or empty searches are silently skipped to ensure partial results are always returned.
 */
export async function exploreDestinations(
  params: ExploreDestinationsParams,
  userAvgCostPerMilheiro?: number,
): Promise<ExploreDestination[]> {
  const referenceDate = new Date();
  const departureDate = generateDepartureDate(params.dateType, referenceDate, params.month);
  const returnDate = addDays(departureDate, EXPLORE_TRIP_DURATION_DAYS);

  const destinations = getDestinationsForRegion(params.region, params.origin);

  logger.info(
    {
      origin: params.origin,
      region: params.region,
      dateType: params.dateType,
      departureDate,
      destinations: destinations.map((d) => d.iata),
    },
    'Explore destinations search started',
  );

  const searchPromises = destinations.map((dest) =>
    searchOneDestination(
      params.origin,
      dest,
      params.region,
      departureDate,
      returnDate,
      params.cabinClass,
      userAvgCostPerMilheiro,
    ).catch((error) => {
      logger.warn({ err: error, destination: dest.iata }, 'Explore search failed for destination, skipping');
      return null;
    }),
  );

  const results = await Promise.all(searchPromises);
  const validResults = results.filter((r): r is ExploreDestination => r !== null);
  const sorted = sortDestinations(validResults, params.sortBy);

  logger.info(
    {
      origin: params.origin,
      region: params.region,
      totalSearched: destinations.length,
      totalResults: sorted.length,
    },
    'Explore destinations search completed',
  );

  return sorted;
}
