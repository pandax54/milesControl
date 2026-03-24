import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CashFlightCard } from './cash-flight-card';
import { AwardFlightCard } from './award-flight-card';
import type { CashFlight, AwardFlight } from '@/lib/services/flight-search.service';

// ==================== Types ====================

interface FlightResultsProps {
  cashFlights: readonly CashFlight[];
  awardFlights: readonly AwardFlight[];
  userAvgCostPerMilheiro?: number;
  /** Lowest cash price found — passed to award cards for Miles Value Advisor */
  lowestCashPrice?: number;
}

// ==================== Helpers ====================

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-10">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ==================== Component ====================

export function FlightResults({
  cashFlights,
  awardFlights,
  userAvgCostPerMilheiro,
  lowestCashPrice,
}: FlightResultsProps) {
  const cashCount = cashFlights.length;
  const awardCount = awardFlights.length;

  return (
    <Tabs defaultValue="cash">
      <TabsList>
        <TabsTrigger value="cash">
          Cash Flights{cashCount > 0 ? ` (${cashCount})` : ''}
        </TabsTrigger>
        <TabsTrigger value="award">
          Award Flights{awardCount > 0 ? ` (${awardCount})` : ''}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="cash" className="mt-4 space-y-3">
        {cashFlights.length === 0 ? (
          <EmptyState message="No cash flights found. Cash flight search via Google Flights will be available soon." />
        ) : (
          cashFlights.map((flight, index) => (
            <CashFlightCard key={`${flight.airline}-${flight.departureTime}-${index}`} flight={flight} />
          ))
        )}
      </TabsContent>

      <TabsContent value="award" className="mt-4 space-y-3">
        {awardFlights.length === 0 ? (
          <EmptyState message="No award flights found. Award seat search via Seats.aero will be available soon." />
        ) : (
          awardFlights.map((flight, index) => (
            <AwardFlightCard
              key={`${flight.program}-${flight.airline}-${flight.milesRequired}-${index}`}
              flight={flight}
              userAvgCostPerMilheiro={userAvgCostPerMilheiro}
              cashPrice={lowestCashPrice}
            />
          ))
        )}
      </TabsContent>
    </Tabs>
  );
}
