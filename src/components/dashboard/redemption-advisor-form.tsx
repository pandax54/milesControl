'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plane } from 'lucide-react';
import { computeRedemptionAdvisorAction } from '@/actions/calculator';
import type { RedemptionAdvisorResult } from '@/lib/services/cost-calculator.service';
import type { PromotionRating } from '@/lib/validators/cost-calculator.schema';
import { formatCurrency, formatNumber } from '@/lib/utils/format';

const AIRLINE_PROGRAMS = ['Smiles', 'Latam Pass', 'Azul Fidelidade'] as const;

interface RedemptionFormValues {
  cashPriceBRL: string;
  milesRequired: string;
  taxesBRL: string;
  program: string;
  userAvgCostPerMilheiro: string;
}

const EMPTY_FORM: RedemptionFormValues = {
  cashPriceBRL: '',
  milesRequired: '',
  taxesBRL: '0',
  program: '',
  userAvgCostPerMilheiro: '',
};

const RATING_VARIANTS: Record<PromotionRating, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  EXCELLENT: 'default',
  GOOD: 'secondary',
  ACCEPTABLE: 'outline',
  AVOID: 'destructive',
};

const RATING_LABELS: Record<PromotionRating, string> = {
  EXCELLENT: 'Excellent (> R$60/k)',
  GOOD: 'Good (R$30–60/k)',
  ACCEPTABLE: 'Acceptable (R$15–30/k)',
  AVOID: 'Avoid (< R$15/k)',
};

interface PresetFlight {
  readonly name: string;
  readonly values: Omit<RedemptionFormValues, 'userAvgCostPerMilheiro'>;
}

const PRESET_FLIGHTS: readonly PresetFlight[] = [
  {
    name: 'GRU→MIA Economy',
    values: { cashPriceBRL: '3500', milesRequired: '35000', taxesBRL: '120', program: 'Smiles' },
  },
  {
    name: 'GRU→LIS Business',
    values: { cashPriceBRL: '18000', milesRequired: '90000', taxesBRL: '850', program: 'Smiles' },
  },
  {
    name: 'GRU→EZE Economy',
    values: { cashPriceBRL: '1200', milesRequired: '15000', taxesBRL: '80', program: 'Latam Pass' },
  },
  {
    name: 'VCP→SSA Economy',
    values: { cashPriceBRL: '800', milesRequired: '10000', taxesBRL: '35', program: 'Azul Fidelidade' },
  },
] as const;

