import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MilesCalendarEvent, PromoType } from '@/generated/prisma/client';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    milesCalendarEvent: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { prisma } from '@/lib/prisma';
import {
  listCalendarEvents,
  listUpcomingCalendarEvents,
  listEventsByMonth,
  groupEventsByMonth,
  PROMO_TYPE_LABELS,
} from './miles-calendar.service';

const mockFindMany = vi.mocked(prisma.milesCalendarEvent.findMany);

function buildMockEvent(overrides: Partial<MilesCalendarEvent> = {}): MilesCalendarEvent {
  return {
    id: 'event-1',
    title: 'Black Friday',
    description: 'Best deals of the year',
    startDate: new Date('2026-11-23'),
    endDate: new Date('2026-11-30'),
    programs: ['Smiles', 'Livelo'],
    expectedType: 'MIXED' as PromoType,
    historicalNote: '2025: up to 100% bonus',
    isRecurring: true,
    recurrenceRule: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('listCalendarEvents', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return all events ordered by startDate', async () => {
    const events = [buildMockEvent()];
    mockFindMany.mockResolvedValue(events);

    const result = await listCalendarEvents();

    expect(result).toHaveLength(1);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { startDate: 'asc' },
    });
  });

  it('should apply limit when provided', async () => {
    mockFindMany.mockResolvedValue([buildMockEvent()]);

    await listCalendarEvents({ limit: 5 });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 }),
    );
  });

  it('should filter upcoming events when upcomingOnly is true', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
    mockFindMany.mockResolvedValue([]);

    await listCalendarEvents({ upcomingOnly: true });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          startDate: expect.objectContaining({ gte: expect.any(Date) }),
        }),
      }),
    );

    vi.useRealTimers();
  });

  it('should filter by year and month', async () => {
    mockFindMany.mockResolvedValue([]);

    await listCalendarEvents({ year: 2026, month: 11 });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          startDate: {
            gte: new Date(Date.UTC(2026, 10, 1)),
            lt: new Date(Date.UTC(2026, 11, 1)),
          },
        },
      }),
    );
  });

  it('should not apply take when no limit is provided', async () => {
    mockFindMany.mockResolvedValue([]);

    await listCalendarEvents();

    expect(mockFindMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ take: expect.any(Number) }),
    );
  });
});

describe('listUpcomingCalendarEvents', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should call with upcomingOnly filter and default limit of 50', async () => {
    mockFindMany.mockResolvedValue([buildMockEvent()]);

    const result = await listUpcomingCalendarEvents();

    expect(result).toHaveLength(1);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
        where: expect.objectContaining({ startDate: expect.anything() }),
      }),
    );
  });

  it('should respect a custom limit', async () => {
    mockFindMany.mockResolvedValue([]);

    await listUpcomingCalendarEvents(10);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 }),
    );
  });
});

describe('listEventsByMonth', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should filter events for the specified year and month', async () => {
    mockFindMany.mockResolvedValue([]);

    await listEventsByMonth(2026, 9);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          startDate: {
            gte: new Date(Date.UTC(2026, 8, 1)),
            lt: new Date(Date.UTC(2026, 9, 1)),
          },
        },
      }),
    );
  });
});

describe('groupEventsByMonth', () => {
  it('should group events by year and month', () => {
    const events = [
      buildMockEvent({ id: '1', title: 'Event A', startDate: new Date('2026-11-23T00:00:00.000Z') }),
      buildMockEvent({ id: '2', title: 'Event B', startDate: new Date('2026-11-30T00:00:00.000Z') }),
      buildMockEvent({ id: '3', title: 'Event C', startDate: new Date('2026-09-01T00:00:00.000Z') }),
    ];

    const groups = groupEventsByMonth(events);

    expect(groups).toHaveLength(2);
    const septemberGroup = groups.find((g) => g.month === 9);
    const novemberGroup = groups.find((g) => g.month === 11);
    expect(septemberGroup?.events).toHaveLength(1);
    expect(novemberGroup?.events).toHaveLength(2);
  });

  it('should format month labels correctly', () => {
    const events = [buildMockEvent({ startDate: new Date('2026-03-09T00:00:00.000Z') })];

    const groups = groupEventsByMonth(events);

    expect(groups[0]?.label).toBe('March 2026');
    expect(groups[0]?.year).toBe(2026);
    expect(groups[0]?.month).toBe(3);
  });

  it('should return an empty array when no events are provided', () => {
    const groups = groupEventsByMonth([]);

    expect(groups).toHaveLength(0);
  });

  it('should preserve event order within a month group', () => {
    const events = [
      buildMockEvent({ id: '1', title: 'First', startDate: new Date('2026-11-23T00:00:00.000Z') }),
      buildMockEvent({ id: '2', title: 'Second', startDate: new Date('2026-11-30T00:00:00.000Z') }),
    ];

    const groups = groupEventsByMonth(events);

    expect(groups[0]?.events[0]?.title).toBe('First');
    expect(groups[0]?.events[1]?.title).toBe('Second');
  });
});

describe('PROMO_TYPE_LABELS', () => {
  it('should have human-readable labels for all promo types', () => {
    expect(PROMO_TYPE_LABELS.TRANSFER_BONUS).toBe('Transfer Bonus');
    expect(PROMO_TYPE_LABELS.POINT_PURCHASE).toBe('Point Purchase');
    expect(PROMO_TYPE_LABELS.CLUB_SIGNUP).toBe('Club Signup');
    expect(PROMO_TYPE_LABELS.MIXED).toBe('Mixed');
  });
});
