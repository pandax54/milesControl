import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { OnboardingWizard } from '@/components/dashboard/onboarding-wizard';
import { DashboardBalances } from '@/components/dashboard/dashboard-balances';
import { DashboardProjections } from '@/components/dashboard/dashboard-projections';
import { DashboardStalenessAlerts } from '@/components/dashboard/dashboard-staleness-alerts';
import { DashboardSubscriptions } from '@/components/dashboard/dashboard-subscriptions';
import { DashboardSummaryCards } from '@/components/dashboard/dashboard-summary-cards';
import { DashboardTransfers } from '@/components/dashboard/dashboard-transfers';
import { Button } from '@/components/ui/button';
import { listAlertConfigs } from '@/lib/services/alert-config.service';
import { listClubTiers } from '@/lib/services/club-subscription.service';
import { fetchDashboardData } from '@/lib/services/dashboard.service';
import { listPrograms } from '@/lib/services/program-enrollment.service';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const [data, programs, clubTiers, alertConfigs] = await Promise.all([
    fetchDashboardData(session.user.id),
    listPrograms(),
    listClubTiers(),
    listAlertConfigs(session.user.id),
  ]);

  const enrolledProgramIds = new Set(data.enrollments.map((enrollment) => enrollment.program.id));
  const availablePrograms = programs.filter((program) => !enrolledProgramIds.has(program.id));
  const enrolledProgramNames = data.enrollments.map((enrollment) => enrollment.program.name);
  const showOnboardingWizard =
    data.enrollments.length === 0 || data.activeSubscriptionCount === 0 || alertConfigs.length === 0;

  if (data.enrollments.length === 0) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Let&apos;s solve the cold start in a few clicks so MilesControl can start helping right away.
          </p>
        </div>
        <OnboardingWizard
          availablePrograms={availablePrograms}
          clubTiers={clubTiers}
          enrollmentCount={data.enrollments.length}
          activeSubscriptionCount={data.activeSubscriptionCount}
          alertConfigCount={alertConfigs.length}
          enrolledProgramNames={enrolledProgramNames}
        />
      </div>
    );
  }

  const staleEnrollments = data.enrollments.filter((enrollment) => enrollment.stalenessLevel === 'stale');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Keep your balances, club subscriptions, and promo alerts ready for the next transfer window.
          </p>
        </div>
        <Link href="/programs" className="inline-flex">
          <Button variant="outline">Manage programs</Button>
        </Link>
      </div>

      {showOnboardingWizard && (
        <OnboardingWizard
          availablePrograms={availablePrograms}
          clubTiers={clubTiers}
          enrollmentCount={data.enrollments.length}
          activeSubscriptionCount={data.activeSubscriptionCount}
          alertConfigCount={alertConfigs.length}
          enrolledProgramNames={enrolledProgramNames}
        />
      )}

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
