'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import type { ClientMatchResult } from '@/lib/services/admin-promo-matching.service';

const MATCH_TYPE_LABELS: Record<string, string> = {
  BOTH: 'Source & Destination',
  SOURCE: 'Has Source Points',
  DESTINATION: 'Enrolled in Destination',
};

const MATCH_TYPE_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  BOTH: 'default',
  SOURCE: 'secondary',
  DESTINATION: 'outline',
};

interface PromoMatchClientsDialogProps {
  promotionTitle: string;
  matches: readonly ClientMatchResult[];
  totalClientCount: number;
}

export function PromoMatchClientsDialog({
  promotionTitle,
  matches,
  totalClientCount,
}: PromoMatchClientsDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Users className="mr-2 h-3.5 w-3.5" />
        View {matches.length} matching client{matches.length !== 1 ? 's' : ''}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Matching Clients</DialogTitle>
          <p className="text-sm text-muted-foreground">{promotionTitle}</p>
          <p className="text-sm text-muted-foreground">
            {matches.length} of {totalClientCount} clients matched
          </p>
        </DialogHeader>
        <div className="mt-2 max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Client</th>
                <th className="pb-2 pr-4 font-medium">Match Type</th>
                <th className="pb-2 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => (
                <tr key={match.clientId} className="border-b last:border-0">
                  <td className="py-2 pr-4">
                    <Link
                      href={`/admin/clients/${match.clientId}`}
                      className="font-medium hover:underline"
                    >
                      {match.clientName ?? '—'}
                    </Link>
                    <div className="text-xs text-muted-foreground">{match.clientEmail}</div>
                  </td>
                  <td className="py-2 pr-4">
                    <Badge variant={MATCH_TYPE_VARIANTS[match.matchType] ?? 'outline'}>
                      {MATCH_TYPE_LABELS[match.matchType] ?? match.matchType}
                    </Badge>
                  </td>
                  <td className="py-2 text-xs text-muted-foreground">{match.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
