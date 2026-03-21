'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BENEFIT_TYPES, BENEFIT_TYPE_LABELS } from '@/lib/validators/benefit.schema';

export interface BenefitFormValues {
  type: string;
  programOrCard: string;
  description: string;
  quantity: string;
  expirationDate: string;
  notes: string;
}

export const EMPTY_FORM_VALUES: BenefitFormValues = {
  type: '',
  programOrCard: '',
  description: '',
  quantity: '1',
  expirationDate: '',
  notes: '',
};

const BENEFIT_TYPE_OPTIONS = BENEFIT_TYPES.map((value) => ({
  value,
  label: BENEFIT_TYPE_LABELS[value],
}));

interface BenefitFormFieldsProps {
  values: BenefitFormValues;
  onChange: (values: BenefitFormValues) => void;
  idPrefix?: string;
}

export function BenefitFormFields({ values, onChange, idPrefix = '' }: BenefitFormFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}type`}>Type</Label>
        <Select
          value={values.type || undefined}
          onValueChange={(value) => onChange({ ...values, type: value ?? '' })}
        >
          <SelectTrigger id={`${idPrefix}type`}>
            <SelectValue placeholder="Select benefit type" />
          </SelectTrigger>
          <SelectContent>
            {BENEFIT_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}programOrCard`}>Program / Card</Label>
          <Input
            id={`${idPrefix}programOrCard`}
            value={values.programOrCard}
            onChange={(e) => onChange({ ...values, programOrCard: e.target.value })}
            placeholder="e.g., Clube Smiles, Itaú The One"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}quantity`}>Quantity</Label>
          <Input
            id={`${idPrefix}quantity`}
            type="number"
            min="1"
            step="1"
            value={values.quantity}
            onChange={(e) => onChange({ ...values, quantity: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}description`}>Description</Label>
        <Input
          id={`${idPrefix}description`}
          value={values.description}
          onChange={(e) => onChange({ ...values, description: e.target.value })}
          placeholder="e.g., Free night at Marriott"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}expirationDate`}>Expiration Date (optional)</Label>
        <Input
          id={`${idPrefix}expirationDate`}
          type="date"
          value={values.expirationDate}
          onChange={(e) => onChange({ ...values, expirationDate: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}notes`}>Notes (optional)</Label>
        <Textarea
          id={`${idPrefix}notes`}
          value={values.notes}
          onChange={(e) => onChange({ ...values, notes: e.target.value })}
          placeholder="Any additional notes..."
          rows={2}
        />
      </div>
    </>
  );
}

export function parseAndValidateForm(values: BenefitFormValues): {
  valid: true;
  data: {
    type: 'FREE_NIGHT' | 'COMPANION_PASS' | 'UPGRADE_CREDIT' | 'LOUNGE_ACCESS' | 'TRAVEL_CREDIT' | 'OTHER';
    programOrCard: string;
    description: string;
    quantity: number;
    expirationDate: string | null;
    notes: string | undefined;
  };
} | { valid: false; error: string } {
  if (!values.type) {
    return { valid: false, error: 'Benefit type is required' };
  }

  const qty = parseInt(values.quantity, 10);
  if (Number.isNaN(qty) || qty < 1) {
    return { valid: false, error: 'Quantity must be at least 1' };
  }

  return {
    valid: true,
    data: {
      type: values.type as 'FREE_NIGHT' | 'COMPANION_PASS' | 'UPGRADE_CREDIT' | 'LOUNGE_ACCESS' | 'TRAVEL_CREDIT' | 'OTHER',
      programOrCard: values.programOrCard,
      description: values.description,
      quantity: qty,
      expirationDate: values.expirationDate || null,
      notes: values.notes || undefined,
    },
  };
}

export function isFormComplete(values: BenefitFormValues): boolean {
  return !!(values.type && values.programOrCard && values.description && values.quantity);
}
