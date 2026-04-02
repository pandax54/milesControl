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
import { editClient } from '@/actions/clients';
import { Pencil } from 'lucide-react';

interface EditClientDialogProps {
  clientId: string;
  initialName: string | null;
  initialEmail: string;
}

export function EditClientDialog({ clientId, initialName, initialEmail }: EditClientDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(initialName ?? '');
  const [email, setEmail] = useState(initialEmail);

  function resetForm() {
    setName(initialName ?? '');
    setEmail(initialEmail);
    setError(null);
  }

  function handleSubmit() {
    setError(null);

    startTransition(async () => {
      const result = await editClient({
        clientId,
        ...(name.trim() ? { name: name.trim() } : {}),
        ...(email.trim() ? { email: email.trim() } : {}),
      });

      if (result.success) {
        setOpen(false);
      } else {
        setError(result.error ?? 'Unknown error');
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
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>
        <Pencil className="h-4 w-4" />
        <span className="sr-only">Edit client</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Client</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="edit-client-name">Name</Label>
            <Input
              id="edit-client-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Client name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-client-email">Email</Label>
            <Input
              id="edit-client-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
            />
          </div>

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
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
