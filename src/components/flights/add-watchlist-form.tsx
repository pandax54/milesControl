'use client';

import { useState, useTransition } from 'react';
import { PlusCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CABIN_CLASSES, CABIN_CLASS_LABELS, type CabinClass } from '@/lib/validators/flight-search.schema';
import { addWatchlistItem } from '@/actions/watchlist';

// ==================== Types ====================

interface FormValues {
  origin: string;
  destination: string;
  earliestDate: string;
  latestDate: string;
  cabinClass: CabinClass;
  passengers: string;
  targetMilesPrice: string;
  targetCashPrice: string;
  preferredProgram: string;
}

interface AddWatchlistFormProps {
  onAdded: () => void;
}

// ==================== Constants ====================

const EMPTY_FORM: FormValues = {
  origin: '',
  destination: '',
  earliestDate: '',
  latestDate: '',
  cabinClass: 'ECONOMY',
  passengers: '1',
  targetMilesPrice: '',
  targetCashPrice: '',
  preferredProgram: '',
};

// ==================== Component ====================

export function AddWatchlistForm({ onAdded }: AddWatchlistFormProps) {
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues | 'target', string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateField(field: keyof FormValues, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined, target: undefined }));
    setSubmitError(null);
  }

  function validate() {
    const newErrors: Partial<Record<keyof FormValues | 'target', string>> = {};

    const origin = form.origin.trim().toUpperCase();
    const destination = form.destination.trim().toUpperCase();

    if (!/^[A-Z]{3}$/.test(origin)) {
      newErrors.origin = 'Enter a 3-letter IATA code (e.g. GRU)';
    }
    if (!/^[A-Z]{3}$/.test(destination)) {
      newErrors.destination = 'Enter a 3-letter IATA code (e.g. LIS)';
    }
    if (origin === destination && origin.length === 3) {
      newErrors.destination = 'Destination must differ from origin';
    }

    const passengers = Number(form.passengers);
    if (!Number.isInteger(passengers) || passengers < 1 || passengers > 9) {
      newErrors.passengers = 'Passengers must be between 1 and 9';
    }

    const milesTarget = form.targetMilesPrice ? Number(form.targetMilesPrice) : null;
    const cashTarget = form.targetCashPrice ? Number(form.targetCashPrice) : null;

    if (milesTarget !== null && (isNaN(milesTarget) || milesTarget < 1)) {
      newErrors.targetMilesPrice = 'Miles target must be a positive number';
    }
    if (cashTarget !== null && (isNaN(cashTarget) || cashTarget < 0)) {
      newErrors.targetCashPrice = 'Cash target must be a positive number';
    }
    if (milesTarget === null && cashTarget === null) {
      newErrors.target = 'At least one target price (miles or cash) is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return null;
    }

    return {
      origin,
      destination,
      earliestDate: form.earliestDate || undefined,
      latestDate: form.latestDate || undefined,
      cabinClass: form.cabinClass,
      passengers,
      targetMilesPrice: milesTarget ?? undefined,
      targetCashPrice: cashTarget ?? undefined,
      preferredProgram: form.preferredProgram || undefined,
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = validate();
    if (!input) return;

    startTransition(async () => {
      const result = await addWatchlistItem(input);
      if (result.success) {
        setForm(EMPTY_FORM);
        setErrors({});
        onAdded();
      } else {
        setSubmitError(result.error ?? 'Failed to add to watchlist');
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add to Watchlist</CardTitle>
        <CardDescription>
          Set a target price and we will alert you when flights on this route drop below it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Route */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="wl-origin">From</Label>
              <Input
                id="wl-origin"
                placeholder="GRU"
                maxLength={3}
                value={form.origin}
                onChange={(e) => updateField('origin', e.target.value.toUpperCase())}
                className="uppercase"
              />
              {errors.origin && <p className="text-xs text-destructive">{errors.origin}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="wl-destination">To</Label>
              <div className="relative">
                <ArrowRight className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="wl-destination"
                  placeholder="LIS"
                  maxLength={3}
                  value={form.destination}
                  onChange={(e) => updateField('destination', e.target.value.toUpperCase())}
                  className="pl-9 uppercase"
                />
              </div>
              {errors.destination && <p className="text-xs text-destructive">{errors.destination}</p>}
            </div>
          </div>

          {/* Dates */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="wl-earliest">Earliest Date (optional)</Label>
              <Input
                id="wl-earliest"
                type="date"
                value={form.earliestDate}
                onChange={(e) => updateField('earliestDate', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wl-latest">Latest Date (optional)</Label>
              <Input
                id="wl-latest"
                type="date"
                value={form.latestDate}
                onChange={(e) => updateField('latestDate', e.target.value)}
              />
            </div>
          </div>

          {/* Cabin and passengers */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="wl-cabin">Cabin Class</Label>
              <Select
                value={form.cabinClass}
                onValueChange={(value) => updateField('cabinClass', value as CabinClass)}
              >
                <SelectTrigger id="wl-cabin">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CABIN_CLASSES.map((cls) => (
                    <SelectItem key={cls} value={cls}>
                      {CABIN_CLASS_LABELS[cls]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wl-passengers">Passengers</Label>
              <Input
                id="wl-passengers"
                type="number"
                min="1"
                max="9"
                value={form.passengers}
                onChange={(e) => updateField('passengers', e.target.value)}
              />
              {errors.passengers && <p className="text-xs text-destructive">{errors.passengers}</p>}
            </div>
          </div>

          {/* Target prices */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="wl-miles">Target Miles Price</Label>
              <Input
                id="wl-miles"
                type="number"
                placeholder="50000"
                min="1"
                value={form.targetMilesPrice}
                onChange={(e) => updateField('targetMilesPrice', e.target.value)}
              />
              {errors.targetMilesPrice && (
                <p className="text-xs text-destructive">{errors.targetMilesPrice}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="wl-cash">Target Cash Price (BRL)</Label>
              <Input
                id="wl-cash"
                type="number"
                placeholder="2000"
                min="0"
                step="0.01"
                value={form.targetCashPrice}
                onChange={(e) => updateField('targetCashPrice', e.target.value)}
              />
              {errors.targetCashPrice && (
                <p className="text-xs text-destructive">{errors.targetCashPrice}</p>
              )}
            </div>
          </div>

          {/* Target error (no price set) */}
          {errors.target && (
            <p className="text-sm text-destructive">{errors.target}</p>
          )}

          {/* Preferred program */}
          <div className="space-y-2">
            <Label htmlFor="wl-program">Preferred Program (optional)</Label>
            <Input
              id="wl-program"
              placeholder="e.g. Smiles, Azul"
              value={form.preferredProgram}
              onChange={(e) => updateField('preferredProgram', e.target.value)}
            />
          </div>

          {submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}

          <Button type="submit" disabled={isPending}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {isPending ? 'Adding...' : 'Add to Watchlist'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
