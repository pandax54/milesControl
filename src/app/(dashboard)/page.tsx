import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { fetchDashboardData } from '@/lib/services/dashboard.service';
import { DashboardSummaryCards } from '@/components/dashboard/dashboard-summary-cards';
import { DashboardBalances } from '@/components/dashboard/dashboard-balances';
import { DashboardSubscriptions } from '@/components/dashboard/dashboard-subscriptions';
import { DashboardProjections } from '@/components/dashboard/dashboard-projections';
import { DashboardTransfers } from '@/components/dashboard/dashboard-transfers';
import { DashboardStalenessAlerts } from '@/components/dashboard/dashboard-staleness-alerts';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const data = await fetchDashboardData(session.user.id);

  if (data.enrollments.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
          <p className="text-lg font-medium">Welcome to MilesControl</p>
          <p className="text-sm text-muted-foreground">
            Get started by adding your first loyalty program.
          </p>
          <Link href="/programs" className="mt-4">
            <Button>Add Programs</Button>
          </Link>
        </div>
      </div>
    );
  }

  const staleEnrollments = data.enrollments.filter((e) => e.stalenessLevel === 'stale');

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

      {staleEnrollments.length > 0 && (
        <DashboardStalenessAlerts enrollments={staleEnrollments} />
      )}

      <DashboardSummaryCards
        totalMiles={data.totalMiles}
        totalPoints={data.totalPoints}
        activeSubscriptionCount={data.activeSubscriptionCount}
        staleEnrollmentCount={data.staleEnrollmentCount}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardBalances enrollments={data.enrollments} />
        <DashboardProjections projection={data.projection} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardSubscriptions subscriptions={data.activeSubscriptions} />
        <DashboardTransfers transfers={data.recentTransfers} />
      </div>
    </div>
  );
}
