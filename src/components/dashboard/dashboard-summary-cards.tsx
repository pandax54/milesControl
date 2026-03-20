import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plane, Wallet, RefreshCw, AlertTriangle } from 'lucide-react';
import { formatNumber } from '@/lib/utils/format';

interface DashboardSummaryCardsProps {
  totalMiles: number;
  totalPoints: number;
  activeSubscriptionCount: number;
  staleEnrollmentCount: number;
}

export function DashboardSummaryCards({
  totalMiles,
  totalPoints,
  activeSubscriptionCount,
  staleEnrollmentCount,
}: DashboardSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Miles</CardTitle>
          <Plane className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(totalMiles)}</div>
          <p className="text-xs text-muted-foreground">Across airline programs</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Points</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(totalPoints)}</div>
          <p className="text-xs text-muted-foreground">Across banking programs</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeSubscriptionCount}</div>
          <p className="text-xs text-muted-foreground">Club subscriptions</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Stale Balances</CardTitle>
          <AlertTriangle className={`h-4 w-4 ${staleEnrollmentCount > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${staleEnrollmentCount > 0 ? 'text-red-500' : ''}`}>
            {staleEnrollmentCount}
          </div>
          <p className="text-xs text-muted-foreground">Not updated in 30+ days</p>
        </CardContent>
      </Card>
    </div>
  );
}
