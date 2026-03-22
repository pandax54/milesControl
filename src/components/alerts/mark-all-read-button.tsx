'use client';

import { useTransition } from 'react';
import { CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { markAllAsRead } from '@/actions/notifications';

export function MarkAllReadButton() {
  const [isPending, startTransition] = useTransition();

  function handleMarkAllAsRead() {
    startTransition(async () => {
      await markAllAsRead();
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleMarkAllAsRead}
      disabled={isPending}
    >
      <CheckCheck className="mr-2 h-4 w-4" />
      Mark all as read
    </Button>
  );
}
