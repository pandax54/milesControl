'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useBenefit } from '@/actions/benefits';
import { Check } from 'lucide-react';

interface UseBenefitButtonProps {
  benefitId: string;
  benefitDescription: string;
}

export function UseBenefitButton({ benefitId, benefitDescription }: UseBenefitButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleUse() {
    setError(null);

    startTransition(async () => {
      const result = await useBenefit(benefitId);

      if (result.success) {
        setOpen(false);
      } else {
        setError(result.error ?? 'Unknown error');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon" />}>
        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Use one unit?</DialogTitle>
          <DialogDescription>
            Mark one unit of &quot;{benefitDescription}&quot; as used. This will decrease the remaining quantity by 1.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleUse} disabled={isPending}>
            {isPending ? 'Marking...' : 'Use Benefit'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
