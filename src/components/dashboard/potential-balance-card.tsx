import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { formatNumber } from '@/lib/utils/format';
import type { PotentialBalance } from '@/lib/services/potential-balance.service';

interface PotentialBalanceCardProps {
  potentialBalance: PotentialBalance;
}

export function PotentialBalanceCard({ potentialBalance }: PotentialBalanceCardProps) {
  const { targetProgramName, targetProgramCurrency, currentBalance, sources, totalPotentialMiles } = potentialBalance;
  const gainFromTransfers = totalPotentialMiles - currentBalance;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">{targetProgramName}</CardTitle>
          <Badge variant="outline" className="text-xs">
            {targetProgramCurrency}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Current balance</span>
          <span className="font-medium">{formatNumber(currentBalance)}</span>
        </div>

        <div className="space-y-1.5">
          {sources.map((source) => (
            <div key={source.programName} className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{source.programName}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium text-green-600 dark:text-green-400">
                +{formatNumber(source.potentialMiles)}
              </span>
              {source.transferRatio !== 1 && (
                <span className="text-xs text-muted-foreground">
                  ({source.transferRatio}:1)
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="border-t pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium">Potential total</span>
            </div>
            <span className="text-lg font-bold">{formatNumber(totalPotentialMiles)}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            +{formatNumber(gainFromTransfers)} from {sources.length === 1 ? '1 program' : `${sources.length} programs`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
