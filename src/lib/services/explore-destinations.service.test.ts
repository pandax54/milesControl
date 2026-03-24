import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getNextFriday,
  getNextHoliday,
  getFlexibleDate,
  formatDate,
  addDays,
  generateDepartureDate,
  getDestinationsForRegion,
  exploreDestinations,
} from './explore-destinations.service';

// ==================== Mocks ====================

vi.mock('./flight-search.service', () => ({
  searchFlights: vi.fn(),
}));

vi.mock('./miles-value-comparison.service', () => ({
  computeFlightMilesValues: vi.fn(),
  findLowestCashPrice: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { searchFlights } from './flight-search.service';
import { computeFlightMilesValues, findLowestCashPrice } from './miles-value-comparison.service';

// ==================== Tests ====================

describe('getNextFriday', () => {
  it('should return the same day if today is Friday', () => {
    // Friday = day 5
    const friday = new Date('2026-03-27'); // A Friday
    const result = getNextFriday(friday);
    expect(formatDate(result)).toBe('2026-03-27');
  });

  it('should return next Friday when today is Saturday', () => {
    const saturday = new Date('2026-03-28'); // A Saturday
    const result = getNextFriday(saturday);
    expect(formatDate(result)).toBe('2026-04-03'); // next Friday
  });

  it('should return next Friday when today is Monday', () => {
    const monday = new Date('2026-03-23'); // A Monday
    const result = getNextFriday(monday);
    expect(formatDate(result)).toBe('2026-03-27'); // Friday of same week
  });

  it('should return next Friday when today is Sunday', () => {
    const sunday = new Date('2026-03-29'); // A Sunday
    const result = getNextFriday(sunday);
    expect(formatDate(result)).toBe('2026-04-03'); // next Friday
  });
});

describe('getNextHoliday', () => {
  it('should return the next upcoming holiday after the given date', () => {
    const date = new Date('2026-03-01');
    const result = getNextHoliday(date);
    expect(result).toBe('2026-04-04'); // Easter
  });

  it('should return Christmas when date is in November after Republic Day', () => {
    const date = new Date('2026-11-16');
    const result = getNextHoliday(date);
    expect(result).toBe('2026-12-25'); // Christmas
  });

  it('should return first holiday of list when all 2026 holidays have passed', () => {
    const date = new Date('2026-12-26');
    const result = getNextHoliday(date);
    expect(result).toBe('2026-02-28'); // first holiday (Carnaval)
  });

  it('should return carnival when date is in January', () => {
    const date = new Date('2026-01-01');
    const result = getNextHoliday(date);
    expect(result).toBe('2026-02-28');
  });
});

describe('getFlexibleDate', () => {
  it('should return first of next month when no month specified', () => {
    const date = new Date('2026-03-15');
    const result = getFlexibleDate(date);
    expect(result).toBe('2026-04-01');
  });

  it('should return first of specified month when month is provided', () => {
    const date = new Date('2026-03-15');
    const result = getFlexibleDate(date, '2026-06');
    expect(result).toBe('2026-06-01');
  });

  it('should handle year rollover correctly', () => {
    const date = new Date('2026-12-15');
    const result = getFlexibleDate(date);
    expect(result).toBe('2027-01-01');
  });
});

describe('addDays', () => {
  it('should add days to a date string', () => {
    expect(addDays('2026-03-27', 7)).toBe('2026-04-03');
  });

  it('should handle month boundary', () => {
    expect(addDays('2026-03-28', 5)).toBe('2026-04-02');
  });

  it('should handle year boundary', () => {
    expect(addDays('2026-12-28', 5)).toBe('2027-01-02');
  });
});

describe('generateDepartureDate', () => {
  it('should generate a Friday for WEEKENDS type', () => {
    const monday = new Date('2026-03-23');
    const result = generateDepartureDate('WEEKENDS', monday);
    expect(result).toBe('2026-03-27');
  });

  it('should generate next holiday for HOLIDAYS type', () => {
    const date = new Date('2026-09-08'); // day after Independence Day
    const result = generateDepartureDate('HOLIDAYS', date);
    expect(result).toBe('2026-11-02'); // Finados
  });

  it('should generate first of next month for FLEXIBLE type', () => {
    const date = new Date('2026-03-15');
    const result = generateDepartureDate('FLEXIBLE', date);
    expect(result).toBe('2026-04-01');
  });

  it('should use provided month for FLEXIBLE type', () => {
    const date = new Date('2026-03-15');
    const result = generateDepartureDate('FLEXIBLE', date, '2026-07');
    expect(result).toBe('2026-07-01');
  });
});

describe('getDestinationsForRegion', () => {
  it('should return destinations for EUROPE region', () => {
    const destinations = getDestinationsForRegion('EUROPE', 'GRU');
    expect(destinations).toHaveLength(5);
    expect(destinations.map((d) => d.iata)).toEqual(['LIS', 'MAD', 'CDG', 'LHR', 'FCO']);
  });

  it('should exclude the origin airport from results', () => {
    const destinations = getDestinationsForRegion('BRAZIL', 'GRU');
    expect(destinations.map((d) => d.iata)).not.toContain('GRU');
  });

  it('should limit to 5 destinations', () => {
    const destinations = getDestinationsForRegion('BRAZIL', 'POA');
    expect(destinations.length).toBeLessThanOrEqual(5);
  });

  it('should return SOUTH_AMERICA destinations', () => {
    const destinations = getDestinationsForRegion('SOUTH_AMERICA', 'GRU');
    expect(destinations.map((d) => d.iata)).toContain('EZE');
    expect(destinations.map((d) => d.iata)).toContain('SCL');
  });

  it('should return all destinations when origin is not in the region', () => {
    const destinations = getDestinationsForRegion('CARIBBEAN', 'GRU');
    expect(destinations).toHaveLength(5);
  });
});

describe('exploreDestinations', () => {
  const mockSearchFlights = vi.mocked(searchFlights);
  const mockComputeFlightMilesValues = vi.mocked(computeFlightMilesValues);
  const mockFindLowestCashPrice = vi.mocked(findLowestCashPrice);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-23')); // Monday
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should return explore destinations sorted by best miles value by default', async () => {
    mockSearchFlights.mockResolvedValue({
      params: { origin: 'GRU', destination: 'LIS', departureDate: '2026-03-27', returnDate: '2026-04-03', passengers: 1, cabinClass: 'ECONOMY' },
      cashFlights: [{ airline: 'TAP', price: 3000, duration: 600, stops: 0, departureTime: '', arrivalTime: '', source: 'GOOGLE_FLIGHTS' }],
      awardFlights: [{ airline: 'TAP', milesRequired: 50000, taxes: 200, program: 'Smiles', cabinClass: 'ECONOMY', seatsAvailable: 2, source: 'SEATS_AERO' }],
      searchedAt: new Date(),
    });
    mockFindLowestCashPrice.mockReturnValue(3000);
    mockComputeFlightMilesValues.mockReturnValue([
      {
        milesValuePerK: 56,
        rating: 'EXCELLENT',
        cashSavings: 2400,
        equivalentCashCost: 600,
        recommendation: 'Use miles',
        isUsingPersonalData: false,
        cashPriceBRL: 3000,
      },
    ]);

    const result = await exploreDestinations({
      origin: 'GRU',
      region: 'EUROPE',
      dateType: 'WEEKENDS',
      cabinClass: 'ECONOMY',
      sortBy: 'BEST_MILES_VALUE',
    });

    expect(result).toHaveLength(5);
    expect(result[0].cashFlightsCount).toBe(1);
    expect(result[0].awardFlightsCount).toBe(1);
    expect(result[0].lowestCashPrice).toBe(3000);
    expect(result[0].lowestMilesRequired).toBe(50000);
    expect(result[0].bestMilesValuePerK).toBe(56);
    expect(result[0].bestMilesRating).toBe('EXCELLENT');
    expect(result[0].departureDate).toBe('2026-03-27');
    expect(result[0].returnDate).toBe('2026-04-03');
    expect(result[0].region).toBe('EUROPE');
  });

  it('should exclude destinations with no results', async () => {
    // First destination returns results, others return empty
    let callCount = 0;
    mockSearchFlights.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          params: { origin: 'GRU', destination: 'LIS', departureDate: '2026-03-27', returnDate: '2026-04-03', passengers: 1, cabinClass: 'ECONOMY' },
          cashFlights: [{ airline: 'TAP', price: 3000, duration: 600, stops: 0, departureTime: '', arrivalTime: '', source: 'GOOGLE_FLIGHTS' as const }],
          awardFlights: [],
          searchedAt: new Date(),
        };
      }
      return {
        params: { origin: 'GRU', destination: 'MAD', departureDate: '2026-03-27', returnDate: '2026-04-03', passengers: 1, cabinClass: 'ECONOMY' },
        cashFlights: [],
        awardFlights: [],
        searchedAt: new Date(),
      };
    });
    mockFindLowestCashPrice.mockReturnValue(3000);
    mockComputeFlightMilesValues.mockReturnValue([]);

    const result = await exploreDestinations({
      origin: 'GRU',
      region: 'EUROPE',
      dateType: 'WEEKENDS',
      cabinClass: 'ECONOMY',
      sortBy: 'LOWEST_CASH',
    });

    expect(result).toHaveLength(1);
    expect(result[0].destination).toBe('LIS');
  });

  it('should sort by lowest cash price', async () => {
    const prices = [2000, 1500, 3000, 1000, 2500];
    const europeDests = ['LIS', 'MAD', 'CDG', 'LHR', 'FCO'];
    mockSearchFlights.mockImplementation(async (params) => ({
      params,
      cashFlights: [{ airline: 'Any', price: prices[europeDests.indexOf(params.destination)], duration: 600, stops: 0, departureTime: '', arrivalTime: '', source: 'GOOGLE_FLIGHTS' as const }],
      awardFlights: [],
      searchedAt: new Date(),
    }));
    mockFindLowestCashPrice.mockImplementation((flights) => flights[0]?.price);
    mockComputeFlightMilesValues.mockReturnValue([]);

    const result = await exploreDestinations({
      origin: 'GRU',
      region: 'EUROPE',
      dateType: 'FLEXIBLE',
      cabinClass: 'ECONOMY',
      sortBy: 'LOWEST_CASH',
    });

    // Should be sorted ascending by cash price
    expect(result[0].lowestCashPrice).toBe(1000); // LHR
    expect(result[1].lowestCashPrice).toBe(1500); // MAD
    expect(result[2].lowestCashPrice).toBe(2000); // LIS
    expect(result[3].lowestCashPrice).toBe(2500); // FCO
    expect(result[4].lowestCashPrice).toBe(3000); // CDG
  });

  it('should sort by lowest miles required', async () => {
    const milesOptions = [60000, 40000, 80000, 30000, 50000];
    const europeDests = ['LIS', 'MAD', 'CDG', 'LHR', 'FCO'];
    mockSearchFlights.mockImplementation(async (params) => ({
      params,
      cashFlights: [],
      awardFlights: [{ airline: 'Any', milesRequired: milesOptions[europeDests.indexOf(params.destination)], taxes: 100, program: 'Smiles', cabinClass: 'ECONOMY', seatsAvailable: 2, source: 'SEATS_AERO' as const }],
      searchedAt: new Date(),
    }));
    mockFindLowestCashPrice.mockReturnValue(undefined);
    mockComputeFlightMilesValues.mockReturnValue([null]);

    const result = await exploreDestinations({
      origin: 'GRU',
      region: 'EUROPE',
      dateType: 'HOLIDAYS',
      cabinClass: 'ECONOMY',
      sortBy: 'LOWEST_MILES',
    });

    expect(result[0].lowestMilesRequired).toBe(30000); // LHR
    expect(result[1].lowestMilesRequired).toBe(40000); // MAD
    expect(result[2].lowestMilesRequired).toBe(50000); // FCO
    expect(result[3].lowestMilesRequired).toBe(60000); // LIS
    expect(result[4].lowestMilesRequired).toBe(80000); // CDG
  });

  it('should handle failed searches gracefully and skip failed destinations', async () => {
    mockSearchFlights.mockRejectedValueOnce(new Error('API error'));
    mockSearchFlights.mockResolvedValue({
      params: { origin: 'GRU', destination: 'MAD', departureDate: '2026-03-27', returnDate: '2026-04-03', passengers: 1, cabinClass: 'ECONOMY' },
      cashFlights: [{ airline: 'Iberia', price: 2500, duration: 700, stops: 1, departureTime: '', arrivalTime: '', source: 'GOOGLE_FLIGHTS' }],
      awardFlights: [],
      searchedAt: new Date(),
    });
    mockFindLowestCashPrice.mockReturnValue(2500);
    mockComputeFlightMilesValues.mockReturnValue([]);

    const result = await exploreDestinations({
      origin: 'GRU',
      region: 'EUROPE',
      dateType: 'WEEKENDS',
      cabinClass: 'ECONOMY',
      sortBy: 'LOWEST_CASH',
    });

    // First destination failed but rest succeeded
    expect(result).toHaveLength(4);
  });

  it('should use HOLIDAYS date type and set appropriate departure date', async () => {
    // Date is set to 2026-03-23 (after Carnaval, before Easter)
    mockSearchFlights.mockResolvedValue({
      params: { origin: 'GRU', destination: 'EZE', departureDate: '2026-04-04', returnDate: '2026-04-11', passengers: 1, cabinClass: 'ECONOMY' },
      cashFlights: [],
      awardFlights: [],
      searchedAt: new Date(),
    });
    mockFindLowestCashPrice.mockReturnValue(undefined);
    mockComputeFlightMilesValues.mockReturnValue([]);

    await exploreDestinations({
      origin: 'GRU',
      region: 'SOUTH_AMERICA',
      dateType: 'HOLIDAYS',
      cabinClass: 'ECONOMY',
      sortBy: 'BEST_MILES_VALUE',
    });

    // searchFlights should be called with Easter date (2026-04-04)
    expect(mockSearchFlights).toHaveBeenCalledWith(
      expect.objectContaining({ departureDate: '2026-04-04', returnDate: '2026-04-11' }),
    );
  });

  it('should pass userAvgCostPerMilheiro to miles value computation', async () => {
    mockSearchFlights.mockResolvedValue({
      params: { origin: 'GRU', destination: 'EZE', departureDate: '2026-03-27', returnDate: '2026-04-03', passengers: 1, cabinClass: 'ECONOMY' },
      cashFlights: [{ airline: 'Any', price: 2000, duration: 300, stops: 0, departureTime: '', arrivalTime: '', source: 'GOOGLE_FLIGHTS' }],
      awardFlights: [{ airline: 'Any', milesRequired: 20000, taxes: 100, program: 'Smiles', cabinClass: 'ECONOMY', seatsAvailable: 1, source: 'SEATS_AERO' }],
      searchedAt: new Date(),
    });
    mockFindLowestCashPrice.mockReturnValue(2000);
    mockComputeFlightMilesValues.mockReturnValue([
      { milesValuePerK: 90, rating: 'EXCELLENT', cashSavings: 1700, equivalentCashCost: 300, recommendation: 'Use miles', isUsingPersonalData: true, cashPriceBRL: 2000 },
    ]);

    await exploreDestinations(
      { origin: 'GRU', region: 'SOUTH_AMERICA', dateType: 'WEEKENDS', cabinClass: 'ECONOMY', sortBy: 'BEST_MILES_VALUE' },
      15,
    );

    expect(mockComputeFlightMilesValues).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Array),
      15,
    );
  });
});
