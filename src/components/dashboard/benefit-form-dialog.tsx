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
import { addBenefit } from '@/actions/benefits';
import { Plus } from 'lucide-react';
import {
  BenefitFormFields,
  EMPTY_FORM_VALUES,
  isFormComplete,
  parseAndValidateForm,
  type BenefitFormValues,
} from './benefit-form-fields';

export function BenefitFormDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<BenefitFormValues>(EMPTY_FORM_VALUES);

  function resetForm() {
    setFormValues(EMPTY_FORM_VALUES);
    setError(null);
  }

  function handleSubmit() {
    setError(null);

    const result = parseAndValidateForm(formValues);
    if (!result.valid) {
      setError(result.error);
      return;
    }

    startTransition(async () => {
      const actionResult = await addBenefit(result.data);

      if (actionResult.success) {
        resetForm();
        setOpen(false);
      } else {
        setError(actionResult.error ?? 'Unknown error');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) resetForm(); }}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" />
        Add Benefit
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Tracked Benefit</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="space-y-4"
        >
          <BenefitFormFields values={formValues} onChange={setFormValues} />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setOpen(false); resetForm(); }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !isFormComplete(formValues)}
            >
              {isPending ? 'Adding...' : 'Add Benefit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
