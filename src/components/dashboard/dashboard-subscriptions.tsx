import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils/format';
import type { SubscriptionSummary } from '@/lib/services/dashboard.service';

interface DashboardSubscriptionsProps {
  subscriptions: readonly SubscriptionSummary[];
}

export function DashboardSubscriptions({ subscriptions }: DashboardSubscriptionsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Active Subscriptions</CardTitle>
        <Link href="/subscriptions" className="text-sm text-muted-foreground hover:underline">
          Manage
        </Link>
      </CardHeader>
      <CardContent>
        {subscriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active subscriptions.{' '}
            <Link href="/subscriptions" className="underline">
              Add one
            </Link>{' '}
            to start tracking accruals.
          </p>
        ) : (
          <div className="space-y-3">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between gap-4">
                <div className="min-w-0 space-y-0.5">
                  <p className="font-medium truncate">{sub.clubTier.name}</p>
                  <p className="text-xs text-muted-foreground">{sub.clubTier.program.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold tabular-nums">{formatCurrency(sub.monthlyCost)}<span className="text-xs text-muted-foreground font-normal">/mo</span></p>
                  {sub.nextBillingDate && (
                    <p className="text-xs text-muted-foreground">
                      Next: {new Date(sub.nextBillingDate).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
