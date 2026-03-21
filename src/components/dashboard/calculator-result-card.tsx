'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatNumber } from '@/lib/utils/format';
import type { CostCalculation } from '@/lib/services/cost-calculator.service';
import type { PromotionRating } from '@/lib/validators/cost-calculator.schema';

const RATING_VARIANTS: Record<PromotionRating, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  EXCELLENT: 'default',
  GOOD: 'secondary',
  ACCEPTABLE: 'outline',
  AVOID: 'destructive',
};

const RATING_LABELS: Record<PromotionRating, string> = {
  EXCELLENT: 'Excellent (< R$12/k)',
  GOOD: 'Good (R$12–16/k)',
  ACCEPTABLE: 'Acceptable (R$16–20/k)',
  AVOID: 'Avoid (> R$20/k)',
};

interface CalculatorResultCardProps {
  result: CostCalculation;
  label?: string;
  highlight?: 'best' | 'worst' | null;
}

export function CalculatorResultCard({ result, label, highlight }: CalculatorResultCardProps) {
  const borderClass = highlight === 'best'
    ? 'ring-2 ring-green-500'
    : highlight === 'worst'
      ? 'ring-2 ring-red-500'
      : '';

  return (
    <Card className={borderClass}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{label ?? 'Result'}</span>
          <Badge variant={RATING_VARIANTS[result.rating]}>
            {result.rating}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-muted-foreground">Cost per Milheiro</dt>
            <dd className="text-2xl font-bold">
              R${result.costPerMilheiro.toFixed(2)}
            </dd>
            <dd className="text-xs text-muted-foreground">
              {RATING_LABELS[result.rating]}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Total Miles</dt>
            <dd className="text-2xl font-bold">{formatNumber(result.totalMiles)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Total Cost</dt>
            <dd className="text-lg font-semibold">{formatCurrency(result.totalCost)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Miles per R$1</dt>
            <dd className="text-lg font-semibold">
              {result.totalCost > 0
                ? formatNumber(Math.round(result.totalMiles / result.totalCost))
                : '—'}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

interface CompactCalculatorResultProps {
  costPerMilheiro: number;
  rating: PromotionRating;
}

export function CompactCalculatorResult({ costPerMilheiro, rating }: CompactCalculatorResultProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">R${costPerMilheiro.toFixed(2)}/k</span>
      <Badge variant={RATING_VARIANTS[rating]} className="text-xs">
        {rating}
      </Badge>
    </div>
  );
}
