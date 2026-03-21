import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { MilesCalendarEvent, PromoType } from '@/generated/prisma/client';

// ==================== Types ====================

export type { MilesCalendarEvent };

export interface CalendarEventFilters {
  upcomingOnly?: boolean;
  year?: number;
  month?: number; // 1-based
  limit?: number;
}

// ==================== Constants ====================

const DEFAULT_UPCOMING_LIMIT = 50;

// ==================== Queries ====================

/**
 * List miles calendar events, optionally filtered by date or time horizon.
 */
export async function listCalendarEvents(
  filters: CalendarEventFilters = {},
): Promise<MilesCalendarEvent[]> {
  const { upcomingOnly, year, month, limit } = filters;

  const where = buildWhereClause({ upcomingOnly, year, month });

  const events = await prisma.milesCalendarEvent.findMany({
    where,
    orderBy: { startDate: 'asc' },
    ...(limit != null ? { take: limit } : {}),
  });

  logger.debug({ count: events.length, filters }, 'Fetched calendar events');

  return events;
}

/**
 * Return upcoming calendar events (startDate >= today) sorted by start date.
 */
export async function listUpcomingCalendarEvents(
  limit = DEFAULT_UPCOMING_LIMIT,
): Promise<MilesCalendarEvent[]> {
  return listCalendarEvents({ upcomingOnly: true, limit });
}

/**
 * Return all events for a specific year/month combination.
 */
export async function listEventsByMonth(
  year: number,
  month: number,
): Promise<MilesCalendarEvent[]> {
  return listCalendarEvents({ year, month });
}

// ==================== Helpers ====================

function buildWhereClause(filters: {
  upcomingOnly?: boolean;
  year?: number;
  month?: number;
}) {
  const { upcomingOnly, year, month } = filters;

  if (year != null && month != null) {
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 1));
    return {
      startDate: { gte: monthStart, lt: monthEnd },
    };
  }

  if (upcomingOnly) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    return { startDate: { gte: today } };
  }

  return {};
}

// ==================== Grouping ====================

export interface EventsByMonth {
  year: number;
  month: number;
  label: string;
  events: MilesCalendarEvent[];
}

/**
 * Group a sorted list of calendar events by year+month.
 */
export function groupEventsByMonth(events: MilesCalendarEvent[]): EventsByMonth[] {
  const groups = events.reduce<Map<string, EventsByMonth>>((acc, event) => {
    const date = new Date(event.startDate);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const key = `${year}-${month}`;

    const existing = acc.get(key);

    if (existing) {
      existing.events.push(event);
    } else {
      acc.set(key, {
        year,
        month,
        label: formatMonthLabel(year, month),
        events: [event],
      });
    }

    return acc;
  }, new Map<string, EventsByMonth>());

  return Array.from(groups.values());
}

// ==================== Formatting ====================

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatMonthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export const PROMO_TYPE_LABELS: Record<PromoType, string> = {
  TRANSFER_BONUS: 'Transfer Bonus',
  POINT_PURCHASE: 'Point Purchase',
  CLUB_SIGNUP: 'Club Signup',
  MIXED: 'Mixed',
};
