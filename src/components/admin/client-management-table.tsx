import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/lib/utils/format';
import { EditClientDialog } from '@/components/admin/edit-client-dialog';
import { DeleteClientButton } from '@/components/admin/delete-client-button';
import { Eye } from 'lucide-react';
import type { ClientDetail } from '@/lib/services/client-management.service';

interface ClientManagementTableProps {
  clients: readonly ClientDetail[];
}

export function ClientManagementTable({ clients }: ClientManagementTableProps) {
  if (clients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Clients</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No clients yet. Add your first client to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clients ({clients.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Client</th>
                <th className="pb-2 pr-4 text-right font-medium">Miles</th>
                <th className="pb-2 pr-4 text-right font-medium">Points</th>
                <th className="pb-2 pr-4 text-right font-medium">Programs</th>
                <th className="pb-2 pr-4 text-right font-medium">Subscriptions</th>
                <th className="pb-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">
                    <div className="font-medium">{client.name ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">{client.email}</div>
                  </td>
                  <td className="py-2 pr-4 text-right">{formatNumber(client.totalMiles)}</td>
                  <td className="py-2 pr-4 text-right">{formatNumber(client.totalPoints)}</td>
                  <td className="py-2 pr-4 text-right">{client.enrollmentCount}</td>
                  <td className="py-2 pr-4 text-right">{client.activeSubscriptionCount}</td>
                  <td className="py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        render={<Link href={`/admin/clients/${client.id}`} />}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View client</span>
                      </Button>
                      <EditClientDialog
                        clientId={client.id}
                        initialName={client.name}
                        initialEmail={client.email}
                      />
                      <DeleteClientButton clientId={client.id} clientName={client.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
