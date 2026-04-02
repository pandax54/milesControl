import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function SummaryCardSkeleton() {
  return (
    <Card>
      <CardHeader className="space-y-3 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

function DashboardPanelSkeleton({ rows }: { rows: number }) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-20" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={`dashboard-panel-skeleton-${index}`} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ProgramsCardGridSkeleton({ cards }: { cards: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: cards }).map((_, index) => (
        <Card key={`program-card-skeleton-${index}`}>
          <CardHeader className="space-y-3 pb-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-11 w-full rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function DashboardPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 w-40 rounded-md" />
      </div>

      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32 rounded-md" />
            <Skeleton className="h-10 w-40 rounded-md" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SummaryCardSkeleton key={`dashboard-summary-skeleton-${index}`} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardPanelSkeleton rows={4} />
        <DashboardPanelSkeleton rows={5} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardPanelSkeleton rows={3} />
        <DashboardPanelSkeleton rows={3} />
      </div>
    </div>
  );
}

export function ProgramsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-4 w-80 max-w-full" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-6 w-32 rounded-full" />
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-10 w-48 rounded-md" />
      </div>

      <div className="space-y-8">
        <section className="space-y-4">
          <Skeleton className="h-7 w-40" />
          <ProgramsCardGridSkeleton cards={3} />
        </section>

        <section className="space-y-4">
          <Skeleton className="h-7 w-44" />
          <ProgramsCardGridSkeleton cards={3} />
        </section>

        <section className="space-y-4">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-80 max-w-full" />
          <ProgramsCardGridSkeleton cards={3} />
        </section>
      </div>
    </div>
  );
}
