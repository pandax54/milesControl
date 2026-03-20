'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { editSubscription } from '@/actions/subscriptions';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { AccrualPhase } from '@/lib/validators/subscription.schema';

interface EditSubscriptionDialogProps {
  subscription: {
    id: string;
    status: string;
    monthlyCost: string | number | { toString(): string };
    endDate: Date | null;
    nextBillingDate: Date | null;
    accrualSchedule: unknown;
  };
}

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'EXPIRED', label: 'Expired' },
];

function parseAccrualSchedule(schedule: unknown): AccrualPhase[] {
  if (!Array.isArray(schedule) || schedule.length === 0) {
    return [{ fromMonth: 1, toMonth: null, milesPerMonth: 0 }];
  }
  return schedule as AccrualPhase[];
}

function formatDateForInput(date: Date | null): string {
  if (!date) return '';
  return new Date(date).toISOString().split('T')[0];
}

export function EditSubscriptionDialog({ subscription }: EditSubscriptionDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const initialCost = String(subscription.monthlyCost);

  const [status, setStatus] = useState(subscription.status);
  const [monthlyCost, setMonthlyCost] = useState(initialCost);
  const [endDate, setEndDate] = useState(formatDateForInput(subscription.endDate));
  const [nextBillingDate, setNextBillingDate] = useState(formatDateForInput(subscription.nextBillingDate));
  const [accrualPhases, setAccrualPhases] = useState<AccrualPhase[]>(
    parseAccrualSchedule(subscription.accrualSchedule)
  );

  function resetForm() {
    setStatus(subscription.status);
    setMonthlyCost(initialCost);
    setEndDate(formatDateForInput(subscription.endDate));
    setNextBillingDate(formatDateForInput(subscription.nextBillingDate));
    setAccrualPhases(parseAccrualSchedule(subscription.accrualSchedule));
    setError(null);
  }

  function addPhase() {
    const lastPhase = accrualPhases[accrualPhases.length - 1];
    const nextFrom = lastPhase.toMonth !== null ? lastPhase.toMonth + 1 : accrualPhases.length + 1;
    setAccrualPhases([...accrualPhases, { fromMonth: nextFrom, toMonth: null, milesPerMonth: 0 }]);
  }

  function removePhase(index: number) {
    if (accrualPhases.length <= 1) return;
    setAccrualPhases(accrualPhases.filter((_, i) => i !== index));
  }

  function updatePhase(index: number, field: keyof AccrualPhase, value: number | null) {
    setAccrualPhases(
      accrualPhases.map((phase, i) => (i === index ? { ...phase, [field]: value } : phase))
    );
  }

  function handleSubmit() {
    setError(null);

    const cost = parseFloat(monthlyCost);
    if (Number.isNaN(cost) || cost <= 0) {
      setError('Monthly cost must be a positive number');
      return;
    }

    startTransition(async () => {
      const result = await editSubscription({
        subscriptionId: subscription.id,
        status: status as 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PAUSED',
        monthlyCost: cost,
        accrualSchedule: accrualPhases,
        endDate: endDate || null,
        nextBillingDate: nextBillingDate || null,
      });

      if (result.success) {
        setOpen(false);
      } else {
        setError(result.error ?? 'Unknown error');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) resetForm(); }}>
      <DialogTrigger render={<Button variant="ghost" size="icon" />}>
        <Pencil className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Subscription</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value) => { if (value) setStatus(value); }}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="editMonthlyCost">Monthly Cost (R$)</Label>
            <Input
              id="editMonthlyCost"
              type="number"
              step="0.01"
              min="0.01"
              value={monthlyCost}
              onChange={(e) => setMonthlyCost(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editNextBillingDate">Next Billing Date</Label>
              <Input
                id="editNextBillingDate"
                type="date"
                value={nextBillingDate}
                onChange={(e) => setNextBillingDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Accrual Schedule</Label>
              <Button type="button" variant="outline" size="sm" onClick={addPhase}>
                <Plus className="mr-1 h-3 w-3" />
                Add Phase
              </Button>
            </div>
            {accrualPhases.map((phase, index) => (
              <div key={index} className="flex items-end gap-2 rounded-md border p-3">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">From Month</Label>
                  <Input
                    type="number"
                    min="1"
                    value={phase.fromMonth}
                    onChange={(e) => updatePhase(index, 'fromMonth', parseInt(e.target.value, 10) || 1)}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">To Month</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Ongoing"
                    value={phase.toMonth ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      updatePhase(index, 'toMonth', val ? parseInt(val, 10) : null);
                    }}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Miles/Month</Label>
                  <Input
                    type="number"
                    min="0"
                    value={phase.milesPerMonth}
                    onChange={(e) => updatePhase(index, 'milesPerMonth', parseInt(e.target.value, 10) || 0)}
                  />
                </div>
                {accrualPhases.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removePhase(index)}
                    className="shrink-0"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setOpen(false); resetForm(); }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
