// PRD F4.8: Destination card — displays cash price, miles required, and miles value rating per destination
import { MapPin, Plane, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatNumber } from '@/lib/utils/format';
import type { ExploreDestination } from '@/lib/services/explore-destinations.service';
import type { PromotionRating } from '@/lib/validators/cost-calculator.schema';

// ==================== Constants ====================

const RATING_VARIANT: Record<PromotionRating, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  EXCELLENT: 'default',
  GOOD: 'secondary',
  ACCEPTABLE: 'outline',
  AVOID: 'destructive',
};

// ==================== Helpers ====================

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

// ==================== Component ====================

interface ExploreDestinationCardProps {
  destination: ExploreDestination;
  onSelect?: (destination: ExploreDestination) => void;
}

export function ExploreDestinationCard({ destination, onSelect }: ExploreDestinationCardProps) {
  const hasCash = destination.lowestCashPrice != null;
  const hasMiles = destination.lowestMilesRequired != null;
  const hasMilesValue = destination.bestMilesValuePerK != null && destination.bestMilesRating != null;

  return (
    <Card
      className={onSelect ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}
      onClick={onSelect ? () => onSelect(destination) : undefined}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header: destination + dates */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
              <MapPin className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{destination.destinationLabel}</p>
              <p className="text-sm text-muted-foreground">
                {formatShortDate(destination.departureDate)} → {formatShortDate(destination.returnDate)}
              </p>
            </div>
          </div>

          {/* Miles value badge */}
          {hasMilesValue && (
            <Badge
              variant={RATING_VARIANT[destination.bestMilesRating!]}
              className="shrink-0 text-xs"
            >
              {destination.bestMilesRating}
            </Badge>
          )}
        </div>

        <Separator />

        {/* Pricing row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Cash price */}
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Cash from</p>
              {hasCash ? (
                <p className="font-semibold text-sm">{formatCurrency(destination.lowestCashPrice!)}</p>
              ) : (
                <p className="text-sm text-muted-foreground">N/A</p>
              )}
            </div>
          </div>

          {/* Miles */}
          <div className="flex items-center gap-2">
            <Plane className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Miles from</p>
              {hasMiles ? (
                <p className="font-semibold text-sm">{formatNumber(destination.lowestMilesRequired!)} mi</p>
              ) : (
                <p className="text-sm text-muted-foreground">N/A</p>
              )}
            </div>
          </div>
        </div>

        {/* Miles value per K */}
        {hasMilesValue && (
          <p className="text-xs text-muted-foreground">
            Miles value:{' '}
            <span className="font-semibold text-foreground">
              R${destination.bestMilesValuePerK!.toFixed(2)}/k
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
