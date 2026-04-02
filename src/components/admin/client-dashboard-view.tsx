import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatNumber, formatCurrency } from '@/lib/utils/format';
import type { ClientDashboardView } from '@/lib/services/client-management.service';

interface ClientDashboardViewProps {
  data: ClientDashboardView;
}

export function ClientDashboardViewPanel({ data }: ClientDashboardViewProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Miles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.totalMiles)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Points</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.totalPoints)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Programs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.enrollments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Subscriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeSubscriptions.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Program Enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            {data.enrollments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No programs enrolled.</p>
            ) : (
              <div className="space-y-2">
                {data.enrollments.map((enrollment) => (
                  <div key={enrollment.id} className="flex items-center justify-between py-1">
                    <div>
                      <div className="font-medium">{enrollment.program.name}</div>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-xs">
                          {enrollment.program.type}
                        </Badge>
                        {enrollment.tier && (
                          <Badge variant="secondary" className="text-xs">
                            {enrollment.tier}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatNumber(enrollment.currentBalance)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {enrollment.program.currency}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            {data.activeSubscriptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active subscriptions.</p>
            ) : (
              <div className="space-y-2">
                {data.activeSubscriptions.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between py-1">
                    <div>
                      <div className="font-medium">{sub.clubTier.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {sub.clubTier.program.name}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(sub.monthlyCost)}/mo</div>
                      {sub.nextBillingDate && (
                        <div className="text-xs text-muted-foreground">
                          Next: {new Date(sub.nextBillingDate).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transfers</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentTransfers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transfers yet.</p>
          ) : (
            <div className="space-y-2">
              {data.recentTransfers.map((transfer) => (
                <div key={transfer.id} className="flex items-center justify-between py-1">
                  <div>
                    <div className="font-medium">
                      {transfer.sourceProgramName} → {transfer.destProgramName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(transfer.transferDate).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatNumber(transfer.milesReceived)} miles
                    </div>
                    <div className="text-xs text-muted-foreground">
                      +{transfer.bonusPercent}% bonus
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
