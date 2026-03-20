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
import { editFamilyEnrollment } from '@/actions/family';
import { Pencil } from 'lucide-react';

interface EditFamilyEnrollmentDialogProps {
  enrollment: {
    id: string;
    memberNumber: string | null;
    currentBalance: number;
    tier: string | null;
    expirationDate: string | null;
    program: {
      name: string;
      currency: string;
    };
  };
  familyMemberId: string;
}

export function EditFamilyEnrollmentDialog({
  enrollment,
  familyMemberId,
}: EditFamilyEnrollmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [memberNumber, setMemberNumber] = useState(enrollment.memberNumber ?? '');
  const [currentBalance, setCurrentBalance] = useState(enrollment.currentBalance.toString());
  const [tier, setTier] = useState(enrollment.tier ?? '');
  const [expirationDate, setExpirationDate] = useState(
    enrollment.expirationDate
      ? new Date(enrollment.expirationDate).toISOString().split('T')[0]
      : ''
  );

  function resetForm() {
    setMemberNumber(enrollment.memberNumber ?? '');
    setCurrentBalance(enrollment.currentBalance.toString());
    setTier(enrollment.tier ?? '');
    setExpirationDate(
      enrollment.expirationDate
        ? new Date(enrollment.expirationDate).toISOString().split('T')[0]
        : ''
    );
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
      const result = await editFamilyEnrollment({
        enrollmentId: enrollment.id,
        familyMemberId,
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
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (value) resetForm(); }}>
      <DialogTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
        <Pencil className="h-3 w-3" />
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
            <Label htmlFor="efe-memberNumber">Member Number</Label>
            <Input
              id="efe-memberNumber"
              value={memberNumber}
              onChange={(e) => setMemberNumber(e.target.value)}
              placeholder="e.g., 123456789"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="efe-currentBalance">
              Current Balance ({enrollment.program.currency})
            </Label>
            <Input
              id="efe-currentBalance"
              type="number"
              min="0"
              value={currentBalance}
              onChange={(e) => setCurrentBalance(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="efe-tier">Tier / Status</Label>
            <Input
              id="efe-tier"
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              placeholder="e.g., Gold, Diamond"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="efe-expirationDate">Earliest Expiration</Label>
            <Input
              id="efe-expirationDate"
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
