'use client';

import { useId, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator } from 'lucide-react';
import { calculateCostPerMilheiroAction } from '@/actions/calculator';
import { captureAnalyticsEvent } from '@/lib/analytics/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { CompactCalculatorResult } from './calculator-result-card';
import type { CostCalculation } from '@/lib/services/cost-calculator.service';
import type { CalculatorInput } from '@/lib/validators/cost-calculator.schema';

interface PromoCalculatorEmbedProps {
  defaultInput?: Partial<CalculatorInput>;
  promoLabel?: string;
  analyticsContext?: {
    readonly promotionId: string;
    readonly promotionType: string;
    readonly sourceSiteName: string;
    readonly isPersonalized: boolean;
  };
}

/**
 * Compact calculator embedded in promotion cards.
 * Pre-fills fields from promotion data (bonus %, price) and lets users tweak quantity.
 * PRD F3.5: Embed into promotion cards for one-click evaluation.
 */
export function PromoCalculatorEmbed({
  defaultInput,
  promoLabel,
  analyticsContext,
}: PromoCalculatorEmbedProps) {
  const id = useId();
  const [quantity, setQuantity] = useState(
    String(defaultInput?.quantity ?? 10000),
  );
  const [pricePerPoint, setPricePerPoint] = useState(
    String(defaultInput?.purchasePricePerPoint ?? 0.028),
  );
  const [result, setResult] = useState<CostCalculation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCalculate() {
    setError(null);
    startTransition(async () => {
      const input: CalculatorInput = {
        purchasePricePerPoint: Number(pricePerPoint),
        quantity: Math.round(Number(quantity)),
        transferBonusPercent: defaultInput?.transferBonusPercent ?? 0,
        ...(defaultInput?.clubMonthlyCost != null ? { clubMonthlyCost: defaultInput.clubMonthlyCost } : {}),
        ...(defaultInput?.clubExclusiveBonusPercent != null ? { clubExclusiveBonusPercent: defaultInput.clubExclusiveBonusPercent } : {}),
      };
      const response = await calculateCostPerMilheiroAction(input);
      if (response.success && response.data) {
        setResult(response.data);
        if (analyticsContext) {
          captureAnalyticsEvent(ANALYTICS_EVENTS.promoEngaged, {
            action: 'calculator_calculated',
            costPerMilheiro: Number(response.data.costPerMilheiro.toFixed(2)),
            isPersonalized: analyticsContext.isPersonalized,
            promotionId: analyticsContext.promotionId,
            promotionType: analyticsContext.promotionType,
            quantity: input.quantity,
            rating: response.data.rating,
            sourceSiteName: analyticsContext.sourceSiteName,
            transferBonusPercent: input.transferBonusPercent,
          });
        }
      } else {
        setError(response.error ?? 'Calculation failed');
        setResult(null);
      }
    });
  }

  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Calculator className="h-3.5 w-3.5" />
        <span>{promoLabel ?? 'Quick Calculator'}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs" htmlFor={`${id}-price`}>R$/point</Label>
          <Input
            id={`${id}-price`}
            type="number"
            step="0.001"
            min="0"
            value={pricePerPoint}
            onChange={(e) => setPricePerPoint(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs" htmlFor={`${id}-qty`}>Points</Label>
          <Input
            id={`${id}-qty`}
            type="number"
            min="1"
            step="1000"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
      <div className="flex items-center justify-between">
        <Button size="sm" onClick={handleCalculate} disabled={isPending}>
          {isPending ? 'Calculating...' : 'Calculate'}
        </Button>
        {result && (
          <CompactCalculatorResult
            costPerMilheiro={result.costPerMilheiro}
            rating={result.rating}
          />
        )}
      </div>
    </div>
  );
}
