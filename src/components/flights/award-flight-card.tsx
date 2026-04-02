'use client';

import { useState, useTransition } from 'react';
import { Plane, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatNumber } from '@/lib/utils/format';
import { computeRedemptionAdvisorAction } from '@/actions/calculator';
import { CompactRedemptionResult } from '@/components/dashboard/redemption-advisor-form';
import { MilesValueBadge } from './miles-value-badge';
import type { AwardFlight } from '@/lib/services/flight-search.service';
import type { FlightMilesValue } from '@/lib/services/miles-value-comparison.service';
import type { PromotionRating } from '@/lib/validators/cost-calculator.schema';
import type { RedemptionAdvisorResult } from '@/lib/services/cost-calculator.service';

// ==================== Types ====================

interface AwardFlightCardProps {
  flight: AwardFlight;
  /** Preloaded user avg cost from session. Passed in to avoid repeated DB calls per card. */
  userAvgCostPerMilheiro?: number;
  /** Cash price for the same route/dates — used for on-demand Miles Value Advisor. */
  cashPrice?: number;
  /** Pre-computed miles value comparison — always shown inline when available. PRD F4.10 */
  milesValue?: FlightMilesValue;
}

// ==================== Component ====================

export function AwardFlightCard({ flight, userAvgCostPerMilheiro, cashPrice, milesValue }: AwardFlightCardProps) {
  const [advisorResult, setAdvisorResult] = useState<RedemptionAdvisorResult | null>(null);
  const [showAdvisor, setShowAdvisor] = useState(false);
  const [advisorError, setAdvisorError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAnalyze() {
    if (cashPrice == null) return;

    setAdvisorError(null);
    startTransition(async () => {
      const response = await computeRedemptionAdvisorAction({
        cashPriceBRL: cashPrice,
        milesRequired: flight.milesRequired,
        taxesBRL: flight.taxes,
        program: flight.program,
        ...(userAvgCostPerMilheiro != null ? { userAvgCostPerMilheiro } : {}),
      });

      if (response.success && response.data) {
        setAdvisorResult(response.data);
        setShowAdvisor(true);
      } else {
        setAdvisorError(response.error ?? 'Analysis failed');
      }
    });
  }

  function handleToggleAdvisor() {
    if (advisorResult) {
      setShowAdvisor((prev) => !prev);
    } else {
      handleAnalyze();
    }
  }

  const ratingVariant: Record<PromotionRating, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    EXCELLENT: 'default',
    GOOD: 'secondary',
    ACCEPTABLE: 'outline',
    AVOID: 'destructive',
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-4">
          {/* Airline + program */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
              <Plane className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">{flight.airline}</p>
              <p className="text-sm text-muted-foreground">{flight.program}</p>
            </div>
          </div>

          {/* Miles + cabin */}
          <div className="shrink-0 text-right">
            <p className="text-xl font-bold">{formatNumber(flight.milesRequired)}</p>
            <p className="text-xs text-muted-foreground">miles</p>
          </div>
        </div>

        {/* Details row */}
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span>{flight.cabinClass}</span>
          <span>•</span>
          <span>Taxes: {formatCurrency(flight.taxes)}</span>
          <span>•</span>
          <span>{flight.seatsAvailable} seat{flight.seatsAvailable !== 1 ? 's' : ''} available</span>
        </div>

        {/* Pre-computed miles value comparison — always visible when cash price is available */}
        {milesValue != null && (
          <>
            <Separator />
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">
                vs cash {formatCurrency(milesValue.cashPriceBRL)}
              </span>
              <MilesValueBadge milesValue={milesValue} />
            </div>
          </>
        )}

        {/* On-demand Miles Value Advisor (expanded details) */}
        {advisorResult && showAdvisor && (
          <>
            <Separator />
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Miles Value Advisor
                </p>
                <Badge variant={ratingVariant[advisorResult.rating]} className="text-xs">
                  {advisorResult.rating}
                </Badge>
              </div>
              <CompactRedemptionResult
                milesValuePerK={advisorResult.milesValuePerK}
                rating={advisorResult.rating}
                recommendation={advisorResult.recommendation}
              />
            </div>
          </>
        )}

        {advisorError && (
          <p className="text-xs text-destructive">{advisorError}</p>
        )}

        {/* Miles Value Advisor toggle */}
        {cashPrice != null && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={handleToggleAdvisor}
            disabled={isPending}
          >
            {isPending ? (
              'Analyzing...'
            ) : advisorResult && showAdvisor ? (
              <>Hide Miles Value Advisor <ChevronUp className="ml-1 h-3 w-3" /></>
            ) : (
              <>Miles Value Advisor <ChevronDown className="ml-1 h-3 w-3" /></>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
