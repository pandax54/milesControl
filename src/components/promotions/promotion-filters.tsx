'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import {
  PROMO_STATUS_OPTIONS,
  PROMO_TYPE_OPTIONS,
  PROMO_TYPE_LABELS,
  PROMO_SORT_OPTIONS,
  PROMO_SORT_LABELS,
} from '@/lib/validators/promotion-feed.schema';
import type { PromotionFeedFilter } from '@/lib/validators/promotion-feed.schema';

const ALL_VALUE = '__all__';

interface PromotionFiltersProps {
  filters: PromotionFeedFilter;
  programs: Array<{ id: string; name: string }>;
  onFilterChange: (filters: PromotionFeedFilter) => void;
  isLoading?: boolean;
}

export function PromotionFilters({
  filters,
  programs,
  onFilterChange,
  isLoading,
}: PromotionFiltersProps) {
  function handleChange(key: 'status' | 'type' | 'programId', value: string | null) {
    const updated = { ...filters };
    if (!value || value === ALL_VALUE) {
      delete updated[key];
    } else {
      (updated as Record<string, string>)[key] = value;
    }
    onFilterChange(updated);
  }

  function handleClearAll() {
    onFilterChange({ sortBy: 'detectedAt', sortOrder: 'desc' });
  }

  const hasActiveFilters = filters.status || filters.type || filters.programId;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={filters.status ?? ALL_VALUE}
        onValueChange={(v) => handleChange('status', v)}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>All Statuses</SelectItem>
          {PROMO_STATUS_OPTIONS.map((status) => (
            <SelectItem key={status} value={status}>
              {status === 'ACTIVE' ? 'Active' : 'Expired'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.type ?? ALL_VALUE}
        onValueChange={(v) => handleChange('type', v)}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>All Types</SelectItem>
          {PROMO_TYPE_OPTIONS.map((type) => (
            <SelectItem key={type} value={type}>
              {PROMO_TYPE_LABELS[type]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {programs.length > 0 && (
        <Select
          value={filters.programId ?? ALL_VALUE}
          onValueChange={(v) => handleChange('programId', v)}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Program" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Programs</SelectItem>
            {programs.map((program) => (
              <SelectItem key={program.id} value={program.id}>
                {program.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={filters.sortBy ?? 'detectedAt'}
        onValueChange={(v: string | null) => {
          if (!v) return;
          const sortOrder = v === 'costPerMilheiro' ? 'asc' as const : 'desc' as const;
          onFilterChange({ ...filters, sortBy: v as PromotionFeedFilter['sortBy'], sortOrder });
        }}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          {PROMO_SORT_OPTIONS.map((sort) => (
            <SelectItem key={sort} value={sort}>
              {PROMO_SORT_LABELS[sort]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={handleClearAll} disabled={isLoading}>
          <X className="h-3.5 w-3.5 mr-1" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
