import { logger } from '@/lib/logger';
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
 * NOTE: This is a placeholder until external API integrations are ready.
 * - Task 5.1 will implement Seats.aero integration (award flights)
 * - Task 5.2 will implement SerpApi integration (cash flights)
 *
 * PRD F4.1-F4.3: Search cash and award flights by origin/destination/date/cabin/passengers.
 */
export async function searchFlights(params: FlightSearchParams): Promise<FlightSearchResult> {
  logger.info(
    { origin: params.origin, destination: params.destination, departureDate: params.departureDate },
    'Flight search started',
  );

  // Real implementations injected in tasks 5.1 (Seats.aero) and 5.2 (SerpApi)
  return {
    params,
    cashFlights: [],
    awardFlights: [],
    searchedAt: new Date(),
  };
}
