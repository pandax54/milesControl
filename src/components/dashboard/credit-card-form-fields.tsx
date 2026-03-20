'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

export interface CreditCardFormValues {
  bankName: string;
  cardName: string;
  pointsProgram: string;
  pointsPerReal: string;
  pointsPerDollar: string;
  annualFee: string;
  isWaivedFee: boolean;
  benefits: string[];
}

export const EMPTY_FORM_VALUES: CreditCardFormValues = {
  bankName: '',
  cardName: '',
  pointsProgram: '',
  pointsPerReal: '',
  pointsPerDollar: '',
  annualFee: '0',
  isWaivedFee: false,
  benefits: [],
};

interface CreditCardFormFieldsProps {
  values: CreditCardFormValues;
  onChange: (values: CreditCardFormValues) => void;
  idPrefix?: string;
}

export function CreditCardFormFields({ values, onChange, idPrefix = '' }: CreditCardFormFieldsProps) {
  function handleAddBenefit(input: string) {
    const trimmed = input.trim();
    if (trimmed && !values.benefits.includes(trimmed)) {
      onChange({ ...values, benefits: [...values.benefits, trimmed] });
    }
  }

  function handleRemoveBenefit(benefit: string) {
    onChange({ ...values, benefits: values.benefits.filter((b) => b !== benefit) });
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}bankName`}>Bank</Label>
          <Input
            id={`${idPrefix}bankName`}
            value={values.bankName}
            onChange={(e) => onChange({ ...values, bankName: e.target.value })}
            placeholder="e.g., Itaú"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}cardName`}>Card Name</Label>
          <Input
            id={`${idPrefix}cardName`}
            value={values.cardName}
            onChange={(e) => onChange({ ...values, cardName: e.target.value })}
            placeholder="e.g., Azul Infinite"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}pointsProgram`}>Points Program</Label>
        <Input
          id={`${idPrefix}pointsProgram`}
          value={values.pointsProgram}
          onChange={(e) => onChange({ ...values, pointsProgram: e.target.value })}
          placeholder="e.g., Livelo, Esfera, iupp"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}pointsPerReal`}>Points per R$</Label>
          <Input
            id={`${idPrefix}pointsPerReal`}
            type="number"
            step="0.1"
            min="0.1"
            value={values.pointsPerReal}
            onChange={(e) => onChange({ ...values, pointsPerReal: e.target.value })}
            placeholder="e.g., 2.0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}pointsPerDollar`}>Points per US$ (optional)</Label>
          <Input
            id={`${idPrefix}pointsPerDollar`}
            type="number"
            step="0.1"
            min="0.1"
            value={values.pointsPerDollar}
            onChange={(e) => onChange({ ...values, pointsPerDollar: e.target.value })}
            placeholder="e.g., 4.0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}annualFee`}>Annual Fee (R$)</Label>
          <Input
            id={`${idPrefix}annualFee`}
            type="number"
            step="0.01"
            min="0"
            value={values.annualFee}
            onChange={(e) => onChange({ ...values, annualFee: e.target.value })}
          />
        </div>
        <div className="flex items-end space-x-2 pb-0.5">
          <Checkbox
            id={`${idPrefix}isWaivedFee`}
            checked={values.isWaivedFee}
            onCheckedChange={(checked) => onChange({ ...values, isWaivedFee: !!checked })}
          />
          <Label htmlFor={`${idPrefix}isWaivedFee`}>Fee waived</Label>
        </div>
      </div>

      <BenefitsField
        benefits={values.benefits}
        onAdd={handleAddBenefit}
        onRemove={handleRemoveBenefit}
      />
    </>
  );
}

interface BenefitsFieldProps {
  benefits: string[];
  onAdd: (input: string) => void;
  onRemove: (benefit: string) => void;
}

function BenefitsField({ benefits, onAdd, onRemove }: BenefitsFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleAdd() {
    if (!inputRef.current) return;
    onAdd(inputRef.current.value);
    inputRef.current.value = '';
  }

  return (
    <div className="space-y-2">
      <Label>Benefits</Label>
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          placeholder="e.g., Sala VIP"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
        >
          Add
        </Button>
      </div>
      {benefits.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {benefits.map((benefit) => (
            <span
              key={benefit}
              className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs"
            >
              {benefit}
              <button
                type="button"
                onClick={() => onRemove(benefit)}
                className="hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function parseAndValidateForm(values: CreditCardFormValues): {
  valid: true;
  data: {
    bankName: string;
    cardName: string;
    pointsProgram: string;
    pointsPerReal: number;
    pointsPerDollar: number | null | undefined;
    annualFee: number;
    isWaivedFee: boolean;
    benefits: string[] | undefined | null;
  };
} | { valid: false; error: string } {
  const ptsPerReal = parseFloat(values.pointsPerReal);
  if (Number.isNaN(ptsPerReal) || ptsPerReal <= 0) {
    return { valid: false, error: 'Points per real must be a positive number' };
  }

  const ptsPerDollar = values.pointsPerDollar ? parseFloat(values.pointsPerDollar) : null;
  if (ptsPerDollar !== null && (Number.isNaN(ptsPerDollar) || ptsPerDollar <= 0)) {
    return { valid: false, error: 'Points per dollar must be a positive number' };
  }

  const fee = parseFloat(values.annualFee);
  if (Number.isNaN(fee) || fee < 0) {
    return { valid: false, error: 'Annual fee must be a non-negative number' };
  }

  return {
    valid: true,
    data: {
      bankName: values.bankName,
      cardName: values.cardName,
      pointsProgram: values.pointsProgram,
      pointsPerReal: ptsPerReal,
      pointsPerDollar: ptsPerDollar,
      annualFee: fee,
      isWaivedFee: values.isWaivedFee,
      benefits: values.benefits.length > 0 ? values.benefits : null,
    },
  };
}

export function isFormComplete(values: CreditCardFormValues): boolean {
  return !!(values.bankName && values.cardName && values.pointsProgram && values.pointsPerReal);
}
