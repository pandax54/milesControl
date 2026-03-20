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
import { editCreditCard } from '@/actions/credit-cards';
import { Pencil } from 'lucide-react';
import type { CreditCardData } from './credit-card-card';
import {
  CreditCardFormFields,
  isFormComplete,
  parseAndValidateForm,
  type CreditCardFormValues,
} from './credit-card-form-fields';

interface EditCreditCardDialogProps {
  card: CreditCardData;
}

function buildFormValues(card: CreditCardData): CreditCardFormValues {
  return {
    bankName: card.bankName,
    cardName: card.cardName,
    pointsProgram: card.pointsProgram,
    pointsPerReal: card.pointsPerReal.toString(),
    pointsPerDollar: card.pointsPerDollar?.toString() ?? '',
    annualFee: card.annualFee.toString(),
    isWaivedFee: card.isWaivedFee,
    benefits: card.benefits ?? [],
  };
}

export function EditCreditCardDialog({ card }: EditCreditCardDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<CreditCardFormValues>(() => buildFormValues(card));

  function handleOpenChange(value: boolean) {
    setOpen(value);
    if (value) {
      setFormValues(buildFormValues(card));
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
      const actionResult = await editCreditCard({
        cardId: card.id,
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
          <DialogTitle>Edit {card.cardName}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="space-y-4"
        >
          <CreditCardFormFields values={formValues} onChange={setFormValues} idPrefix="edit-" />

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
