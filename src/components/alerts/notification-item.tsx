'use client';

import { useTransition } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { markAsRead } from '@/actions/notifications';
import type { NotificationSummary } from '@/lib/services/notification.service';

interface NotificationItemProps {
  notification: NotificationSummary;
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const [isPending, startTransition] = useTransition();

  function handleMarkAsRead() {
    startTransition(async () => {
      await markAsRead(notification.id);
    });
  }

  const timeAgo = formatDistanceToNow(new Date(notification.sentAt), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <div
      className={cn(
        'flex items-start gap-4 rounded-lg border p-4 transition-colors',
        notification.isRead
          ? 'bg-background text-muted-foreground'
          : 'bg-muted/40 font-medium',
      )}
    >
      <div className="flex-1 min-w-0 space-y-1">
        <p className={cn('text-sm', !notification.isRead && 'font-semibold text-foreground')}>
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2">{notification.body}</p>
        <p className="text-xs text-muted-foreground">{timeAgo}</p>
      </div>

      {!notification.isRead && (
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0"
          onClick={handleMarkAsRead}
          disabled={isPending}
          aria-label="Mark as read"
        >
          <Check className="h-4 w-4" />
          <span className="sr-only">Mark as read</span>
        </Button>
      )}
    </div>
  );
}
