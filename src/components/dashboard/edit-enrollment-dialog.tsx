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
import { editEnrollment } from '@/actions/programs';
import { Pencil } from 'lucide-react';

interface EditEnrollmentDialogProps {
  enrollment: {
    id: string;
    memberNumber: string | null;
    currentBalance: number;
    tier: string | null;
    expirationDate: Date | null;
    program: {
      name: string;
      currency: string;
    };
  };
}

export function EditEnrollmentDialog({ enrollment }: EditEnrollmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [memberNumber, setMemberNumber] = useState(enrollment.memberNumber ?? '');
  const [currentBalance, setCurrentBalance] = useState(
    enrollment.currentBalance.toString()
  );
  const [tier, setTier] = useState(enrollment.tier ?? '');
  const [expirationDate, setExpirationDate] = useState(
    enrollment.expirationDate
      ? new Date(enrollment.expirationDate).toISOString().split('T')[0]
      : ''
  );

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
      const result = await editEnrollment({
        enrollmentId: enrollment.id,
        memberNumber: memberNumber || undefined,
        currentBalance: balance,
        tier: tier || undefined,
        expirationDate: expirationDate
          ? new Date(expirationDate).toISOString()
          : null,
      });

      if (result.success) {
        setOpen(false);
      } else {
        setError(result.error ?? 'Unknown error');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon" />}>
        <Pencil className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {enrollment.program.name} Enrollment</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="edit-memberNumber">Member Number</Label>
            <Input
              id="edit-memberNumber"
              value={memberNumber}
              onChange={(e) => setMemberNumber(e.target.value)}
              placeholder="e.g., 123456789"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-currentBalance">
              Current Balance ({enrollment.program.currency})
            </Label>
            <Input
              id="edit-currentBalance"
              type="number"
              min="0"
              value={currentBalance}
              onChange={(e) => setCurrentBalance(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-tier">Tier / Status</Label>
            <Input
              id="edit-tier"
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              placeholder="e.g., Gold, Diamond"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-expirationDate">Earliest Expiration</Label>
            <Input
              id="edit-expirationDate"
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
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
