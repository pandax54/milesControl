'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import { computeTimeRemaining, formatTimeRemaining, type TimeRemaining } from './deadline-utils';

const COUNTDOWN_INTERVAL_MS = 60_000;

interface DeadlineCountdownProps {
  deadline: string | Date;
}

export function DeadlineCountdown({ deadline }: DeadlineCountdownProps) {
  const deadlineDate = deadline instanceof Date ? deadline : new Date(deadline);
  const deadlineTimestamp = useMemo(() => deadlineDate.getTime(), [deadlineDate.getTime()]);
  const [time, setTime] = useState<TimeRemaining>(() => computeTimeRemaining(deadlineDate));

  useEffect(() => {
    setTime(computeTimeRemaining(new Date(deadlineTimestamp)));

    const interval = setInterval(() => {
      setTime(computeTimeRemaining(new Date(deadlineTimestamp)));
    }, COUNTDOWN_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [deadlineTimestamp]);

  const colorClass = time.isExpired
    ? 'text-muted-foreground'
    : time.isUrgent
      ? 'text-red-600 dark:text-red-400'
      : 'text-yellow-600 dark:text-yellow-400';

  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium ${colorClass}`}>
      <Clock className="h-3 w-3" />
      <span>{formatTimeRemaining(time)}</span>
    </div>
  );
}
