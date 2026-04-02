import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listClients } from '@/lib/services/client-management.service';
import { ClientManagementTable } from '@/components/admin/client-management-table';
import { AddClientDialog } from '@/components/admin/add-client-dialog';

export default async function AdminClientsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  if ((session.user as { role?: string }).role !== 'ADMIN') {
    redirect('/');
  }

  const clients = await listClients(session.user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Client Management</h1>
          <p className="text-muted-foreground">
            Manage your clients and view their portfolios.
          </p>
        </div>
        <AddClientDialog />
      </div>

      <ClientManagementTable clients={clients} />
    </div>
  );
}
