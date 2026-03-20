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
import { addCreditCard } from '@/actions/credit-cards';
import { Plus } from 'lucide-react';
import {
  CreditCardFormFields,
  EMPTY_FORM_VALUES,
  isFormComplete,
  parseAndValidateForm,
  type CreditCardFormValues,
} from './credit-card-form-fields';

export function CreditCardFormDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<CreditCardFormValues>(EMPTY_FORM_VALUES);

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
      const actionResult = await addCreditCard({
        ...result.data,
        pointsPerDollar: result.data.pointsPerDollar ?? undefined,
        benefits: result.data.benefits ?? undefined,
      });

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
        Add Card
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Credit Card</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="space-y-4"
        >
          <CreditCardFormFields values={formValues} onChange={setFormValues} />

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
              {isPending ? 'Adding...' : 'Add Card'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
