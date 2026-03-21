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
import { editBenefit } from '@/actions/benefits';
import { Pencil } from 'lucide-react';
import type { BenefitData } from './benefit-card';
import {
  BenefitFormFields,
  isFormComplete,
  parseAndValidateForm,
  type BenefitFormValues,
} from './benefit-form-fields';

interface EditBenefitDialogProps {
  benefit: BenefitData;
}

function buildFormValues(benefit: BenefitData): BenefitFormValues {
  return {
    type: benefit.type,
    programOrCard: benefit.programOrCard,
    description: benefit.description,
    quantity: benefit.quantity.toString(),
    expirationDate: benefit.expirationDate
      ? new Date(benefit.expirationDate).toISOString().split('T')[0]
      : '',
    notes: benefit.notes ?? '',
  };
}

export function EditBenefitDialog({ benefit }: EditBenefitDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<BenefitFormValues>(() => buildFormValues(benefit));

  function handleOpenChange(value: boolean) {
    setOpen(value);
    if (value) {
      setFormValues(buildFormValues(benefit));
      setError(null);
    }
  }

  function handleSubmit() {
    setError(null);

    const result = parseAndValidateForm(formValues);
    if (!result.valid) {
      setError(result.error);
      return;
    }

    startTransition(async () => {
      const actionResult = await editBenefit({
        benefitId: benefit.id,
        ...result.data,
      });

      if (actionResult.success) {
        setOpen(false);
      } else {
        setError(actionResult.error ?? 'Unknown error');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="ghost" size="icon" />}>
        <Pencil className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Benefit</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="space-y-4"
        >
          <BenefitFormFields values={formValues} onChange={setFormValues} idPrefix="edit-" />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !isFormComplete(formValues)}
            >
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
