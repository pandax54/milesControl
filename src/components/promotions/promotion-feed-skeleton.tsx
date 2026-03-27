import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface PromotionFeedSkeletonProps {
  readonly showFilters?: boolean;
  readonly cardCount?: number;
}

function PromotionCardSkeleton({ index }: { index: number }) {
  return (
    <Card data-testid="promotion-skeleton-card">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="h-5 w-56 max-w-full" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-18" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

export function PromotionFeedSkeleton({
  showFilters = true,
  cardCount = 6,
}: PromotionFeedSkeletonProps) {
  return (
    <div className="space-y-4">
      {showFilters && (
        <div data-testid="promotion-feed-skeleton-filters" className="flex flex-wrap gap-3">
          <Skeleton className="h-10 w-[140px] rounded-md" />
          <Skeleton className="h-10 w-[160px] rounded-md" />
          <Skeleton className="h-10 w-[160px] rounded-md" />
          <Skeleton className="h-10 w-[150px] rounded-md" />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cardCount }).map((_, index) => (
          <PromotionCardSkeleton key={`promotion-card-skeleton-${index}`} index={index} />
        ))}
      </div>
    </div>
  );
}

export function PromotionsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <PromotionFeedSkeleton />
    </div>
  );
}
