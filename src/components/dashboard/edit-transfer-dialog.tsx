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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { editTransfer } from '@/actions/transfers';
import { Pencil } from 'lucide-react';
import type { TransferData } from '@/lib/validators/transfer.schema';
import { parseTransferFormValues } from './transfer-form-utils';

interface EditTransferDialogProps {
  transfer: TransferData;
}

export function EditTransferDialog({ transfer }: EditTransferDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function buildInitialState() {
    return {
      pointsTransferred: transfer.pointsTransferred.toString(),
      bonusPercent: transfer.bonusPercent.toString(),
      milesReceived: transfer.milesReceived.toString(),
      totalCost: transfer.totalCost !== null ? transfer.totalCost.toString() : '',
      notes: transfer.notes ?? '',
      transferDate: new Date(transfer.transferDate).toISOString().split('T')[0],
    };
  }

  const [formState, setFormState] = useState(buildInitialState);

  function handleOpen(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) {
      setFormState(buildInitialState());
      setError(null);
    }
  }

  type FormField = keyof ReturnType<typeof buildInitialState>;

  function updateField(field: FormField, value: string) {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit() {
    setError(null);

    const parsed = parseTransferFormValues(formState);

    if (!parsed.success) {
      setError(parsed.error);
      return;
    }

    const { points, miles, bonus, cost } = parsed.data;

    startTransition(async () => {
      const result = await editTransfer({
        transferId: transfer.id,
        pointsTransferred: points,
        bonusPercent: bonus,
        milesReceived: miles,
        totalCost: cost,
        notes: formState.notes || null,
        transferDate: formState.transferDate,
      });

      if (result.success) {
        setOpen(false);
      } else {
        setError(result.error ?? 'Unknown error');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon" />}>
        <Pencil className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit Transfer: {transfer.sourceProgramName} → {transfer.destProgramName}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-pointsTransferred">Points Transferred</Label>
              <Input
                id="edit-pointsTransferred"
                type="number"
                min="1"
                value={formState.pointsTransferred}
                onChange={(e) => updateField('pointsTransferred', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-bonusPercent">Bonus %</Label>
              <Input
                id="edit-bonusPercent"
                type="number"
                min="0"
                step="0.1"
                value={formState.bonusPercent}
                onChange={(e) => updateField('bonusPercent', e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-milesReceived">Miles Received</Label>
              <Input
                id="edit-milesReceived"
                type="number"
                min="1"
                value={formState.milesReceived}
                onChange={(e) => updateField('milesReceived', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-totalCost">Total Cost (R$)</Label>
              <Input
                id="edit-totalCost"
                type="number"
                min="0"
                step="0.01"
                value={formState.totalCost}
                onChange={(e) => updateField('totalCost', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-transferDate">Transfer Date</Label>
            <Input
              id="edit-transferDate"
              type="date"
              value={formState.transferDate}
              onChange={(e) => updateField('transferDate', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              value={formState.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={2}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
