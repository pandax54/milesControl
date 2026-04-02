// PRD F4.9: Saved flight filters — save and reuse common search patterns
'use client';

import { useState, useEffect, useTransition } from 'react';
import { Bookmark, Trash2, BookmarkPlus, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  listSavedFlightFiltersAction,
  createSavedFlightFilterAction,
  deleteSavedFlightFilterAction,
} from '@/actions/saved-flight-filters';
import type { SavedFlightFilter } from '@/lib/services/saved-flight-filter.service';
import type { ExploreRegion, ExploreDateType } from '@/lib/validators/explore-destinations.schema';
import type { CabinClass } from '@/lib/validators/flight-search.schema';

// ==================== Types ====================

export interface ApplyFilterValues {
  readonly origin?: string;
  readonly region?: ExploreRegion;
  readonly cabinClass?: CabinClass;
  readonly dateType?: ExploreDateType;
}

interface SavedFiltersPanelProps {
  readonly currentFilters: ApplyFilterValues;
  readonly onApplyFilter: (values: ApplyFilterValues) => void;
}

// ==================== Helpers ====================

function buildFilterSummary(filter: SavedFlightFilter): string {
  const parts: string[] = [];
  if (filter.origin) parts.push(filter.origin);
  if (filter.region) parts.push(filter.region.replace('_', ' '));
  if (filter.cabinClass) parts.push(filter.cabinClass);
  if (filter.dateType) parts.push(filter.dateType);
  return parts.join(' · ') || 'No filters set';
}

function toApplyFilterValues(filter: SavedFlightFilter): ApplyFilterValues {
  return {
    ...(filter.origin ? { origin: filter.origin } : {}),
    ...(filter.region ? { region: filter.region as ExploreRegion } : {}),
    ...(filter.cabinClass ? { cabinClass: filter.cabinClass as CabinClass } : {}),
    ...(filter.dateType ? { dateType: filter.dateType as ExploreDateType } : {}),
  };
}

// ==================== Component ====================

export function SavedFiltersPanel({ currentFilters, onApplyFilter }: SavedFiltersPanelProps) {
  const [filters, setFilters] = useState<SavedFlightFilter[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await listSavedFlightFiltersAction();
      if (result.success && result.data) {
        setFilters(result.data);
      }
    });
  }, []);

  function handleApply(filter: SavedFlightFilter) {
    onApplyFilter(toApplyFilterValues(filter));
  }

  function handleDelete(filterId: string) {
    startTransition(async () => {
      const result = await deleteSavedFlightFilterAction(filterId);
      if (result.success) {
        setFilters((prev) => prev.filter((f) => f.id !== filterId));
      }
    });
  }

  function handleSave() {
    if (!filterName.trim()) {
      setSaveError('Name is required');
      return;
    }

    setSaveError(null);

    startTransition(async () => {
      const result = await createSavedFlightFilterAction({
        name: filterName.trim(),
        ...currentFilters,
      });

      if (result.success && result.data) {
        setFilters((prev) => [result.data!, ...prev]);
        setFilterName('');
        setIsSaving(false);
      } else {
        setSaveError(result.error ?? 'Failed to save filter');
      }
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bookmark className="h-4 w-4" />
            Saved Filters
            {filters.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {filters.length}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-label={isExpanded ? 'Collapse saved filters' : 'Expand saved filters'}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Saved filter list */}
          {filters.length === 0 && !isSaving && (
            <p className="text-sm text-muted-foreground">
              No saved filters yet. Save your current search to reuse it quickly.
            </p>
          )}

          {filters.length > 0 && (
            <ul className="space-y-2">
              {filters.map((filter) => (
                <li
                  key={filter.id}
                  className="flex items-center justify-between rounded-md border p-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{filter.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {buildFilterSummary(filter)}
                    </p>
                  </div>
                  <div className="ml-2 flex shrink-0 gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApply(filter)}
                      disabled={isPending}
                    >
                      Apply
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(filter.id)}
                      disabled={isPending}
                      aria-label={`Delete filter "${filter.name}"`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Save current filter form */}
          {isSaving ? (
            <div className="space-y-2">
              <Label htmlFor="filter-name">Filter name</Label>
              <div className="flex gap-2">
                <Input
                  id="filter-name"
                  placeholder="e.g. Europe Business Weekends"
                  value={filterName}
                  onChange={(e) => {
                    setFilterName(e.target.value);
                    setSaveError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') setIsSaving(false);
                  }}
                  maxLength={60}
                  autoFocus
                />
                <Button onClick={handleSave} disabled={isPending} size="sm">
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsSaving(false);
                    setSaveError(null);
                    setFilterName('');
                  }}
                >
                  Cancel
                </Button>
              </div>
              {saveError && <p className="text-xs text-destructive">{saveError}</p>}
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSaving(true)}
              className="w-full"
            >
              <BookmarkPlus className="mr-2 h-4 w-4" />
              Save Current Search
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}
