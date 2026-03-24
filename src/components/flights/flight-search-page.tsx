'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FlightSearchForm } from './flight-search-form';
import { FlightResults } from './flight-results';
import { searchFlightsAction } from '@/actions/flights';
import type { FlightSearchParams } from '@/lib/validators/flight-search.schema';
import type { CashFlight, AwardFlight } from '@/lib/services/flight-search.service';

// ==================== Types ====================

interface SearchState {
  cashFlights: readonly CashFlight[];
  awardFlights: readonly AwardFlight[];
  userAvgCostPerMilheiro?: number;
  lowestCashPrice?: number;
  searched: boolean;
  error: string | null;
}

const INITIAL_STATE: SearchState = {
  cashFlights: [],
  awardFlights: [],
  searched: false,
  error: null,
};

// ==================== Component ====================

export function FlightSearchPage() {
  const [state, setState] = useState<SearchState>(INITIAL_STATE);
  const [isPending, startTransition] = useTransition();

  function handleSearch(params: FlightSearchParams) {
    setState((prev) => ({ ...prev, error: null }));
    startTransition(async () => {
      const response = await searchFlightsAction(params);

      if (!response.success || !response.data) {
        setState((prev) => ({
          ...prev,
          error: response.error ?? 'Search failed',
          searched: true,
        }));
        return;
      }

      const { cashFlights, awardFlights, userAvgCostPerMilheiro } = response.data;
      const prices = cashFlights.map((f) => f.price);
      const lowestCashPrice = prices.length > 0 ? Math.min(...prices) : undefined;

      setState({
        cashFlights,
        awardFlights,
        userAvgCostPerMilheiro,
        lowestCashPrice,
        searched: true,
        error: null,
      });
    });
  }

  return (
    <div className="space-y-6">
      {/* Search form */}
      <Card>
        <CardHeader>
          <CardTitle>Flight Search</CardTitle>
          <CardDescription>
            Search for cash and award flights. Compare prices and use the Miles Value Advisor to decide whether paying with miles beats paying cash.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FlightSearchForm onSearch={handleSearch} isSearching={isPending} />
        </CardContent>
      </Card>

      {/* Error */}
      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      {/* Results */}
      {state.searched && !state.error && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Results</h2>
          <FlightResults
            cashFlights={state.cashFlights}
            awardFlights={state.awardFlights}
            userAvgCostPerMilheiro={state.userAvgCostPerMilheiro}
            lowestCashPrice={state.lowestCashPrice}
          />
        </div>
      )}
    </div>
  );
}
