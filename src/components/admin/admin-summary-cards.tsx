import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Plane, Wallet, AlertTriangle } from 'lucide-react';
import { formatNumber } from '@/lib/utils/format';

interface AdminSummaryCardsProps {
  totalClients: number;
  totalMilesAggregated: number;
  totalPointsAggregated: number;
  activeSubscriptionCount: number;
  clientsWithExpiringMiles: number;
}

export function AdminSummaryCards({
  totalClients,
  totalMilesAggregated,
  totalPointsAggregated,
  activeSubscriptionCount,
  clientsWithExpiringMiles,
}: AdminSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalClients}</div>
          <p className="text-xs text-muted-foreground">Managed clients</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Miles</CardTitle>
          <Plane className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(totalMilesAggregated)}</div>
          <p className="text-xs text-muted-foreground">
            Across all clients ({activeSubscriptionCount} active subscriptions)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Points</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(totalPointsAggregated)}</div>
          <p className="text-xs text-muted-foreground">Banking programs</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Expiring Miles</CardTitle>
          <AlertTriangle
            className={`h-4 w-4 ${clientsWithExpiringMiles > 0 ? 'text-red-500' : 'text-muted-foreground'}`}
          />
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${clientsWithExpiringMiles > 0 ? 'text-red-500' : ''}`}
          >
            {clientsWithExpiringMiles}
          </div>
          <p className="text-xs text-muted-foreground">Clients with miles expiring in 30 days</p>
        </CardContent>
      </Card>
    </div>
  );
}
