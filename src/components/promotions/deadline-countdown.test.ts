import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computeTimeRemaining, formatTimeRemaining } from './deadline-utils';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-03-21T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('computeTimeRemaining', () => {
  it('should return expired when deadline is in the past', () => {
    const deadline = new Date('2026-03-20T12:00:00Z');
    const result = computeTimeRemaining(deadline);

    expect(result.isExpired).toBe(true);
    expect(result.days).toBe(0);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
  });

  it('should calculate days remaining correctly', () => {
    const deadline = new Date('2026-03-24T12:00:00Z');
    const result = computeTimeRemaining(deadline);

    expect(result.days).toBe(3);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
    expect(result.isExpired).toBe(false);
  });

  it('should calculate hours and minutes correctly', () => {
    const deadline = new Date('2026-03-21T15:30:00Z');
    const result = computeTimeRemaining(deadline);

    expect(result.days).toBe(0);
    expect(result.hours).toBe(3);
    expect(result.minutes).toBe(30);
    expect(result.isExpired).toBe(false);
  });

  it('should mark as urgent when less than 1 day remains', () => {
    const deadline = new Date('2026-03-21T20:00:00Z');
    const result = computeTimeRemaining(deadline);

    expect(result.isUrgent).toBe(true);
    expect(result.days).toBe(0);
  });

  it('should not mark as urgent when days remain', () => {
    const deadline = new Date('2026-03-23T12:00:00Z');
    const result = computeTimeRemaining(deadline);

    expect(result.isUrgent).toBe(false);
    expect(result.days).toBe(2);
  });

  it('should handle deadline at exact current time as expired', () => {
    const deadline = new Date('2026-03-21T12:00:00Z');
    const result = computeTimeRemaining(deadline);

    expect(result.isExpired).toBe(true);
  });

  it('should handle minutes only remaining', () => {
    const deadline = new Date('2026-03-21T12:45:00Z');
    const result = computeTimeRemaining(deadline);

    expect(result.days).toBe(0);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(45);
    expect(result.isUrgent).toBe(true);
  });
});

describe('formatTimeRemaining', () => {
  it('should return Expired for expired deadlines', () => {
    const result = formatTimeRemaining({ days: 0, hours: 0, minutes: 0, isExpired: true, isUrgent: false });
    expect(result).toBe('Expired');
  });

  it('should format days and hours', () => {
    const result = formatTimeRemaining({ days: 3, hours: 5, minutes: 30, isExpired: false, isUrgent: false });
    expect(result).toBe('3d 5h remaining');
  });

  it('should format hours and minutes when no days', () => {
    const result = formatTimeRemaining({ days: 0, hours: 5, minutes: 30, isExpired: false, isUrgent: true });
    expect(result).toBe('5h 30m remaining');
  });

  it('should format minutes only when no hours', () => {
    const result = formatTimeRemaining({ days: 0, hours: 0, minutes: 45, isExpired: false, isUrgent: true });
    expect(result).toBe('45m remaining');
  });

  it('should show 0m when just expired but not yet marked as expired', () => {
    const result = formatTimeRemaining({ days: 0, hours: 0, minutes: 0, isExpired: false, isUrgent: true });
    expect(result).toBe('0m remaining');
  });
});
