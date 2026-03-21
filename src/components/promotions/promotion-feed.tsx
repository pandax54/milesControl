'use client';

import { useState, useMemo, useTransition } from 'react';
import { Megaphone } from 'lucide-react';
import { PromotionCard } from './promotion-card';
import { PromotionFilters } from './promotion-filters';
import { fetchPromotionsAction } from '@/actions/promotions';
import { matchPromotions } from '@/lib/services/promo-matcher.service';
import type { EnrollmentSummary } from '@/lib/services/promo-matcher.service';
import type { PromotionWithPrograms } from '@/lib/services/promotion.service';
import type { PromotionFeedFilter } from '@/lib/validators/promotion-feed.schema';

interface PromotionFeedProps {
  initialPromotions: PromotionWithPrograms[];
  programs: Array<{ id: string; name: string }>;
  enrollments?: EnrollmentSummary[];
}

const DEFAULT_FILTERS: PromotionFeedFilter = {
  status: 'ACTIVE',
  sortBy: 'detectedAt',
  sortOrder: 'desc',
};

const EMPTY_ENROLLMENTS: EnrollmentSummary[] = [];

export function PromotionFeed({ initialPromotions, programs, enrollments = EMPTY_ENROLLMENTS }: PromotionFeedProps) {
  const [promotions, setPromotions] = useState(initialPromotions);
  const [filters, setFilters] = useState<PromotionFeedFilter>(DEFAULT_FILTERS);
  const [isPending, startTransition] = useTransition();

  const promoMatches = useMemo(
    () => matchPromotions(promotions, enrollments),
    [promotions, enrollments],
  );

  function handleFilterChange(newFilters: PromotionFeedFilter) {
    setFilters(newFilters);
    startTransition(async () => {
      const result = await fetchPromotionsAction(newFilters);
      if (result.success && result.data) {
        setPromotions(result.data);
      }
    });
  }

  return (
    <div className="space-y-4">
      <PromotionFilters
        filters={filters}
        programs={programs}
        onFilterChange={handleFilterChange}
        isLoading={isPending}
      />

      {isPending && (
        <div className="text-sm text-muted-foreground">Loading promotions...</div>
      )}

      {!isPending && promotions.length === 0 && (
        <EmptyState hasFilters={!!filters.type || !!filters.programId || filters.status !== DEFAULT_FILTERS.status} />
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {promotions.map((promo) => (
          <PromotionCard
            key={promo.id}
            promotion={promo}
            match={promoMatches.get(promo.id)}
          />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold">No promotions found</h3>
      <p className="text-sm text-muted-foreground mt-1">
        {hasFilters
          ? 'Try adjusting your filters to see more results.'
          : 'No active promotions at the moment. Check back soon!'}
      </p>
    </div>
  );
}