export function RedemptionAdvisorForm() {
  const [form, setForm] = useState<RedemptionFormValues>(EMPTY_FORM);
  const [result, setResult] = useState<RedemptionAdvisorResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateField(field: keyof RedemptionFormValues, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handlePreset(preset: PresetFlight) {
    setForm((prev) => ({
      ...preset.values,
      userAvgCostPerMilheiro: prev.userAvgCostPerMilheiro,
    }));
    setResult(null);
    setError(null);
  }

  function handleCalculate() {
    setError(null);
    startTransition(async () => {
      const input = {
        cashPriceBRL: Number(form.cashPriceBRL),
        milesRequired: Math.round(Number(form.milesRequired)),
        taxesBRL: Number(form.taxesBRL) || 0,
        program: form.program,
        ...(form.userAvgCostPerMilheiro
          ? { userAvgCostPerMilheiro: Number(form.userAvgCostPerMilheiro) }
          : {}),
      };

      const response = await computeRedemptionAdvisorAction(input);
      if (response.success && response.data) {
        setResult(response.data);
      } else {
        setError(response.error ?? 'Calculation failed');
        setResult(null);
      }
    });
  }

  function handleReset() {
    setForm(EMPTY_FORM);
    setResult(null);
    setError(null);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Miles Value Advisor</CardTitle>
          <CardDescription>
            Should you use miles or pay cash? Enter the flight details and we&apos;ll calculate the redemption value based on your personal cost history.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Example Flights</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_FLIGHTS.map((preset) => (
                <Button
                  key={preset.name}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreset(preset)}
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cashPriceBRL">Cash Price (R$)</Label>
              <Input
                id="cashPriceBRL"
                type="number"
                min="0"
                step="100"
                placeholder="3500"
                value={form.cashPriceBRL}
                onChange={(e) => updateField('cashPriceBRL', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Full cash price for this flight</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="milesRequired">Miles Required</Label>
              <Input
                id="milesRequired"
                type="number"
                min="1"
                step="1000"
                placeholder="35000"
                value={form.milesRequired}
                onChange={(e) => updateField('milesRequired', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxesBRL">Taxes & Fees (R$)</Label>
              <Input
                id="taxesBRL"
                type="number"
                min="0"
                step="10"
                placeholder="120"
                value={form.taxesBRL}
                onChange={(e) => updateField('taxesBRL', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Taxes when booking with miles</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="program">Program</Label>
              <Select
                value={form.program}
                onValueChange={(value) => updateField('program', value ?? '')}
              >
                <SelectTrigger id="program">
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  {AIRLINE_PROGRAMS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="userAvgCostPerMilheiro">Your Avg Cost per Milheiro (R$)</Label>
              <Input
                id="userAvgCostPerMilheiro"
                type="number"
                min="0"
                step="0.5"
                placeholder="Auto-calculated from your transfer history"
                value={form.userAvgCostPerMilheiro}
                onChange={(e) => updateField('userAvgCostPerMilheiro', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to use your actual transfer history average. Falls back to market average (R$15/k) if no history.
              </p>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex gap-2">
            <Button onClick={handleCalculate} disabled={isPending}>
              <Plane className="mr-2 h-4 w-4" />
              {isPending ? 'Analyzing...' : 'Analyze Redemption'}
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && <RedemptionAdvisorResultCard result={result} />}
    </div>
  );
}

interface RedemptionAdvisorResultCardProps {
  result: RedemptionAdvisorResult;
}

export function RedemptionAdvisorResultCard({ result }: RedemptionAdvisorResultCardProps) {
  const isSavings = result.cashSavings > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Redemption Analysis</span>
          <Badge variant={RATING_VARIANTS[result.rating]}>
            {result.rating}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className={`text-sm font-medium ${isSavings ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {result.recommendation}
        </p>

        <Separator />

        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-muted-foreground">Redemption Value</dt>
            <dd className="text-2xl font-bold">
              R${result.milesValuePerK.toFixed(2)}/k
            </dd>
            <dd className="text-xs text-muted-foreground">
              {RATING_LABELS[result.rating]}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Your Cost Basis</dt>
            <dd className="text-2xl font-bold">
              R${result.userAvgCostPerMilheiro.toFixed(2)}/k
            </dd>
            <dd className="text-xs text-muted-foreground">
              {result.isUsingPersonalData ? 'From your transfer history' : 'Market average (no history)'}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Equivalent Cash Cost</dt>
            <dd className="text-lg font-semibold">
              {formatCurrency(result.equivalentCashCost)}
            </dd>
            <dd className="text-xs text-muted-foreground">
              What you &quot;paid&quot; for these miles
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">
              {isSavings ? 'You Save' : 'Extra Cost'}
            </dt>
            <dd className={`text-lg font-semibold ${isSavings ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(Math.abs(result.cashSavings))}
            </dd>
            <dd className="text-xs text-muted-foreground">
              {isSavings ? 'By using miles instead of cash' : 'More than paying cash'}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

interface CompactRedemptionResultProps {
  milesValuePerK: number;
  rating: PromotionRating;
  recommendation: string;
}

export function CompactRedemptionResult({ milesValuePerK, rating, recommendation }: CompactRedemptionResultProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">R${milesValuePerK.toFixed(2)}/k</span>
        <Badge variant={RATING_VARIANTS[rating]} className="text-xs">
          {rating}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">{recommendation}</p>
    </div>
  );
}
