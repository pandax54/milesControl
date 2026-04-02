import { Plane, Clock, Circle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/format';
import type { CashFlight } from '@/lib/services/flight-search.service';

// ==================== Helpers ====================

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ==================== Component ====================

interface CashFlightCardProps {
  flight: CashFlight;
}

export function CashFlightCard({ flight }: CashFlightCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Airline + route */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
              <Plane className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">{flight.airline}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{formatTime(flight.departureTime)}</span>
                <span>→</span>
                <span>{formatTime(flight.arrivalTime)}</span>
              </div>
            </div>
          </div>

          {/* Flight details */}
          <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatDuration(flight.duration)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Circle className="h-2 w-2" />
              <span>{flight.stops === 0 ? 'Nonstop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}</span>
            </div>
          </div>

          {/* Price */}
          <div className="shrink-0 text-right">
            <p className="text-xl font-bold">{formatCurrency(flight.price)}</p>
            <Badge variant="outline" className="text-xs">Cash</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
