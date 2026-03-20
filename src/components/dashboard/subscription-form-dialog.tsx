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
import { addSubscription } from '@/actions/subscriptions';
import { Plus, Trash2 } from 'lucide-react';
import type { AccrualPhase } from '@/lib/validators/subscription.schema';

interface ClubTier {
  id: string;
  name: string;
  monthlyPrice: string | number | { toString(): string };
  baseMonthlyMiles: number;
  minimumStayMonths: number;
  program: {
    id: string;
    name: string;
    type: string;
  };
}

interface SubscriptionFormDialogProps {
  clubTiers: ClubTier[];
}

const DEFAULT_PHASE: AccrualPhase = { fromMonth: 1, toMonth: null, milesPerMonth: 0 };

function groupTiersByProgram(tiers: ClubTier[]) {
  const groups: Record<string, { programName: string; tiers: ClubTier[] }> = {};
  for (const tier of tiers) {
    if (!groups[tier.program.id]) {
      groups[tier.program.id] = { programName: tier.program.name, tiers: [] };
    }
    groups[tier.program.id].tiers.push(tier);
  }
  return Object.values(groups);
}

function formatCurrency(value: string | number | { toString(): string }): string {
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}

export function SubscriptionFormDialog({ clubTiers }: SubscriptionFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [clubTierId, setClubTierId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [monthlyCost, setMonthlyCost] = useState('');
  const [nextBillingDate, setNextBillingDate] = useState('');
  const [accrualPhases, setAccrualPhases] = useState<AccrualPhase[]>([{ ...DEFAULT_PHASE }]);

  const selectedTier = clubTiers.find((t) => t.id === clubTierId);
  const programGroups = groupTiersByProgram(clubTiers);

  function resetForm() {
    setClubTierId('');
    setStartDate('');
    setMonthlyCost('');
    setNextBillingDate('');
    setAccrualPhases([{ ...DEFAULT_PHASE }]);
    setError(null);
  }

  function handleTierChange(tierId: string) {
    setClubTierId(tierId);
    const tier = clubTiers.find((t) => t.id === tierId);
    if (tier) {
      const price = typeof tier.monthlyPrice === 'number'
        ? tier.monthlyPrice
        : parseFloat(String(tier.monthlyPrice));
      setMonthlyCost(String(price));
      setAccrualPhases([{ fromMonth: 1, toMonth: null, milesPerMonth: tier.baseMonthlyMiles }]);
    }
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
      const result = await addSubscription({
        clubTierId,
        startDate,
        monthlyCost: cost,
        accrualSchedule: accrualPhases,
        nextBillingDate: nextBillingDate || undefined,
      });

      if (result.success) {
        resetForm();
        setOpen(false);
      } else {
        setError(result.error ?? 'Unknown error');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) resetForm(); }}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" />
        Add Subscription
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Club Subscription</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="clubTierId">Club Tier</Label>
            <Select value={clubTierId} onValueChange={(value) => { if (value) handleTierChange(value); }}>
              <SelectTrigger id="clubTierId">
                <SelectValue placeholder="Select a club tier" />
              </SelectTrigger>
              <SelectContent>
                {programGroups.map((group) => (
                  <div key={group.programName}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      {group.programName}
                    </div>
                    {group.tiers.map((tier) => (
                      <SelectItem key={tier.id} value={tier.id}>
                        {tier.name} — {formatCurrency(tier.monthlyPrice)}/mês
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
            {selectedTier && selectedTier.minimumStayMonths > 0 && (
              <p className="text-xs text-muted-foreground">
                Minimum stay: {selectedTier.minimumStayMonths} months
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextBillingDate">Next Billing Date</Label>
              <Input
                id="nextBillingDate"
                type="date"
                value={nextBillingDate}
                onChange={(e) => setNextBillingDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthlyCost">Monthly Cost (R$)</Label>
            <Input
              id="monthlyCost"
              type="number"
              step="0.01"
              min="0.01"
              value={monthlyCost}
              onChange={(e) => setMonthlyCost(e.target.value)}
              placeholder="e.g., 73.80"
              required
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Accrual Schedule</Label>
              <Button type="button" variant="outline" size="sm" onClick={addPhase}>
                <Plus className="mr-1 h-3 w-3" />
                Add Phase
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Define how many miles you receive each month. Add phases for variable schedules
              (e.g., first 6 months at 2,000/month, then 1,000/month).
            </p>
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
            <Button type="submit" disabled={isPending || !clubTierId || !startDate}>
              {isPending ? 'Creating...' : 'Create Subscription'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
