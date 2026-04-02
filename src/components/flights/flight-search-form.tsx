'use client';

import { useState, useTransition } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CABIN_CLASSES, CABIN_CLASS_LABELS, type CabinClass } from '@/lib/validators/flight-search.schema';
import type { FlightSearchParams } from '@/lib/validators/flight-search.schema';

// ==================== Types ====================

interface FormValues {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  passengers: string;
  cabinClass: CabinClass;
}

interface FlightSearchFormProps {
  onSearch: (params: FlightSearchParams) => void;
  isSearching: boolean;
}

// ==================== Constants ====================

const EMPTY_FORM: FormValues = {
  origin: '',
  destination: '',
  departureDate: '',
  returnDate: '',
  passengers: '1',
  cabinClass: 'ECONOMY',
};

// ==================== Component ====================

export function FlightSearchForm({ onSearch, isSearching }: FlightSearchFormProps) {
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});

  function updateField(field: keyof FormValues, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): FlightSearchParams | null {
    const newErrors: Partial<Record<keyof FormValues, string>> = {};

    const origin = form.origin.toUpperCase();
    const destination = form.destination.toUpperCase();

    if (!/^[A-Z]{3}$/.test(origin)) {
      newErrors.origin = 'Enter a 3-letter IATA code (e.g. GRU)';
    }
    if (!/^[A-Z]{3}$/.test(destination)) {
      newErrors.destination = 'Enter a 3-letter IATA code (e.g. LIS)';
    }
    if (origin === destination && origin.length === 3) {
      newErrors.destination = 'Destination must differ from origin';
    }
    if (!form.departureDate) {
      newErrors.departureDate = 'Departure date is required';
    }

    const passengers = Number(form.passengers);
    if (!Number.isInteger(passengers) || passengers < 1 || passengers > 9) {
      newErrors.passengers = 'Passengers must be between 1 and 9';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return null;
    }

    return {
      origin,
      destination,
      departureDate: form.departureDate,
      ...(form.returnDate ? { returnDate: form.returnDate } : {}),
      passengers,
      cabinClass: form.cabinClass,
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = validate();
    if (params) {
      onSearch(params);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Origin */}
        <div className="space-y-2">
          <Label htmlFor="origin">From</Label>
          <Input
            id="origin"
            placeholder="GRU"
            maxLength={3}
            value={form.origin}
            onChange={(e) => updateField('origin', e.target.value.toUpperCase())}
            className="uppercase"
          />
          {errors.origin && (
            <p className="text-xs text-destructive">{errors.origin}</p>
          )}
        </div>

        {/* Destination */}
        <div className="space-y-2">
          <Label htmlFor="destination">To</Label>
          <div className="relative">
            <ArrowRight className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="destination"
              placeholder="LIS"
              maxLength={3}
              value={form.destination}
              onChange={(e) => updateField('destination', e.target.value.toUpperCase())}
              className="pl-9 uppercase"
            />
          </div>
          {errors.destination && (
            <p className="text-xs text-destructive">{errors.destination}</p>
          )}
        </div>

        {/* Departure date */}
        <div className="space-y-2">
          <Label htmlFor="departureDate">Departure</Label>
          <Input
            id="departureDate"
            type="date"
            value={form.departureDate}
            onChange={(e) => updateField('departureDate', e.target.value)}
          />
          {errors.departureDate && (
            <p className="text-xs text-destructive">{errors.departureDate}</p>
          )}
        </div>

        {/* Return date */}
        <div className="space-y-2">
          <Label htmlFor="returnDate">Return (optional)</Label>
          <Input
            id="returnDate"
            type="date"
            value={form.returnDate}
            onChange={(e) => updateField('returnDate', e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Passengers */}
        <div className="space-y-2">
          <Label htmlFor="passengers">Passengers</Label>
          <Input
            id="passengers"
            type="number"
            min="1"
            max="9"
            value={form.passengers}
            onChange={(e) => updateField('passengers', e.target.value)}
          />
          {errors.passengers && (
            <p className="text-xs text-destructive">{errors.passengers}</p>
          )}
        </div>

        {/* Cabin class */}
        <div className="space-y-2">
          <Label htmlFor="cabinClass">Cabin Class</Label>
          <Select
            value={form.cabinClass}
            onValueChange={(value) => updateField('cabinClass', value as CabinClass)}
          >
            <SelectTrigger id="cabinClass">
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

        {/* Submit */}
        <div className="flex items-end lg:col-span-2">
          <Button type="submit" disabled={isSearching} className="w-full sm:w-auto">
            <Search className="mr-2 h-4 w-4" />
            {isSearching ? 'Searching...' : 'Search Flights'}
          </Button>
        </div>
      </div>
    </form>
  );
}
