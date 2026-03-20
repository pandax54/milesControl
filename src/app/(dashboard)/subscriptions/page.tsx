import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listSubscriptions, listClubTiers } from '@/lib/services/club-subscription.service';
import { SubscriptionFormDialog } from '@/components/dashboard/subscription-form-dialog';
import { SubscriptionCard } from '@/components/dashboard/subscription-card';

export default async function SubscriptionsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const [subscriptions, clubTiers] = await Promise.all([
    listSubscriptions(session.user.id),
    listClubTiers(),
  ]);

  const activeSubscriptions = subscriptions.filter((s) => s.status === 'ACTIVE');
  const inactiveSubscriptions = subscriptions.filter((s) => s.status !== 'ACTIVE');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Club Subscriptions</h1>
          <p className="text-muted-foreground">
            Manage your loyalty club memberships and accrual schedules.
          </p>
        </div>
        {clubTiers.length > 0 && <SubscriptionFormDialog clubTiers={clubTiers} />}
      </div>

      {subscriptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
          <p className="text-lg font-medium">No subscriptions yet</p>
          <p className="text-sm text-muted-foreground">
            Add your first club subscription to start tracking accruals and billing.
          </p>
          {clubTiers.length > 0 && (
            <div className="mt-4">
              <SubscriptionFormDialog clubTiers={clubTiers} />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {activeSubscriptions.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-semibold">Active</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeSubscriptions.map((subscription) => (
                  <SubscriptionCard key={subscription.id} subscription={subscription} />
                ))}
              </div>
            </section>
          )}

          {inactiveSubscriptions.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-semibold">Inactive</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {inactiveSubscriptions.map((subscription) => (
                  <SubscriptionCard key={subscription.id} subscription={subscription} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
