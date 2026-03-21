import type { MilesCalendarEvent } from '@/generated/prisma/client';
import { groupEventsByMonth } from '@/lib/services/miles-calendar.service';
import { MilesCalendarEventCard } from './miles-calendar-event-card';

// ==================== Helpers ====================

function splitEventsByTimeline(events: MilesCalendarEvent[]): {
  upcoming: MilesCalendarEvent[];
  past: MilesCalendarEvent[];
} {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  return events.reduce<{ upcoming: MilesCalendarEvent[]; past: MilesCalendarEvent[] }>(
    (acc, event) => {
      if (new Date(event.startDate) >= today) {
        acc.upcoming.push(event);
      } else {
        acc.past.push(event);
      }
      return acc;
    },
    { upcoming: [], past: [] },
  );
}

// ==================== Component ====================

interface MilesCalendarViewProps {
  events: MilesCalendarEvent[];
}

export function MilesCalendarView({ events }: MilesCalendarViewProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <p className="text-lg font-medium">No calendar events found</p>
        <p className="text-sm text-muted-foreground">
          Miles calendar events will appear here as they are added.
        </p>
      </div>
    );
  }

  const { upcoming, past } = splitEventsByTimeline(events);
  const upcomingGroups = groupEventsByMonth(upcoming);
  const pastGroups = groupEventsByMonth(past).reverse();

  return (
    <div className="space-y-10">
      {upcomingGroups.length > 0 && (
        <section>
          <h2 className="mb-6 text-xl font-semibold">Upcoming</h2>
          <div className="space-y-8">
            {upcomingGroups.map((group) => (
              <MonthSection key={`${group.year}-${group.month}`} group={group} />
            ))}
          </div>
        </section>
      )}

      {pastGroups.length > 0 && (
        <section>
          <h2 className="mb-6 text-xl font-semibold text-muted-foreground">Past</h2>
          <div className="space-y-8">
            {pastGroups.map((group) => (
              <MonthSection key={`${group.year}-${group.month}`} group={group} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

interface MonthSectionProps {
  group: ReturnType<typeof groupEventsByMonth>[number];
}

function MonthSection({ group }: MonthSectionProps) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {group.label}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {group.events.map((event) => (
          <MilesCalendarEventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
