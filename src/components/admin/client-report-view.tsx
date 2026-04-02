'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp, Plane, Wallet, AlertTriangle, BarChart3 } from 'lucide-react';
import { formatNumber, formatCurrency } from '@/lib/utils/format';
import type { ClientReport } from '@/lib/services/client-report.service';

interface ClientReportViewProps {
  report: ClientReport;
}

function getRatingLabel(avgCost: number): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  if (avgCost < 12) return { label: 'Excellent', variant: 'default' };
  if (avgCost < 16) return { label: 'Good', variant: 'secondary' };
  if (avgCost < 20) return { label: 'Acceptable', variant: 'outline' };
  return { label: 'Avoid', variant: 'destructive' };
}

export function ClientReportView({ report }: ClientReportViewProps) {
  const hasCostData = report.avgCostPerMilheiro !== null;
  const hasSavings = report.savingsVsMarket !== null;
  const savingsPositive = hasSavings && report.savingsVsMarket! >= 0;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Miles</CardTitle>
            <Plane className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(report.totalMiles)}</div>
            <p className="text-xs text-muted-foreground">Airline programs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Points</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(report.totalPoints)}</div>
            <p className="text-xs text-muted-foreground">Banking programs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cost / 1k Miles</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {hasCostData ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">
                    {formatCurrency(report.avgCostPerMilheiro!)}
                  </div>
                  <Badge variant={getRatingLabel(report.avgCostPerMilheiro!).variant}>
                    {getRatingLabel(report.avgCostPerMilheiro!).label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Market baseline: {formatCurrency(report.marketBaselineCostPerMilheiro)}/k
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-muted-foreground">—</div>
                <p className="text-xs text-muted-foreground">No transfer history</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Savings vs Market</CardTitle>
            {hasSavings && savingsPositive ? (
              <TrendingDown className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            {hasSavings ? (
              <>
                <div
                  className={`text-2xl font-bold ${savingsPositive ? 'text-green-600' : 'text-red-500'}`}
                >
                  {savingsPositive ? '+' : ''}
                  {formatCurrency(report.savingsVsMarket!)}
                </div>
                <p className="text-xs text-muted-foreground">
                  vs R${report.marketBaselineCostPerMilheiro}/k baseline on {formatNumber(report.totalMiles)} miles
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-muted-foreground">—</div>
                <p className="text-xs text-muted-foreground">Insufficient data</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transfer stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transfer Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total transfers logged</span>
              <span className="font-medium">{report.totalTransfers}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Monthly subscription spend</span>
              <span className="font-medium">{formatCurrency(report.subscriptionMonthlySpend)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total managed (miles + points)</span>
              <span className="font-medium">{formatNumber(report.totalMilesManaged)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Upcoming Expirations</CardTitle>
            {report.upcomingExpirations.length > 0 && (
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            )}
          </CardHeader>
          <CardContent>
            {report.upcomingExpirations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No miles expiring in the next 90 days.</p>
            ) : (
              <div className="space-y-2">
                {report.upcomingExpirations.map((expiration, index) => (
                  <div
                    key={`${expiration.programName}-${index}`}
                    className="flex items-center justify-between text-sm"
                  >
                    <div>
                      <span className="font-medium">{expiration.programName}</span>
                      <span className="ml-2 text-muted-foreground">
                        {formatNumber(expiration.balance)} miles
                      </span>
                    </div>
                    <Badge
                      variant={expiration.daysUntilExpiration <= 30 ? 'destructive' : 'outline'}
                    >
                      {expiration.daysUntilExpiration}d
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Report generated at {report.reportGeneratedAt.toLocaleString('pt-BR')}
      </p>
    </div>
  );
}
