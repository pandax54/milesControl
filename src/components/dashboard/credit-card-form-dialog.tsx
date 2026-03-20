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
import { addCreditCard } from '@/actions/credit-cards';
import { Plus, X } from 'lucide-react';

export function CreditCardFormDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [bankName, setBankName] = useState('');
  const [cardName, setCardName] = useState('');
  const [pointsProgram, setPointsProgram] = useState('');
  const [pointsPerReal, setPointsPerReal] = useState('');
  const [pointsPerDollar, setPointsPerDollar] = useState('');
  const [annualFee, setAnnualFee] = useState('0');
  const [isWaivedFee, setIsWaivedFee] = useState(false);
  const [benefitInput, setBenefitInput] = useState('');
  const [benefits, setBenefits] = useState<string[]>([]);

  function resetForm() {
    setBankName('');
    setCardName('');
    setPointsProgram('');
    setPointsPerReal('');
    setPointsPerDollar('');
    setAnnualFee('0');
    setIsWaivedFee(false);
    setBenefitInput('');
    setBenefits([]);
    setError(null);
  }

  function handleAddBenefit() {
    const trimmed = benefitInput.trim();
    if (trimmed && !benefits.includes(trimmed)) {
      setBenefits([...benefits, trimmed]);
      setBenefitInput('');
    }
  }

  function handleRemoveBenefit(benefit: string) {
    setBenefits(benefits.filter((b) => b !== benefit));
  }

  function handleSubmit() {
    setError(null);

    const ptsPerReal = parseFloat(pointsPerReal);
    if (Number.isNaN(ptsPerReal) || ptsPerReal <= 0) {
      setError('Points per real must be a positive number');
      return;
    }

    const ptsPerDollar = pointsPerDollar ? parseFloat(pointsPerDollar) : undefined;
    if (ptsPerDollar !== undefined && (Number.isNaN(ptsPerDollar) || ptsPerDollar <= 0)) {
      setError('Points per dollar must be a positive number');
      return;
    }

    const fee = parseFloat(annualFee);
    if (Number.isNaN(fee) || fee < 0) {
      setError('Annual fee must be a non-negative number');
      return;
    }

    startTransition(async () => {
      const result = await addCreditCard({
        bankName,
        cardName,
        pointsProgram,
        pointsPerReal: ptsPerReal,
        pointsPerDollar: ptsPerDollar,
        annualFee: fee,
        isWaivedFee,
        benefits: benefits.length > 0 ? benefits : undefined,
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank</Label>
              <Input
                id="bankName"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g., Itaú"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cardName">Card Name</Label>
              <Input
                id="cardName"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="e.g., Azul Infinite"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pointsProgram">Points Program</Label>
            <Input
              id="pointsProgram"
              value={pointsProgram}
              onChange={(e) => setPointsProgram(e.target.value)}
              placeholder="e.g., Livelo, Esfera, iupp"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pointsPerReal">Points per R$</Label>
              <Input
                id="pointsPerReal"
                type="number"
                step="0.1"
                min="0.1"
                value={pointsPerReal}
                onChange={(e) => setPointsPerReal(e.target.value)}
                placeholder="e.g., 2.0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pointsPerDollar">Points per US$ (optional)</Label>
              <Input
                id="pointsPerDollar"
                type="number"
                step="0.1"
                min="0.1"
                value={pointsPerDollar}
                onChange={(e) => setPointsPerDollar(e.target.value)}
                placeholder="e.g., 4.0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="annualFee">Annual Fee (R$)</Label>
              <Input
                id="annualFee"
                type="number"
                step="0.01"
                min="0"
                value={annualFee}
                onChange={(e) => setAnnualFee(e.target.value)}
              />
            </div>
            <div className="flex items-end space-x-2 pb-0.5">
              <input
                id="isWaivedFee"
                type="checkbox"
                checked={isWaivedFee}
                onChange={(e) => setIsWaivedFee(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isWaivedFee">Fee waived</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Benefits</Label>
            <div className="flex gap-2">
              <Input
                value={benefitInput}
                onChange={(e) => setBenefitInput(e.target.value)}
                placeholder="e.g., Sala VIP"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddBenefit();
                  }
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddBenefit}>
                Add
              </Button>
            </div>
            {benefits.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {benefits.map((benefit) => (
                  <span
                    key={benefit}
                    className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs"
                  >
                    {benefit}
                    <button
                      type="button"
                      onClick={() => handleRemoveBenefit(benefit)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
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
            <Button
              type="submit"
              disabled={isPending || !bankName || !cardName || !pointsProgram || !pointsPerReal}
            >
              {isPending ? 'Adding...' : 'Add Card'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
