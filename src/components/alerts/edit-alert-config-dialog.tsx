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
import { editAlertConfig } from '@/actions/alerts';
import { Pencil } from 'lucide-react';
import {
  AlertConfigFormFields,
  isAlertConfigFormComplete,
  parseAlertConfigForm,
  type AlertConfigFormValues,
} from './alert-config-form-fields';
import type { AlertChannelValue, PromoTypeValue } from '@/lib/validators/alert-config.schema';

export interface AlertConfigData {
  id: string;
  name: string;
  isActive: boolean;
  channels: string[];
  programNames: string[];
  promoTypes: string[];
  minBonusPercent: number | null;
  maxCostPerMilheiro: string | number | null;
  telegramChatId: string | null;
}

interface EditAlertConfigDialogProps {
  alertConfig: AlertConfigData;
}

function toFormValues(config: AlertConfigData): AlertConfigFormValues {
  const maxCost = config.maxCostPerMilheiro;
  const maxCostStr = maxCost !== null && maxCost !== undefined ? String(maxCost) : '';

  return {
    name: config.name,
    channels: config.channels as AlertChannelValue[],
    programNames: config.programNames.join(', '),
    promoTypes: config.promoTypes as PromoTypeValue[],
    minBonusPercent: config.minBonusPercent != null ? String(config.minBonusPercent) : '',
    maxCostPerMilheiro: maxCostStr,
    telegramChatId: config.telegramChatId ?? '',
  };
}

export function EditAlertConfigDialog({ alertConfig }: EditAlertConfigDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<AlertConfigFormValues>(
    toFormValues(alertConfig),
  );

  function resetForm() {
    setFormValues(toFormValues(alertConfig));
    setError(null);
  }

  function handleSubmit() {
    setError(null);

    const result = parseAlertConfigForm(formValues);
    if (!result.valid) {
      setError(result.error);
      return;
    }

    startTransition(async () => {
      const actionResult = await editAlertConfig({
        alertConfigId: alertConfig.id,
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
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) resetForm();
      }}
    >
      <DialogTrigger render={<Button variant="ghost" size="icon" aria-label="Edit alert rule" />}>
        <Pencil className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Alert Rule</DialogTitle>
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
            idPrefix="edit-"
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
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
