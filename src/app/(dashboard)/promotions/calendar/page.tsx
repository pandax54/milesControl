import { listCalendarEvents } from '@/lib/services/miles-calendar.service';
import { MilesCalendarView } from '@/components/promotions/miles-calendar-view';

export default async function MilesCalendarPage() {
  const events = await listCalendarEvents({ limit: 100 });

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
