'use client';

import { useTransition } from 'react';
import { Plane, Trash2, Bell, BellOff, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { removeWatchlistItem, setWatchlistItemActive } from '@/actions/watchlist';
import type { WatchlistItem } from '@/lib/services/flight-watchlist.service';
import { CABIN_CLASS_LABELS, type CabinClass } from '@/lib/validators/flight-search.schema';

// ==================== Types ====================

interface WatchlistItemCardProps {
  item: WatchlistItem;
  onChanged: () => void;
}

// ==================== Component ====================

export function WatchlistItemCard({ item, onChanged }: WatchlistItemCardProps) {
  const [isPendingDelete, startDeleteTransition] = useTransition();
  const [isPendingToggle, startToggleTransition] = useTransition();

  function handleDelete() {
    startDeleteTransition(async () => {
      await removeWatchlistItem(item.id);
      onChanged();
    });
  }

  function handleToggle() {
    startToggleTransition(async () => {
      await setWatchlistItemActive(item.id, !item.isActive);
      onChanged();
    });
  }

  const cabinLabel = CABIN_CLASS_LABELS[item.cabinClass as CabinClass] ?? item.cabinClass;
  const lastChecked = item.lastCheckedAt
    ? formatRelativeTime(item.lastCheckedAt)
    : 'Never checked';

  return (
    <Card className={item.isActive ? '' : 'opacity-60'}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          {/* Route */}
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Plane className="h-5 w-5 shrink-0 text-primary" />
            <span>{item.origin}</span>
            <span className="text-muted-foreground">→</span>
            <span>{item.destination}</span>
          </div>

          {/* Status badge */}
          <Badge variant={item.isActive ? 'default' : 'secondary'}>
            {item.isActive ? 'Active' : 'Paused'}
          </Badge>
        </div>

        {/* Details */}
        <div className="mt-3 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
          <span>{cabinLabel} · {item.passengers} pax</span>

          {(item.earliestDate || item.latestDate) && (
            <span>
              {item.earliestDate ? formatDate(item.earliestDate) : '?'}
              {' – '}
              {item.latestDate ? formatDate(item.latestDate) : '?'}
            </span>
          )}

          {item.preferredProgram && (
            <span>Program: {item.preferredProgram}</span>
          )}
        </div>

        {/* Targets */}
        <div className="mt-3 flex flex-wrap gap-2">
          {item.targetMilesPrice != null && (
            <Badge variant="outline" className="font-mono">
              Miles: ≤ {item.targetMilesPrice.toLocaleString('pt-BR')}
            </Badge>
          )}
          {item.targetCashPrice != null && (
            <Badge variant="outline" className="font-mono">
              Cash: ≤ R${Number(item.targetCashPrice).toFixed(2)}
            </Badge>
          )}
        </div>

        {/* Last checked */}
        <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{lastChecked}</span>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggle}
            disabled={isPendingToggle}
          >
            {item.isActive ? (
              <>
                <BellOff className="mr-1.5 h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <Bell className="mr-1.5 h-4 w-4" />
                Resume
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isPendingDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== Helpers ====================

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - new Date(date).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return 'Checked less than 1 hour ago';
  if (diffHours === 1) return 'Checked 1 hour ago';
  if (diffHours < 24) return `Checked ${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Checked 1 day ago';
  return `Checked ${diffDays} days ago`;
}
