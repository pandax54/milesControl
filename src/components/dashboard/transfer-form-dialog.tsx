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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { logTransfer } from '@/actions/transfers';
import { Plus } from 'lucide-react';

interface ProgramOption {
  name: string;
  type: string;
}

interface TransferFormDialogProps {
  programs: ProgramOption[];
}

export function TransferFormDialog({ programs }: TransferFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sourceProgramName, setSourceProgramName] = useState('');
  const [destProgramName, setDestProgramName] = useState('');
  const [pointsTransferred, setPointsTransferred] = useState('');
  const [bonusPercent, setBonusPercent] = useState('0');
  const [milesReceived, setMilesReceived] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [notes, setNotes] = useState('');
  const [transferDate, setTransferDate] = useState(
    new Date().toISOString().split('T')[0],
  );

  function resetForm() {
    setSourceProgramName('');
    setDestProgramName('');
    setPointsTransferred('');
    setBonusPercent('0');
    setMilesReceived('');
    setTotalCost('');
    setNotes('');
    setTransferDate(new Date().toISOString().split('T')[0]);
    setError(null);
  }

  function handleSubmit() {
    setError(null);

    const points = parseInt(pointsTransferred, 10);
    if (Number.isNaN(points) || points < 1) {
      setError('Points transferred must be a positive whole number');
      return;
    }

    const miles = parseInt(milesReceived, 10);
    if (Number.isNaN(miles) || miles < 1) {
      setError('Miles received must be a positive whole number');
      return;
    }

    const bonus = parseFloat(bonusPercent);
    if (Number.isNaN(bonus) || bonus < 0) {
      setError('Bonus percent must be non-negative');
      return;
    }

    const cost = totalCost.trim() ? parseFloat(totalCost) : null;
    if (cost !== null && (Number.isNaN(cost) || cost < 0)) {
      setError('Total cost must be non-negative');
      return;
    }

    startTransition(async () => {
      const result = await logTransfer({
        sourceProgramName,
        destProgramName,
        pointsTransferred: points,
        bonusPercent: bonus,
        milesReceived: miles,
        totalCost: cost,
        notes: notes || undefined,
        transferDate: transferDate || undefined,
      });

      if (result.success) {
        resetForm();
        setOpen(false);
      } else {
        setError(result.error ?? 'Unknown error');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) resetForm(); }}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" />
        Log Transfer
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Transfer</DialogTitle>
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
              <Label htmlFor="sourceProgramName">Source Program</Label>
              <Select value={sourceProgramName} onValueChange={(v) => setSourceProgramName(v ?? '')}>
                <SelectTrigger id="sourceProgramName">
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((p) => (
                    <SelectItem key={`src-${p.name}`} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="destProgramName">Destination Program</Label>
              <Select value={destProgramName} onValueChange={(v) => setDestProgramName(v ?? '')}>
                <SelectTrigger id="destProgramName">
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((p) => (
                    <SelectItem key={`dst-${p.name}`} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pointsTransferred">Points Transferred</Label>
              <Input
                id="pointsTransferred"
                type="number"
                min="1"
                value={pointsTransferred}
                onChange={(e) => setPointsTransferred(e.target.value)}
                placeholder="e.g., 10000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bonusPercent">Bonus %</Label>
              <Input
                id="bonusPercent"
                type="number"
                min="0"
                step="0.1"
                value={bonusPercent}
                onChange={(e) => setBonusPercent(e.target.value)}
                placeholder="e.g., 90"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="milesReceived">Miles Received</Label>
              <Input
                id="milesReceived"
                type="number"
                min="1"
                value={milesReceived}
                onChange={(e) => setMilesReceived(e.target.value)}
                placeholder="e.g., 19000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalCost">Total Cost (R$) (optional)</Label>
              <Input
                id="totalCost"
                type="number"
                min="0"
                step="0.01"
                value={totalCost}
                onChange={(e) => setTotalCost(e.target.value)}
                placeholder="e.g., 280.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transferDate">Transfer Date</Label>
            <Input
              id="transferDate"
              type="date"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Black Friday promo transfer"
              rows={2}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setOpen(false); resetForm(); }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !sourceProgramName || !destProgramName}>
              {isPending ? 'Logging...' : 'Log Transfer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
