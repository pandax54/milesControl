'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { setAlertConfigActive } from '@/actions/alerts';
import { Play, Pause } from 'lucide-react';

interface ToggleAlertConfigButtonProps {
  alertConfigId: string;
  isActive: boolean;
}

export function ToggleAlertConfigButton({
  alertConfigId,
  isActive,
}: ToggleAlertConfigButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await setAlertConfigActive(alertConfigId, !isActive);
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      disabled={isPending}
      className="h-7 px-2 text-xs"
    >
      {isActive ? (
        <>
          <Pause className="h-3 w-3 mr-1" />
          Active
        </>
      ) : (
        <>
          <Play className="h-3 w-3 mr-1" />
          Paused
        </>
      )}
    </Button>
  );
}
