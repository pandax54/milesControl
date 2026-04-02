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
import { addClient } from '@/actions/clients';
import { Plus } from 'lucide-react';

export function AddClientDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function resetForm() {
    setName('');
    setEmail('');
    setPassword('');
    setError(null);
  }

  function handleSubmit() {
    setError(null);

    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    startTransition(async () => {
      const result = await addClient({
        name: name.trim(),
        email: email.trim(),
        ...(password ? { password } : {}),
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
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) resetForm();
      }}
    >
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" />
        Add Client
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Client</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="client-name">Name</Label>
            <Input
              id="client-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Ricardo Silva"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-email">Email</Label>
            <Input
              id="client-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-password">
              Password{' '}
              <span className="text-muted-foreground text-xs">(optional — auto-generated if empty)</span>
            </Label>
            <Input
              id="client-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
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
            <Button type="submit" disabled={isPending || !name.trim() || !email.trim()}>
              {isPending ? 'Adding...' : 'Add Client'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
