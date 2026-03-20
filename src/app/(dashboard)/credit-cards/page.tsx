import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listCreditCards } from '@/lib/services/credit-card.service';
import { CreditCardFormDialog } from '@/components/dashboard/credit-card-form-dialog';
import { CreditCardCard } from '@/components/dashboard/credit-card-card';

export default async function CreditCardsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const cards = await listCreditCards(session.user.id);

  const cardsByBank = cards.reduce<Record<string, typeof cards>>((acc, card) => {
    const bank = card.bankName;
    if (!acc[bank]) {
      acc[bank] = [];
    }
    acc[bank].push(card);
    return acc;
  }, {});

  const bankNames = Object.keys(cardsByBank).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Credit Cards</h1>
          <p className="text-muted-foreground">
            Manage your credit cards and their points programs.
          </p>
        </div>
        <CreditCardFormDialog />
      </div>

      {cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
          <p className="text-lg font-medium">No credit cards yet</p>
          <p className="text-sm text-muted-foreground">
            Add your first credit card to start tracking your points earning.
          </p>
          <div className="mt-4">
            <CreditCardFormDialog />
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {bankNames.map((bank) => (
            <section key={bank}>
              <h2 className="mb-4 text-xl font-semibold">{bank}</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {cardsByBank[bank].map((card) => (
                  <CreditCardCard
                    key={card.id}
                    card={{
                      ...card,
                      benefits: card.benefits as string[] | null,
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
