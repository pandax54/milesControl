import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@/lib/utils/format';
import type { ClientSummary } from '@/lib/services/admin-dashboard.service';

interface AdminClientsTableProps {
  clients: readonly ClientSummary[];
}

export function AdminClientsTable({ clients }: AdminClientsTableProps) {
  if (clients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Clients by Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No clients found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Clients by Balance</CardTitle>
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
                <th className="pb-2 text-right font-medium">Subscriptions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">
                    <div className="font-medium">{client.name ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">{client.email}</div>
                    {client.expiringMiles > 0 && (
                      <div className="text-xs text-red-500">
                        {formatNumber(client.expiringMiles)} miles expiring soon
                      </div>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-right">{formatNumber(client.totalMiles)}</td>
                  <td className="py-2 pr-4 text-right">{formatNumber(client.totalPoints)}</td>
                  <td className="py-2 pr-4 text-right">{client.enrollmentCount}</td>
                  <td className="py-2 text-right">{client.activeSubscriptionCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
