import { Badge } from '@/components/ui/badge';
import type { PromotionRating } from '@/lib/validators/cost-calculator.schema';
import type { FlightMilesValue } from '@/lib/services/miles-value-comparison.service';

// ==================== Constants ====================

const RATING_VARIANT: Record<PromotionRating, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  EXCELLENT: 'default',
  GOOD: 'secondary',
  ACCEPTABLE: 'outline',
  AVOID: 'destructive',
};

// ==================== Component ====================

interface MilesValueBadgeProps {
  milesValue: FlightMilesValue;
}

/**
 * Inline badge showing pre-computed miles redemption value.
 * Always visible on each award flight card — no interaction required.
 *
 * PRD F4.4: Display "Miles value: R$X/k — [RATING]" per flight result.
 * PRD F4.10: Integrate Miles Value Advisor into every flight result card.
 */
export function MilesValueBadge({ milesValue }: MilesValueBadgeProps) {
  const formattedValue = `R$${milesValue.milesValuePerK.toFixed(2)}/k`;
  const personalNote = milesValue.isUsingPersonalData ? '' : ' (market avg)';

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground">
        Miles value:{' '}
        <span className="font-semibold text-foreground">
          {formattedValue}
        </span>
        <span className="text-xs text-muted-foreground">{personalNote}</span>
      </span>
      <Badge variant={RATING_VARIANT[milesValue.rating]} className="text-xs">
        {milesValue.rating}
      </Badge>
    </div>
  );
}
