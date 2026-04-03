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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { logTransfer } from '@/actions/transfers';
import { formatCurrency } from '@/lib/utils/format';
import { useTransferConversion } from '@/hooks/use-transfer-conversion';
import { Plus, Info } from 'lucide-react';
import { NetValueBadge } from './net-value-badge';
import { parseTransferFormValues } from './transfer-form-utils';

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

  const pointsNum = parseInt(pointsTransferred, 10) || 0;
  const milesNum = parseInt(milesReceived, 10) || 0;

  const {
    sourceBrl,
    destBrl,
    netValue,
    netValueType,
    sourceCpm,
    destCpm,
    isLoading: isConversionLoading,
  } = useTransferConversion(sourceProgramName, destProgramName, pointsNum, milesNum);

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

    const parsed = parseTransferFormValues({
      pointsTransferred,
      bonusPercent,
      milesReceived,
      totalCost,
    });

    if (!parsed.success) {
      setError(parsed.error);
      return;
    }

    const { points, miles, bonus, cost } = parsed.data;

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

          {sourceProgramName && destProgramName && (
            <div className="flex justify-center" data-testid="net-value-badge-container">
              <NetValueBadge netValue={netValue} netValueType={netValueType} />
            </div>
          )}

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
              <BrlValueDisplay
                brlValue={sourceBrl}
                cpm={sourceCpm}
                isLoading={isConversionLoading}
                showPlaceholder={sourceProgramName.length > 0}
                label="Source value in BRL"
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
              <BrlValueDisplay
                brlValue={destBrl}
                cpm={destCpm}
                isLoading={isConversionLoading}
                showPlaceholder={destProgramName.length > 0}
                label="Destination value in BRL"
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

interface BrlValueDisplayProps {
  brlValue: number | null;
  cpm: number | null;
  isLoading: boolean;
  showPlaceholder: boolean;
  label: string;
}

function BrlValueDisplay({ brlValue, cpm, isLoading, showPlaceholder, label }: BrlValueDisplayProps) {
  if (!showPlaceholder) {
    return null;
  }

  if (isLoading) {
    return <Skeleton className="h-4 w-20" data-testid="brl-loading" />;
  }

  if (cpm === null) {
    return (
      <Tooltip>
        <TooltipTrigger
          className="inline-flex items-center gap-1 text-xs text-muted-foreground"
          aria-label="No cost data available"
        >
          <span>Sem dados de custo</span>
          <Info className="h-3 w-3" />
        </TooltipTrigger>
        <TooltipContent>
          Registre transferências para calcular o valor em R$
        </TooltipContent>
      </Tooltip>
    );
  }

  if (brlValue === null) {
    return null;
  }

  return (
    <p className="text-sm text-muted-foreground" aria-label={label}>
      ~{formatCurrency(brlValue)}
    </p>
  );
}
