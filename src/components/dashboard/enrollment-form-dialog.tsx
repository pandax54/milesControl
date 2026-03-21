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
import { enrollInProgram } from '@/actions/programs';
import { Plus } from 'lucide-react';

interface AvailableProgram {
  id: string;
  name: string;
  type: string;
  currency: string;
}

interface EnrollmentFormDialogProps {
  availablePrograms: AvailableProgram[];
}

export function EnrollmentFormDialog({ availablePrograms }: EnrollmentFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [programId, setProgramId] = useState('');
  const [memberNumber, setMemberNumber] = useState('');
  const [currentBalance, setCurrentBalance] = useState('0');
  const [tier, setTier] = useState('');
  const [expirationDate, setExpirationDate] = useState('');

  function resetForm() {
    setProgramId('');
    setMemberNumber('');
    setCurrentBalance('0');
    setTier('');
    setExpirationDate('');
    setError(null);
  }

  function parseBalance(value: string): number | null {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed < 0) return null;
    return parsed;
  }

  function handleSubmit() {
    setError(null);

    const balance = parseBalance(currentBalance);
    if (balance === null) {
      setError('Balance must be a non-negative whole number');
      return;
    }

    startTransition(async () => {
      const result = await enrollInProgram({
        programId,
        memberNumber: memberNumber || undefined,
        currentBalance: balance,
        tier: tier || undefined,
        expirationDate: expirationDate ? new Date(expirationDate).toISOString() : undefined,
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
        Add Program
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enroll in Program</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="programId">Program</Label>
            <Select value={programId} onValueChange={(value) => setProgramId(value ?? '')}>
              <SelectTrigger id="programId">
                <SelectValue placeholder="Select a program" />
              </SelectTrigger>
              <SelectContent>
                {availablePrograms.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.name} ({program.type === 'AIRLINE' ? 'Airline' : 'Banking'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="memberNumber">Member Number (optional)</Label>
            <Input
              id="memberNumber"
              value={memberNumber}
              onChange={(e) => setMemberNumber(e.target.value)}
              placeholder="e.g., 123456789"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentBalance">Current Balance</Label>
            <Input
              id="currentBalance"
              type="number"
              min="0"
              value={currentBalance}
              onChange={(e) => setCurrentBalance(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tier">Tier / Status (optional)</Label>
            <Input
              id="tier"
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              placeholder="e.g., Gold, Diamond"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expirationDate">Earliest Expiration (optional)</Label>
            <Input
              id="expirationDate"
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
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
            <Button type="submit" disabled={isPending || !programId}>
              {isPending ? 'Enrolling...' : 'Enroll'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
