'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { quickUpdateBalance } from '@/actions/programs';
import { formatNumber } from '@/lib/utils/format';
import { Plus, Minus, Replace } from 'lucide-react';

// Kept separate so add/subtract presets can diverge independently
const QUICK_ADD_PRESETS = [1000, 5000, 10000];
const QUICK_SUBTRACT_PRESETS = [1000, 5000, 10000];

type UpdateMode = 'add' | 'subtract' | 'set';

interface QuickUpdateBalanceProps {
  enrollmentId: string;
  currentBalance: number;
  currency: string;
}

export function QuickUpdateBalance({
  enrollmentId,
  currentBalance,
  currency,
}: QuickUpdateBalanceProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<UpdateMode>('add');
  const [customAmount, setCustomAmount] = useState('');

  function handleQuickUpdate(updateMode: UpdateMode, amount: number) {
    setError(null);

    startTransition(async () => {
      const result = await quickUpdateBalance({
        enrollmentId,
        mode: updateMode,
        amount,
      });

      if (result.success) {
        setOpen(false);
        setCustomAmount('');
      } else {
        setError(result.error ?? 'Unknown error');
      }
    });
  }

  function handleCustomSubmit() {
    const num = Number(customAmount);
    if (Number.isNaN(num) || num < 0 || !Number.isInteger(num)) {
      setError('Enter a valid non-negative whole number');
      return;
    }
    handleQuickUpdate(mode, num);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={`Quick update ${currency} balance`}
        className="cursor-pointer rounded-md px-1 py-0.5 transition-colors hover:bg-accent"
      >
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">
            {formatNumber(currentBalance)}
          </span>
          <span className="text-sm text-muted-foreground">{currency}</span>
        </div>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Quick Update Balance</p>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Add</p>
            <div className="flex gap-1.5">
              {QUICK_ADD_PRESETS.map((amount) => (
                <Button
                  key={`add-${amount}`}
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleQuickUpdate('add', amount)}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  {formatNumber(amount)}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Subtract</p>
            <div className="flex gap-1.5">
              {QUICK_SUBTRACT_PRESETS.map((amount) => (
                <Button
                  key={`sub-${amount}`}
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleQuickUpdate('subtract', amount)}
                >
                  <Minus className="mr-1 h-3 w-3" />
                  {formatNumber(amount)}
                </Button>
              ))}
            </div>
          </div>

          <div className="border-t pt-3">
            <p className="mb-2 text-xs text-muted-foreground">Custom</p>
            <div className="flex gap-1.5">
              <Button
                variant={mode === 'add' ? 'default' : 'outline'}
                size="icon-sm"
                onClick={() => setMode('add')}
                title="Add"
              >
                <Plus className="h-3 w-3" />
              </Button>
              <Button
                variant={mode === 'subtract' ? 'default' : 'outline'}
                size="icon-sm"
                onClick={() => setMode('subtract')}
                title="Subtract"
              >
                <Minus className="h-3 w-3" />
              </Button>
              <Button
                variant={mode === 'set' ? 'default' : 'outline'}
                size="icon-sm"
                onClick={() => setMode('set')}
                title="Set to"
              >
                <Replace className="h-3 w-3" />
              </Button>
              <Input
                type="number"
                min="0"
                placeholder="Amount"
                value={customAmount}
                onChange={(e) => { setCustomAmount(e.target.value); setError(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCustomSubmit(); }}
                className="h-7 flex-1"
              />
              <Button
                size="sm"
                disabled={isPending || !customAmount}
                onClick={handleCustomSubmit}
              >
                {isPending ? '...' : 'Go'}
              </Button>
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
