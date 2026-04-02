import { z } from 'zod';

import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import type { AwardFlight } from '@/lib/services/flight-search.service';
import type { CabinClass } from '@/lib/validators/flight-search.schema';
import {
  seatsAeroSearchParamsSchema,
  seatsAeroSearchResponseSchema,
  seatsAeroTripSchema,
  type SeatsAeroAvailability,
  type SeatsAeroTrip,
} from '@/lib/validators/seats-aero.schema';

// ==================== Constants ====================

const SEATS_AERO_BASE_URL = 'https://seats.aero/partnerapi';
const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1_000;

// ==================== Types ====================

export interface SeatsAeroSearchParams {
  readonly originAirport: string;
  readonly destinationAirport: string;
  readonly cabinClass: CabinClass;
  readonly startDate: string; // YYYY-MM-DD
  readonly endDate: string; // YYYY-MM-DD
}

export type { SeatsAeroTrip } from '@/lib/validators/seats-aero.schema';

// ==================== Cabin mapping ====================

const CABIN_CLASS_TO_SEATS_AERO: Record<CabinClass, 'Y' | 'W' | 'J' | 'F'> = {
  ECONOMY: 'Y',
  PREMIUM_ECONOMY: 'W',
  BUSINESS: 'J',
  FIRST: 'F',
};

const CABIN_CODE_TO_LABEL: Record<string, string> = {
  Y: 'Economy',
  W: 'Premium Economy',
  J: 'Business',
  F: 'First',
};

const SOURCE_TO_PROGRAM: Record<string, string> = {
  smiles: 'Smiles',
  azul: 'Azul Fidelidade',
  latam: 'Latam Pass',
  american: 'American Airlines AAdvantage',
  united: 'United MileagePlus',
  delta: 'Delta SkyMiles',
  aeroplan: 'Air Canada Aeroplan',
  virgin: 'Virgin Atlantic Flying Club',
  emirates: 'Emirates Skywards',
  etihad: 'Etihad Guest',
  flyingblue: 'Air France/KLM Flying Blue',
  tap: 'TAP Miles&Go',
  iberia: 'Iberia Plus',
};

// ==================== HTTP client ====================

async function callSeatsAeroApi<T>(
  endpoint: string,
  queryParams?: Record<string, string>,
  schema?: z.ZodSchema<T>,
): Promise<T> {
  const apiKey = env.SEATS_AERO_API_KEY;

  if (!apiKey) {
    throw new SeatsAeroError('Seats.aero API key not configured');
  }

  const url = new URL(`${SEATS_AERO_BASE_URL}${endpoint}`);

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      url.searchParams.set(key, value);
    }
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url.toString(), {
        headers: {
          'Partner-Authorization': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new SeatsAeroApiError(
          `Seats.aero API returned ${response.status}: ${errorText}`,
          response.status,
        );
      }

      const json: unknown = await response.json();

      if (schema) {
        return schema.parse(json);
      }

      return json as T;
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === MAX_RETRY_ATTEMPTS;

      if (error instanceof SeatsAeroApiError && error.statusCode < 500) {
        // Client errors (4xx) are not retryable
        throw error;
      }

      if (isLastAttempt) {
        throw lastError;
      }

      const delayMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      logger.warn(
        { endpoint, attempt, delayMs, err: error },
        'Seats.aero API call failed, retrying',
      );

      await sleep(delayMs);
    }
  }

  // TypeScript requires a return/throw here; the loop above always exits via throw
  throw new SeatsAeroError('All retry attempts exhausted');
}

// ==================== Error types ====================

export class SeatsAeroError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeatsAeroError';
  }
}

export class SeatsAeroApiError extends SeatsAeroError {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'SeatsAeroApiError';
    this.statusCode = statusCode;
  }
}

// ==================== Response mapping ====================

function mapAvailabilityToAwardFlights(
  availability: SeatsAeroAvailability,
  cabinCode: 'Y' | 'W' | 'J' | 'F',
): AwardFlight | null {
  const availabilityKey = `${cabinCode}Available` as keyof SeatsAeroAvailability;
  const mileageKey = `${cabinCode}Mileage` as keyof SeatsAeroAvailability;
  const taxesKey = `${cabinCode}Taxes` as keyof SeatsAeroAvailability;
  const seatKey = `${cabinCode}Seat` as keyof SeatsAeroAvailability;

  if (!availability[availabilityKey]) {
    return null;
  }

  const mileageValue = availability[mileageKey];

  if (typeof mileageValue !== 'number' || mileageValue <= 0) {
    return null;
  }

  const taxesValue = availability[taxesKey];
  const seatValue = availability[seatKey];

  const program = SOURCE_TO_PROGRAM[availability.Source.toLowerCase()] ?? availability.Source;

  return {
    airline: program,
    milesRequired: mileageValue,
    taxes: typeof taxesValue === 'number' ? taxesValue : 0,
    program,
    cabinClass: CABIN_CODE_TO_LABEL[cabinCode] ?? cabinCode,
    seatsAvailable: typeof seatValue === 'number' ? seatValue : 0,
    source: 'SEATS_AERO',
  };
}

// ==================== Public API ====================

/**
 * Search award flight availability via Seats.aero cached search.
 *
 * PRD F4.3: Show award availability from Seats.aero Pro API.
 * Uses /partnerapi/search endpoint which returns cached availability data.
 */
export async function searchAvailability(
  params: SeatsAeroSearchParams,
): Promise<readonly AwardFlight[]> {
  // Validate input at boundary
  const validated = seatsAeroSearchParamsSchema.parse(params);

  const cabinCode = CABIN_CLASS_TO_SEATS_AERO[validated.cabinClass];

  logger.info(
    {
      origin: validated.originAirport,
      destination: validated.destinationAirport,
      cabin: cabinCode,
      startDate: validated.startDate,
    },
    'Seats.aero availability search started',
  );

  const queryParams: Record<string, string> = {
    origin_airport: validated.originAirport,
    destination_airport: validated.destinationAirport,
    cabin: cabinCode.toLowerCase(),
    start_date: validated.startDate,
    end_date: validated.endDate,
  };

  const response = await callSeatsAeroApi('/search', queryParams, seatsAeroSearchResponseSchema);

  const awardFlights = response.data
    .map((availability) => mapAvailabilityToAwardFlights(availability, cabinCode))
    .filter((flight): flight is AwardFlight => flight !== null);

  logger.info(
    {
      origin: validated.originAirport,
      destination: validated.destinationAirport,
      count: awardFlights.length,
    },
    'Seats.aero availability search complete',
  );

  return awardFlights;
}

/**
 * Fetch detailed trip information by trip ID.
 *
 * PRD F4.3: Get specific award trip details from Seats.aero.
 */
export async function getTripDetails(tripId: string): Promise<SeatsAeroTrip> {
  logger.info({ tripId }, 'Seats.aero trip details fetch started');

  const trip = await callSeatsAeroApi(`/trips/${tripId}`, undefined, seatsAeroTripSchema);

  logger.info({ tripId }, 'Seats.aero trip details fetch complete');

  return trip;
}

// ==================== Utilities ====================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
