import { logger } from '@/lib/logger';
import { searchAvailability, SeatsAeroError } from '@/lib/integrations/seats-aero';
import { searchCashFlights, SerpApiError } from '@/lib/integrations/serp-api';
import type { FlightSearchParams } from '@/lib/validators/flight-search.schema';

// ==================== Types ====================

export interface CashFlight {
  readonly airline: string;
  readonly price: number; // BRL
  readonly duration: number; // minutes
  readonly stops: number;
  readonly departureTime: string; // ISO
  readonly arrivalTime: string; // ISO
  readonly source: 'GOOGLE_FLIGHTS';
}

export interface AwardFlight {
  readonly airline: string;
  readonly milesRequired: number;
  readonly taxes: number; // BRL
  readonly program: string; // e.g. 'Smiles', 'Azul Fidelidade'
  readonly cabinClass: string;
  readonly seatsAvailable: number;
  readonly source: 'SEATS_AERO';
}

export interface FlightSearchResult {
  readonly params: FlightSearchParams;
  readonly cashFlights: readonly CashFlight[];
  readonly awardFlights: readonly AwardFlight[];
  readonly searchedAt: Date;
}

// ==================== Service ====================

/**
 * Search for flights by params.
 *
 * - Award flights: Seats.aero Pro API (task 5.1 — implemented)
 * - Cash flights: SerpApi Google Flights (task 5.2 — pending)
 *
 * PRD F4.1-F4.3: Search cash and award flights by origin/destination/date/cabin/passengers.
 */
export async function searchFlights(params: FlightSearchParams): Promise<FlightSearchResult> {
  logger.info(
    { origin: params.origin, destination: params.destination, departureDate: params.departureDate },
    'Flight search started',
  );

  const [awardFlights, cashFlights] = await Promise.all([
    fetchAwardFlights(params),
    fetchCashFlights(params),
  ]);

  return {
    params,
    cashFlights,
    awardFlights,
    searchedAt: new Date(),
  };
}

async function fetchCashFlights(params: FlightSearchParams): Promise<readonly CashFlight[]> {
  try {
    return await searchCashFlights(params);
  } catch (error) {
    if (error instanceof SerpApiError) {
      logger.warn({ err: error }, 'SerpApi search failed, returning empty cash flights');
      return [];
    }

    logger.error({ err: error }, 'Unexpected error fetching cash flights');
    throw error;
  }
}

async function fetchAwardFlights(params: FlightSearchParams): Promise<readonly AwardFlight[]> {
  try {
    const endDate = params.returnDate ?? params.departureDate;

    return await searchAvailability({
      originAirport: params.origin,
      destinationAirport: params.destination,
      cabinClass: params.cabinClass,
      startDate: params.departureDate,
      endDate,
    });
  } catch (error) {
    if (error instanceof SeatsAeroError) {
      logger.warn({ err: error }, 'Seats.aero search failed, returning empty award flights');
      return [];
    }

    logger.error({ err: error }, 'Unexpected error fetching award flights');
    throw error;
  }
}
