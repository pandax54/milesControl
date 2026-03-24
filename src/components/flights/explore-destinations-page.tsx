// PRD F4.8: Explore destinations UI — filter form with region, date type, cabin, sort options
// PRD F4.9: Saved flight filters — integrated SavedFiltersPanel for quick filter reuse
'use client';

import { useState, useTransition } from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExploreDestinationCard } from './explore-destination-card';
import { SavedFiltersPanel, type ApplyFilterValues } from './saved-filters-panel';
import { exploreDestinationsAction } from '@/actions/explore';
import {
  EXPLORE_REGIONS,
  EXPLORE_DATE_TYPES,
  EXPLORE_SORT_OPTIONS,
  EXPLORE_REGION_LABELS,
  EXPLORE_DATE_TYPE_LABELS,
  EXPLORE_SORT_LABELS,
  type ExploreRegion,
  type ExploreDateType,
  type ExploreSortBy,
} from '@/lib/validators/explore-destinations.schema';
import type { ExploreDestination } from '@/lib/services/explore-destinations.service';
import type { CabinClass } from '@/lib/validators/flight-search.schema';
import { CABIN_CLASSES, CABIN_CLASS_LABELS } from '@/lib/validators/flight-search.schema';

// ==================== Types ====================

interface ExploreState {
  destinations: ExploreDestination[];
  departureDate: string;
  returnDate: string;
  searched: boolean;
  error: string | null;
}

const INITIAL_STATE: ExploreState = {
  destinations: [],
  departureDate: '',
  returnDate: '',
  searched: false,
  error: null,
};

// ==================== Component ====================

export function ExploreDestinationsPage() {
  const [origin, setOrigin] = useState('GRU');
  const [region, setRegion] = useState<ExploreRegion>('EUROPE');
  const [dateType, setDateType] = useState<ExploreDateType>('WEEKENDS');
  const [cabinClass, setCabinClass] = useState<CabinClass>('ECONOMY');
  const [sortBy, setSortBy] = useState<ExploreSortBy>('BEST_MILES_VALUE');
  const [month, setMonth] = useState('');
  const [state, setState] = useState<ExploreState>(INITIAL_STATE);
  const [isPending, startTransition] = useTransition();

  function handleApplyFilter(values: ApplyFilterValues) {
    if (values.origin) setOrigin(values.origin);
    if (values.region) setRegion(values.region);
    if (values.cabinClass) setCabinClass(values.cabinClass);
    if (values.dateType) setDateType(values.dateType);
  }

  function handleExplore() {
    setState((prev) => ({ ...prev, error: null }));

    startTransition(async () => {
      const response = await exploreDestinationsAction({
        origin: origin.toUpperCase().trim(),
        region,
        dateType,
        cabinClass,
        sortBy,
        ...(dateType === 'FLEXIBLE' && month ? { month } : {}),
      });

      if (!response.success || !response.data) {
        setState((prev) => ({
          ...prev,
          error: response.error ?? 'Explore failed',
          searched: true,
        }));
        return;
      }

      setState({
        destinations: response.data.destinations,
        departureDate: response.data.departureDate,
        returnDate: response.data.returnDate,
        searched: true,
        error: null,
      });
    });
  }

  return (
    <div className="space-y-6">
      {/* Saved filters panel */}
      <SavedFiltersPanel
        currentFilters={{ origin, region, cabinClass, dateType }}
        onApplyFilter={handleApplyFilter}
      />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Explore Destinations</CardTitle>
          <CardDescription>
            Browse flights by region and date type. See cash and miles prices side-by-side, sorted by best value.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Origin */}
            <div className="space-y-1.5">
              <Label htmlFor="explore-origin">Origin</Label>
              <Input
                id="explore-origin"
                placeholder="GRU"
                value={origin}
                onChange={(e) => setOrigin(e.target.value.toUpperCase())}
                maxLength={3}
                className="uppercase"
              />
            </div>

            {/* Region */}
            <div className="space-y-1.5">
              <Label htmlFor="explore-region">Region</Label>
              <Select value={region} onValueChange={(v) => setRegion(v as ExploreRegion)}>
                <SelectTrigger id="explore-region">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPLORE_REGIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {EXPLORE_REGION_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date type */}
            <div className="space-y-1.5">
              <Label htmlFor="explore-date-type">Date Type</Label>
              <Select value={dateType} onValueChange={(v) => setDateType(v as ExploreDateType)}>
                <SelectTrigger id="explore-date-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPLORE_DATE_TYPES.map((d) => (
                    <SelectItem key={d} value={d}>
                      {EXPLORE_DATE_TYPE_LABELS[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month picker (only for FLEXIBLE) */}
            {dateType === 'FLEXIBLE' && (
              <div className="space-y-1.5">
                <Label htmlFor="explore-month">Month (optional)</Label>
                <Input
                  id="explore-month"
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                />
              </div>
            )}

            {/* Cabin */}
            <div className="space-y-1.5">
              <Label htmlFor="explore-cabin">Cabin</Label>
              <Select value={cabinClass} onValueChange={(v) => setCabinClass(v as CabinClass)}>
                <SelectTrigger id="explore-cabin">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CABIN_CLASSES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CABIN_CLASS_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort */}
            <div className="space-y-1.5">
              <Label htmlFor="explore-sort">Sort By</Label>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as ExploreSortBy)}>
                <SelectTrigger id="explore-sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPLORE_SORT_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {EXPLORE_SORT_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleExplore}
            disabled={isPending || origin.length !== 3}
            className="w-full sm:w-auto"
          >
            <Search className="mr-2 h-4 w-4" />
            {isPending ? 'Exploring...' : 'Explore Destinations'}
          </Button>
        </CardContent>
      </Card>

      {/* Error */}
      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      {/* Results */}
      {state.searched && !state.error && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {state.destinations.length > 0
                ? `${state.destinations.length} destination${state.destinations.length !== 1 ? 's' : ''} found`
                : 'No destinations found'}
            </h2>
            {state.destinations.length > 0 && state.departureDate && (
              <p className="text-sm text-muted-foreground">
                {new Date(state.departureDate + 'T00:00:00').toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}{' '}
                — round trip 7 days
              </p>
            )}
          </div>

          {state.destinations.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No flights found for this combination. Try a different region or date type.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {state.destinations.map((dest) => (
              <ExploreDestinationCard key={dest.destination} destination={dest} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
