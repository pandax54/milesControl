import { CalendarDays, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { MilesCalendarEvent, PromoType } from '@/generated/prisma/client';
import { PROMO_TYPE_LABELS, getUtcMidnightToday } from '@/lib/services/miles-calendar.service';

// ==================== Constants ====================

const TYPE_BADGE_VARIANTS: Record<PromoType, 'default' | 'secondary' | 'outline'> = {
  TRANSFER_BONUS: 'default',
  POINT_PURCHASE: 'secondary',
  CLUB_SIGNUP: 'outline',
  MIXED: 'outline',
};

// ==================== Helpers ====================

function formatDateRange(startDate: Date, endDate: Date | null): string {
  const start = new Date(startDate);
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

  if (!endDate) {
    return formatter.format(start);
  }

  const end = new Date(endDate);
  const startMonth = start.getUTCMonth();
  const endMonth = end.getUTCMonth();

  if (startMonth === endMonth) {
    const startDay = start.getUTCDate();
    const endDay = end.getUTCDate();
    const month = start.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    return `${month} ${startDay}–${endDay}`;
  }

  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

function isEventUpcoming(startDate: Date): boolean {
  return new Date(startDate) >= getUtcMidnightToday();
}

// ==================== Component ====================

interface MilesCalendarEventCardProps {
  event: MilesCalendarEvent;
}

export function MilesCalendarEventCard({ event }: MilesCalendarEventCardProps) {
  const upcoming = isEventUpcoming(event.startDate);
  const dateRange = formatDateRange(event.startDate, event.endDate);

  return (
    <Card className={upcoming ? '' : 'opacity-60'}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">{event.title}</CardTitle>
          {event.expectedType && (
            <Badge variant={TYPE_BADGE_VARIANTS[event.expectedType]} className="shrink-0">
              {PROMO_TYPE_LABELS[event.expectedType]}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Date range */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          <span>{dateRange}</span>
          {event.isRecurring && (
            <span className="text-xs">(annual)</span>
          )}
        </div>

        {/* Programs */}
        {event.programs.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {event.programs.map((program) => (
              <Badge key={program} variant="outline" className="text-xs">
                {program}
              </Badge>
            ))}
          </div>
        )}

        {/* Description */}
        {event.description && (
          <p className="text-sm text-muted-foreground">{event.description}</p>
        )}

        {/* Historical note */}
        {event.historicalNote && (
          <div className="flex items-start gap-1.5 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{event.historicalNote}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
