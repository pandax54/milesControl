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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
import {
  sendPromoRecommendation,
  sendBatchPromoRecommendations,
} from '@/actions/recommendations';

// ==================== Single client dialog ====================

interface SendRecommendationDialogProps {
  promotionId: string;
  clientId: string;
  clientName: string | null;
}

export function SendRecommendationDialog({
  promotionId,
  clientId,
  clientName,
}: SendRecommendationDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function resetForm() {
    setMessage('');
    setError(null);
    setSent(false);
  }

  function handleSubmit() {
    setError(null);

    startTransition(async () => {
      const result = await sendPromoRecommendation({
        clientId,
        promotionId,
        message: message.trim() || undefined,
      });

      if (result.success) {
        setSent(true);
        setTimeout(() => {
          setOpen(false);
          resetForm();
        }, 1200);
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
        <Send className="mr-1.5 h-3.5 w-3.5" />
        Recommend
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Recommendation</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Send this promotion to{' '}
            <span className="font-medium">{clientName ?? 'this client'}</span>
          </p>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="rec-message">
              Personal message{' '}
              <span className="text-xs text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="rec-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal note for the client..."
              maxLength={500}
              rows={3}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {sent && <p className="text-sm text-green-600">Recommendation sent!</p>}

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
            <Button type="submit" disabled={isPending || sent}>
              {isPending ? 'Sending...' : 'Send Recommendation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Batch dialog ====================

interface SendBatchRecommendationDialogProps {
  promotionId: string;
  promotionTitle: string;
  clientIds: readonly string[];
  matchedCount: number;
}

export function SendBatchRecommendationDialog({
  promotionId,
  promotionTitle,
  clientIds,
  matchedCount,
}: SendBatchRecommendationDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ succeeded: number; failed: number } | null>(null);

  function resetForm() {
    setMessage('');
    setError(null);
    setSummary(null);
  }

  function handleSubmit() {
    setError(null);

    startTransition(async () => {
      const result = await sendBatchPromoRecommendations({
        clientIds: [...clientIds],
        promotionId,
        message: message.trim() || undefined,
      });

      if (result.success && result.summary) {
        setSummary({ succeeded: result.summary.succeeded, failed: result.summary.failed });
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
      <DialogTrigger render={<Button size="sm" />}>
        <Send className="mr-2 h-3.5 w-3.5" />
        Send to all {matchedCount} client{matchedCount !== 1 ? 's' : ''}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Batch Recommendation</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Send this promotion to all {matchedCount} matched client
            {matchedCount !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-muted-foreground italic">{promotionTitle}</p>
        </DialogHeader>

        {summary ? (
          <div className="space-y-4">
            <div className="rounded-md bg-muted p-4 text-sm">
              <p className="font-medium">Recommendations sent</p>
              <p className="mt-1 text-muted-foreground">
                {summary.succeeded} sent successfully
                {summary.failed > 0 ? `, ${summary.failed} failed` : ''}
              </p>
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="batch-rec-message">
                Personal message{' '}
                <span className="text-xs text-muted-foreground">(optional — sent to all)</span>
              </Label>
              <Textarea
                id="batch-rec-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a note for all clients..."
                maxLength={500}
                rows={3}
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
                {isPending ? 'Sending...' : `Send to ${matchedCount} client${matchedCount !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
