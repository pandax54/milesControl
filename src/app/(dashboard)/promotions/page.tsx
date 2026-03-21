import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listPromotions, listPromotionPrograms } from '@/lib/services/promotion.service';
import { listEnrollments } from '@/lib/services/program-enrollment.service';
import { PromotionFeed } from '@/components/promotions/promotion-feed';
import type { EnrollmentSummary } from '@/lib/services/promo-matcher.service';

export default async function PromotionsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const [promotions, programs, rawEnrollments] = await Promise.all([
    listPromotions({ status: 'ACTIVE', sortBy: 'detectedAt', sortOrder: 'desc' }),
    listPromotionPrograms(),
    listEnrollments(session.user.id),
  ]);

  const enrollments: EnrollmentSummary[] = rawEnrollments.map((e) => ({
    programId: e.program.id,
    programName: e.program.name,
    currentBalance: e.currentBalance,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Promotions</h1>
        <p className="text-muted-foreground">
          Active promotions sorted by value. Filter by type, program, or deadline.
        </p>
      </div>

      <PromotionFeed
        initialPromotions={promotions}
        programs={programs}
        enrollments={enrollments}
      />
    </div>
  );
}
