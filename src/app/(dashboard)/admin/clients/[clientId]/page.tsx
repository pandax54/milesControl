import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getClientDashboardView } from '@/lib/services/client-management.service';
import { ClientDashboardViewPanel } from '@/components/admin/client-dashboard-view';
import { EditClientDialog } from '@/components/admin/edit-client-dialog';
import { DeleteClientButton } from '@/components/admin/delete-client-button';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileBarChart } from 'lucide-react';
import { ClientNotFoundError } from '@/lib/services/client-management.service';

interface ClientDetailPageProps {
  params: Promise<{ clientId: string }>;
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  if ((session.user as { role?: string }).role !== 'ADMIN') {
    redirect('/');
  }

  const { clientId } = await params;

  let dashboardView;
  try {
    dashboardView = await getClientDashboardView(session.user.id, clientId);
  } catch (error) {
    if (error instanceof ClientNotFoundError) {
      notFound();
    }
    throw error;
  }

  const { client } = dashboardView;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" render={<Link href="/admin/clients" />}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Clients
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{client.name ?? 'Unnamed Client'}</h1>
            <Badge variant="secondary">Impersonation View</Badge>
          </div>
          <p className="text-muted-foreground">{client.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" render={<Link href={`/admin/clients/${client.id}/report`} />}>
            <FileBarChart className="mr-2 h-4 w-4" />
            View Report
          </Button>
          <EditClientDialog
            clientId={client.id}
            initialName={client.name}
            initialEmail={client.email}
          />
          <DeleteClientButton clientId={client.id} clientName={client.name} />
        </div>
      </div>

      <ClientDashboardViewPanel data={dashboardView} />
    </div>
  );
}
