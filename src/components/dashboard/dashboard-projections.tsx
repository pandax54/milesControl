import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@/lib/utils/format';
import type { ProjectionSummary } from '@/lib/services/accrual-projector.service';

interface DashboardProjectionsProps {
  projection: ProjectionSummary;
}

export function DashboardProjections({ projection }: DashboardProjectionsProps) {
  const hasProjections = projection.totalProjectedMiles > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Balance Projections</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasProjections ? (
          <p className="text-sm text-muted-foreground">
            No active subscriptions. Add a club subscription to see projected balances.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">3 months</p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatNumber(projection.balanceAt3Months)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">6 months</p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatNumber(projection.balanceAt6Months)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">12 months</p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatNumber(projection.balanceAt12Months)}
                </p>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground mb-2">
                Projected accrual: +{formatNumber(projection.totalProjectedMiles)} over 12 months
              </p>
              {projection.months.length > 0 && (
                <div className="space-y-1">
                  {projection.months.slice(0, 6).map((month) => (
                    <div key={month.date.toISOString()} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {new Date(month.date).toLocaleDateString('pt-BR', {
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="tabular-nums font-medium">
                        +{formatNumber(month.milesThisMonth)}
                      </span>
                    </div>
                  ))}
                  {projection.months.length > 6 && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      +{projection.months.length - 6} more months...
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
