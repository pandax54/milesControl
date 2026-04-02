import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface PublicCardSectionSkeletonProps {
  readonly cardCount?: number;
  readonly layout?: 'promotions' | 'calendar';
}

export function PublicCardSectionSkeleton({
  cardCount = 3,
  layout = 'promotions',
}: PublicCardSectionSkeletonProps) {
  const gridClassName =
    layout === 'calendar' ? 'grid gap-4 md:grid-cols-2 xl:grid-cols-3' : 'grid gap-4 lg:grid-cols-3';

  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-[32rem] max-w-full" />
      </div>
      <div className={gridClassName}>
        {Array.from({ length: cardCount }).map((_, index) => (
          <Card key={`public-section-skeleton-${layout}-${index}`}>
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
              <Skeleton className="h-5 w-56 max-w-full" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function PublicPageSkeleton() {
  return (
    <div className="space-y-14">
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div className="space-y-6">
          <Skeleton className="h-7 w-72 rounded-full" />
          <div className="space-y-4">
            <Skeleton className="h-12 w-[34rem] max-w-full" />
            <Skeleton className="h-12 w-[30rem] max-w-full" />
            <Skeleton className="h-5 w-[34rem] max-w-full" />
            <Skeleton className="h-5 w-[28rem] max-w-full" />
          </div>
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-11 w-40 rounded-md" />
            <Skeleton className="h-11 w-44 rounded-md" />
          </div>
        </div>

        <Card>
          <CardHeader className="space-y-3">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`public-feature-card-skeleton-${index}`} className="rounded-lg border p-4">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <PublicCardSectionSkeleton />
      <PublicCardSectionSkeleton layout="calendar" />

      <Card className="bg-muted/30">
        <CardContent className="flex flex-col gap-4 py-8 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-4 w-[30rem] max-w-full" />
          </div>
          <Skeleton className="h-11 w-44 rounded-md" />
        </CardContent>
      </Card>
    </div>
  );
}
