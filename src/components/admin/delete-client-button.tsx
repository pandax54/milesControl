'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { removeClient } from '@/actions/clients';
import { Trash2 } from 'lucide-react';

interface DeleteClientButtonProps {
  clientId: string;
  clientName: string | null;
}

export function DeleteClientButton({ clientId, clientName }: DeleteClientButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    const displayName = clientName ?? 'this client';
    if (!confirm(`Are you sure you want to delete ${displayName}? This action cannot be undone.`)) {
      return;
    }

    startTransition(async () => {
      const result = await removeClient(clientId);
      if (result.success) {
        router.push('/admin/clients');
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={isPending}
      className="text-destructive hover:text-destructive"
    >
      <Trash2 className="h-4 w-4" />
      <span className="sr-only">Delete client</span>
    </Button>
  );
}
