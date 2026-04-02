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
import { addAlertConfig } from '@/actions/alerts';
import { Plus } from 'lucide-react';
import {
  AlertConfigFormFields,
  EMPTY_FORM_VALUES,
  isAlertConfigFormComplete,
  parseAlertConfigForm,
  type AlertConfigFormValues,
} from './alert-config-form-fields';

interface AlertConfigFormDialogProps {
  readonly canUseTelegram?: boolean;
}

export function AlertConfigFormDialog({ canUseTelegram = true }: AlertConfigFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<AlertConfigFormValues>(EMPTY_FORM_VALUES);

  function resetForm() {
    setFormValues(EMPTY_FORM_VALUES);
    setError(null);
  }

  function handleSubmit() {
    setError(null);

    const result = parseAlertConfigForm(formValues, { canUseTelegram });
    if (!result.valid) {
      setError(result.error);
      return;
    }

    startTransition(async () => {
      const actionResult = await addAlertConfig(result.data);

      if (actionResult.success) {
        resetForm();
        setOpen(false);
      } else {
        setError(actionResult.error ?? 'Unknown error');
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) resetForm();
      }}
    >
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" />
        Add Alert Rule
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Alert Rule</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="space-y-4"
        >
          <AlertConfigFormFields
            values={formValues}
            onChange={setFormValues}
            canUseTelegram={canUseTelegram}
          />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !isAlertConfigFormComplete(formValues)}
            >
              {isPending ? 'Creating...' : 'Create Rule'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
