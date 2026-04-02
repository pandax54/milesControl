import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getPromotionsWithClientMatches } from '@/lib/services/admin-promo-matching.service';
import { PromoMatchingList } from '@/components/admin/promo-matching-list';

export default async function AdminPromotionsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  if ((session.user as { role?: string }).role !== 'ADMIN') {
    redirect('/');
  }

  const items = await getPromotionsWithClientMatches(session.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Promo-Client Matching</h1>
        <p className="text-muted-foreground">
          Active promotions and how many of your clients would benefit from each one.
        </p>
      </div>

      <PromoMatchingList items={items} />
    </div>
  );
}
