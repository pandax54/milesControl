import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listBenefits } from '@/lib/services/tracked-benefit.service';
import { BenefitFormDialog } from '@/components/dashboard/benefit-form-dialog';
import { BenefitCard, type BenefitData } from '@/components/dashboard/benefit-card';

export default async function BenefitsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const benefits = await listBenefits(session.user.id);

  const normalizedBenefits: BenefitData[] = benefits.map((b) => ({
    id: b.id,
    type: b.type,
    programOrCard: b.programOrCard,
    description: b.description,
    quantity: b.quantity,
    remainingQty: b.remainingQty,
    expirationDate: b.expirationDate?.toISOString() ?? null,
    isUsed: b.isUsed,
    usedAt: b.usedAt?.toISOString() ?? null,
    notes: b.notes,
  }));

  const activeBenefits = normalizedBenefits.filter((b) => !b.isUsed);
  const usedBenefits = normalizedBenefits.filter((b) => b.isUsed);
  const hasBenefits = normalizedBenefits.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Benefits</h1>
          <p className="text-muted-foreground">
            Track your free nights, companion passes, upgrade credits, and more.
          </p>
        </div>
        {hasBenefits && <BenefitFormDialog />}
      </div>

      {!hasBenefits ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
          <p className="text-lg font-medium">No benefits tracked yet</p>
          <p className="text-sm text-muted-foreground">
            Add your first benefit to start tracking certificates, passes, and credits.
          </p>
          <div className="mt-4">
            <BenefitFormDialog />
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {activeBenefits.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-semibold">Active Benefits</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeBenefits.map((benefit) => (
                  <BenefitCard key={benefit.id} benefit={benefit} />
                ))}
              </div>
            </section>
          )}

          {usedBenefits.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-semibold text-muted-foreground">Used Benefits</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {usedBenefits.map((benefit) => (
                  <BenefitCard key={benefit.id} benefit={benefit} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
