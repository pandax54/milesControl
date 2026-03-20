import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';
import { formatNumber, formatCurrency } from '@/lib/utils/format';
import type { TransferSummary } from '@/lib/services/dashboard.service';

interface DashboardTransfersProps {
  transfers: readonly TransferSummary[];
}

const RATING_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  EXCELLENT: 'default',
  GOOD: 'secondary',
  ACCEPTABLE: 'outline',
  AVOID: 'destructive',
};

const COST_THRESHOLD_EXCELLENT = 12;
const COST_THRESHOLD_GOOD = 16;
const COST_THRESHOLD_ACCEPTABLE = 20;

function rateTransfer(costPerMilheiro: number | null): string | null {
  if (costPerMilheiro === null) return null;
  if (costPerMilheiro < COST_THRESHOLD_EXCELLENT) return 'EXCELLENT';
  if (costPerMilheiro < COST_THRESHOLD_GOOD) return 'GOOD';
  if (costPerMilheiro < COST_THRESHOLD_ACCEPTABLE) return 'ACCEPTABLE';
  return 'AVOID';
}

export function DashboardTransfers({ transfers }: DashboardTransfersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transfers</CardTitle>
      </CardHeader>
      <CardContent>
        {transfers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No transfers logged yet. Transfers will appear here when you log them.
          </p>
        ) : (
          <div className="space-y-3">
            {transfers.map((transfer) => {
              const rating = rateTransfer(transfer.costPerMilheiro);

              return (
                <div key={transfer.id} className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{transfer.sourceProgramName}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{transfer.destProgramName}</span>
                    {transfer.bonusPercent > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        +{transfer.bonusPercent}%
                      </Badge>
                    )}
                    {rating && (
                      <Badge variant={RATING_VARIANTS[rating] ?? 'outline'} className="text-xs">
                        {rating}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    <span>{formatNumber(transfer.pointsTransferred)} pts</span>
                    <span>{formatNumber(transfer.milesReceived)} received</span>
                    {transfer.totalCost !== null && (
                      <span>{formatCurrency(transfer.totalCost)}</span>
                    )}
                    {transfer.costPerMilheiro !== null && (
                      <span>R${transfer.costPerMilheiro.toFixed(2)}/k</span>
                    )}
                    <span>
                      {new Date(transfer.transferDate).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
