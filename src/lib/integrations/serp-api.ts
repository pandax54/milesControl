import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import type { CashFlight } from '@/lib/services/flight-search.service';
import type { FlightSearchParams } from '@/lib/validators/flight-search.schema';
import type { CabinClass } from '@/lib/validators/flight-search.schema';
import {
  serpApiSearchResponseSchema,
  type SerpApiFlightOption,
  type SerpApiSearchResponse,
} from '@/lib/validators/serp-api.schema';

// ==================== Constants ====================

const SERPAPI_BASE_URL = 'https://serpapi.com/search';
const CACHE_TTL_MS = 6 * 60 * 60 * 1_000; // 6 hours
const MAX_RETRY_ATTEMPTS = 2; // retry once = 2 total attempts

// ==================== Error types ====================

export class SerpApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SerpApiError';
  }
}

export class SerpApiRequestError extends SerpApiError {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'SerpApiRequestError';
    this.statusCode = statusCode;
  }
}

// ==================== In-memory cache ====================

interface CacheEntry {
  readonly data: readonly CashFlight[];
  readonly expiresAt: number;
}

const searchCache = new Map<string, CacheEntry>();

function buildCacheKey(params: FlightSearchParams): string {
  return `${params.origin}:${params.destination}:${params.departureDate}:${params.returnDate ?? ''}:${params.cabinClass}:${params.passengers}`;
}

function getFromCache(key: string): readonly CashFlight[] | null {
  const entry = searchCache.get(key);

  if (!entry || Date.now() > entry.expiresAt) {
    searchCache.delete(key);
    return null;
  }

  return entry.data;
}

function setInCache(key: string, data: readonly CashFlight[]): void {
  searchCache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

/** Clear the entire search cache. Exposed for testing. */
export function clearCache(): void {
  searchCache.clear();
}

// ==================== Cabin class mapping ====================

const CABIN_TO_TRAVEL_CLASS: Record<CabinClass, string> = {
  ECONOMY: '1',
  PREMIUM_ECONOMY: '2',
  BUSINESS: '3',
  FIRST: '4',
};

// ==================== HTTP client ====================

async function callSerpApi(
  params: FlightSearchParams,
  apiKey: string,
): Promise<readonly CashFlight[]> {
  const url = new URL(SERPAPI_BASE_URL);
  url.searchParams.set('engine', 'google_flights');
  url.searchParams.set('departure_id', params.origin);
  url.searchParams.set('arrival_id', params.destination);
  url.searchParams.set('outbound_date', params.departureDate);
  url.searchParams.set('currency', 'BRL');
  url.searchParams.set('hl', 'pt');
  url.searchParams.set('adults', String(params.passengers));
  url.searchParams.set('travel_class', CABIN_TO_TRAVEL_CLASS[params.cabinClass]);
  url.searchParams.set('api_key', apiKey);

  if (params.returnDate) {
    url.searchParams.set('return_date', params.returnDate);
    url.searchParams.set('type', '1'); // round trip
  } else {
    url.searchParams.set('type', '2'); // one way
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorText = await response.text();
        throw new SerpApiRequestError(
          `SerpApi returned ${response.status}: ${errorText}`,
          response.status,
        );
      }

      const json: unknown = await response.json();
      const parsed = serpApiSearchResponseSchema.parse(json);

      if (parsed.error) {
        throw new SerpApiError(`SerpApi error: ${parsed.error}`);
      }

      return parseFlightResults(parsed);
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === MAX_RETRY_ATTEMPTS;

      // SerpApiError (including SerpApiRequestError 4xx) and bad API key errors
      // are not retriable
      if (error instanceof SerpApiError && !(error instanceof SerpApiRequestError)) {
        throw error;
      }

      if (error instanceof SerpApiRequestError && error.statusCode < 500) {
        throw error;
      }

      if (isLastAttempt) {
        throw lastError;
      }

      logger.warn({ attempt, err: error }, 'SerpApi call failed, retrying');
    }
  }

  throw new SerpApiError('All retry attempts exhausted');
}

// ==================== Response parsing ====================

function parseLocalTimeToIso(time: string): string {
  // SerpApi returns "YYYY-MM-DD HH:mm" local time — convert to ISO 8601
  return time.replace(' ', 'T') + ':00';
}

function mapFlightOptionToCashFlight(option: SerpApiFlightOption): CashFlight | null {
  if (!option.flights.length || typeof option.price !== 'number') {
    return null;
  }

  const firstLeg = option.flights[0];
  const lastLeg = option.flights[option.flights.length - 1];

  if (!firstLeg || !lastLeg) {
    return null;
  }

  return {
    airline: firstLeg.airline,
    price: option.price,
    duration: option.total_duration,
    stops: option.flights.length - 1,
    departureTime: parseLocalTimeToIso(firstLeg.departure_airport.time),
    arrivalTime: parseLocalTimeToIso(lastLeg.arrival_airport.time),
    source: 'GOOGLE_FLIGHTS',
  };
}

function parseFlightResults(response: SerpApiSearchResponse): readonly CashFlight[] {
  const allOptions: SerpApiFlightOption[] = [
    ...(response.best_flights ?? []),
    ...(response.other_flights ?? []),
  ];

  return allOptions
    .map((option) => mapFlightOptionToCashFlight(option))
    .filter((flight): flight is CashFlight => flight !== null);
}

// ==================== Public API ====================

/**
 * Search cash flight prices via SerpApi Google Flights.
 * Results are cached for 6 hours to respect free tier limits (250 queries/month).
 *
 * PRD F4.2: Show cash prices from Google Flights (via SerpApi).
 */
export async function searchCashFlights(
  params: FlightSearchParams,
): Promise<readonly CashFlight[]> {
  const cacheKey = buildCacheKey(params);
  const cached = getFromCache(cacheKey);

  if (cached) {
    logger.info(
      { origin: params.origin, destination: params.destination },
      'SerpApi cash flights served from cache',
    );
    return cached;
  }

  const apiKey = env.SERPAPI_API_KEY;

  if (!apiKey) {
    throw new SerpApiError('SerpApi API key not configured');
  }

  logger.info(
    {
      origin: params.origin,
      destination: params.destination,
      date: params.departureDate,
      cabin: params.cabinClass,
    },
    'SerpApi cash flights search started',
  );

  const results = await callSerpApi(params, apiKey);
  setInCache(cacheKey, results);

  logger.info(
    { origin: params.origin, destination: params.destination, count: results.length },
    'SerpApi cash flights search complete',
  );

  return results;
}
