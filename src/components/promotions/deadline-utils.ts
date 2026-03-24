const MILLISECONDS_PER_SECOND = 1000;
const MILLISECONDS_PER_MINUTE = 60 * MILLISECONDS_PER_SECOND;
const MILLISECONDS_PER_HOUR = 60 * MILLISECONDS_PER_MINUTE;
const MILLISECONDS_PER_DAY = 24 * MILLISECONDS_PER_HOUR;

export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  isExpired: boolean;
  isUrgent: boolean;
}

export function computeTimeRemaining(deadline: Date): TimeRemaining {
  const diff = deadline.getTime() - Date.now();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, isExpired: true, isUrgent: false };
  }

  const days = Math.floor(diff / MILLISECONDS_PER_DAY);
  const hours = Math.floor((diff % MILLISECONDS_PER_DAY) / MILLISECONDS_PER_HOUR);
  const minutes = Math.floor((diff % MILLISECONDS_PER_HOUR) / MILLISECONDS_PER_MINUTE);
  const isUrgent = days === 0;

  return { days, hours, minutes, isExpired: false, isUrgent };
}

export function formatTimeRemaining(time: TimeRemaining): string {
  if (time.isExpired) {
    return 'Expired';
  }

  if (time.days > 0) {
    return `${time.days}d ${time.hours}h remaining`;
  }

  if (time.hours > 0) {
    return `${time.hours}h ${time.minutes}m remaining`;
  }

  return `${time.minutes}m remaining`;
}
