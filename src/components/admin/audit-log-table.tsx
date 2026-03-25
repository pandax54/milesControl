import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import type { AuditLogEntry } from '@/lib/services/audit-log.service';

const ACTION_LABELS: Record<string, string> = {
  CREATE_CLIENT: 'Created client',
  UPDATE_CLIENT: 'Updated client',
  DELETE_CLIENT: 'Deleted client',
  SEND_RECOMMENDATION: 'Sent recommendation',
  SEND_BATCH_RECOMMENDATIONS: 'Sent batch recommendations',
  IMPERSONATE_CLIENT: 'Viewed client dashboard',
  UPDATE_CLIENT_BALANCE: 'Updated client balance',
};

const ACTION_VARIANTS: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  CREATE_CLIENT: 'default',
  UPDATE_CLIENT: 'secondary',
  DELETE_CLIENT: 'destructive',
  SEND_RECOMMENDATION: 'default',
  SEND_BATCH_RECOMMENDATIONS: 'default',
  IMPERSONATE_CLIENT: 'outline',
  UPDATE_CLIENT_BALANCE: 'secondary',
};

function formatDetails(details: Record<string, unknown> | null): string {
  if (!details || Object.keys(details).length === 0) {
    return '—';
  }
  return Object.entries(details)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
}

interface AuditLogTableProps {
  entries: readonly AuditLogEntry[];
}

export function AuditLogTable({ entries }: AuditLogTableProps) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">No audit log entries found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Target client</TableHead>
            <TableHead className="hidden md:table-cell">Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {entry.createdAt.toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </TableCell>
              <TableCell>
                <Badge variant={ACTION_VARIANTS[entry.action] ?? 'outline'}>
                  {ACTION_LABELS[entry.action] ?? entry.action}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {entry.targetUserId ?? '—'}
              </TableCell>
              <TableCell className="hidden max-w-xs truncate text-sm text-muted-foreground md:table-cell">
                {formatDetails(entry.details)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
