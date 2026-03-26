import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { listPrograms, listEnrollments } from '@/lib/services/program-enrollment.service';
import { calculatePotentialBalances } from '@/lib/services/potential-balance.service';
import { EnrollmentFormDialog } from '@/components/dashboard/enrollment-form-dialog';
import { EnrollmentCard } from '@/components/dashboard/enrollment-card';
import { PotentialBalanceCard } from '@/components/dashboard/potential-balance-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FREE_TIER_PROGRAM_LIMIT,
  getUserFreemiumTier,
} from '@/lib/services/freemium.service';

export default async function ProgramsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const [programs, enrollments, potentialBalances, freemiumTier] = await Promise.all([
    listPrograms(),
    listEnrollments(session.user.id),
    calculatePotentialBalances(session.user.id),
    getUserFreemiumTier(session.user.id),
  ]);

  const enrolledProgramIds = new Set(enrollments.map((e) => e.program.id));
  const availablePrograms = programs.filter((p) => !enrolledProgramIds.has(p.id));
  const isFreeTier = freemiumTier === 'FREE';
  const remainingProgramSlots = isFreeTier
    ? Math.max(FREE_TIER_PROGRAM_LIMIT - enrollments.length, 0)
    : null;
  const canAddPrograms = !isFreeTier || remainingProgramSlots !== 0;

  const airlineEnrollments = enrollments.filter((e) => e.program.type === 'AIRLINE');
  const bankingEnrollments = enrollments.filter((e) => e.program.type === 'BANKING');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Programs</h1>
          <p className="text-muted-foreground">
            Manage your airline and banking program enrollments.
          </p>
          {isFreeTier && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {enrollments.length}/{FREE_TIER_PROGRAM_LIMIT} programs used
              </Badge>
              <p className="text-sm text-muted-foreground">
                {remainingProgramSlots === 0
                  ? 'Upgrade to Premium to add more programs.'
                  : `${remainingProgramSlots} free slot${remainingProgramSlots === 1 ? '' : 's'} remaining.`}
              </p>
            </div>
          )}
        </div>
        {availablePrograms.length > 0 && canAddPrograms ? (
          <EnrollmentFormDialog availablePrograms={availablePrograms} />
        ) : isFreeTier && remainingProgramSlots === 0 ? (
          <Button variant="outline" render={<Link href="/upgrade" />}>
            Upgrade for Unlimited Programs
          </Button>
        ) : null}
      </div>

      {enrollments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
          <p className="text-lg font-medium">No programs yet</p>
          <p className="text-sm text-muted-foreground">
            Add your first loyalty program to start tracking your miles and points.
          </p>
          <div className="mt-4">
            {canAddPrograms ? (
              <EnrollmentFormDialog availablePrograms={availablePrograms} />
            ) : (
              <Button variant="outline" render={<Link href="/upgrade" />}>
                Upgrade for Unlimited Programs
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {airlineEnrollments.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-semibold">Airline Programs</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {airlineEnrollments.map((enrollment) => (
                  <EnrollmentCard key={enrollment.id} enrollment={enrollment} />
                ))}
              </div>
            </section>
          )}

          {bankingEnrollments.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-semibold">Banking Programs</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {bankingEnrollments.map((enrollment) => (
                  <EnrollmentCard key={enrollment.id} enrollment={enrollment} />
                ))}
              </div>
            </section>
          )}

          {potentialBalances.length > 0 && (
            <section>
              <h2 className="mb-2 text-xl font-semibold">Potential Balances</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                If you transferred all your banking points to each airline program.
              </p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {potentialBalances.map((pb) => (
                  <PotentialBalanceCard key={pb.targetProgramName} potentialBalance={pb} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
