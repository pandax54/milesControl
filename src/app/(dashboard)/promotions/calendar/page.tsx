import { listCalendarEvents } from '@/lib/services/miles-calendar.service';
import { MilesCalendarView } from '@/components/promotions/miles-calendar-view';

const MAX_CALENDAR_PAGE_EVENTS = 100;

export default async function MilesCalendarPage() {
  const events = await listCalendarEvents({ limit: MAX_CALENDAR_PAGE_EVENTS });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Miles Calendar</h1>
        <p className="text-muted-foreground">
          Expected promotional periods based on historical patterns. Plan your purchases and transfers in advance.
        </p>
      </div>

      <MilesCalendarView events={events} />
    </div>
  );
}
