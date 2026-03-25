import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { fetchAdminDashboardData } from '@/lib/services/admin-dashboard.service';
import { AdminSummaryCards } from '@/components/admin/admin-summary-cards';
import { AdminClientsTable } from '@/components/admin/admin-clients-table';

export default async function AdminDashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  if ((session.user as { role?: string }).role !== 'ADMIN') {
    redirect('/');
  }

  const data = await fetchAdminDashboardData(session.user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>

      <AdminSummaryCards
        totalClients={data.totalClients}
        totalMilesAggregated={data.totalMilesAggregated}
        totalPointsAggregated={data.totalPointsAggregated}
        activeSubscriptionCount={data.activeSubscriptionCount}
        clientsWithExpiringMiles={data.clientsWithExpiringMiles}
      />

      <AdminClientsTable clients={data.topClients} />
    </div>
  );
}
