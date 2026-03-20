import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listFamilyMembers } from '@/lib/services/family-member.service';
import { listPrograms } from '@/lib/services/program-enrollment.service';
import { FamilyMemberFormDialog } from '@/components/dashboard/family-member-form-dialog';
import {
  FamilyMemberCard,
  type FamilyMemberData,
} from '@/components/dashboard/family-member-card';

export default async function FamilyPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const [familyMembers, programs] = await Promise.all([
    listFamilyMembers(session.user.id),
    listPrograms(),
  ]);

  const normalizedMembers: FamilyMemberData[] = familyMembers.map((member) => ({
    id: member.id,
    name: member.name,
    relationship: member.relationship,
    programEnrollments: member.programEnrollments.map((e) => ({
      id: e.id,
      memberNumber: e.memberNumber,
      currentBalance: e.currentBalance,
      tier: e.tier,
      expirationDate: e.expirationDate?.toISOString() ?? null,
      balanceUpdatedAt: e.balanceUpdatedAt.toISOString(),
      program: e.program,
    })),
  }));

  const availablePrograms = programs.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    currency: p.currency,
  }));

  const hasMembers = normalizedMembers.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Family Members</h1>
          <p className="text-muted-foreground">
            Manage your family members and their program enrollments.
          </p>
        </div>
        {hasMembers && <FamilyMemberFormDialog />}
      </div>

      {!hasMembers ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
          <p className="text-lg font-medium">No family members added yet</p>
          <p className="text-sm text-muted-foreground">
            Add family members to track their miles and points under your account.
          </p>
          <div className="mt-4">
            <FamilyMemberFormDialog />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {normalizedMembers.map((member) => (
            <FamilyMemberCard
              key={member.id}
              member={member}
              availablePrograms={availablePrograms}
            />
          ))}
        </div>
      )}
    </div>
  );
}
