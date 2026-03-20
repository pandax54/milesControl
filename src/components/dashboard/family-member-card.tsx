'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RELATIONSHIP_LABELS, type RelationshipValue } from '@/lib/validators/family.schema';
import { EditFamilyMemberDialog } from './edit-family-member-dialog';
import { DeleteFamilyMemberButton } from './delete-family-member-button';
import { FamilyEnrollmentCard, type FamilyEnrollmentData } from './family-enrollment-card';
import { FamilyEnrollmentFormDialog } from './family-enrollment-form-dialog';

export interface FamilyMemberData {
  id: string;
  name: string;
  relationship: string | null;
  programEnrollments: FamilyEnrollmentData[];
}

export interface AvailableProgram {
  id: string;
  name: string;
  type: string;
  currency: string;
}

interface FamilyMemberCardProps {
  member: FamilyMemberData;
  availablePrograms: AvailableProgram[];
}

export function FamilyMemberCard({ member, availablePrograms }: FamilyMemberCardProps) {
  const enrolledProgramIds = new Set(member.programEnrollments.map((e) => e.program.id));
  const programsForEnrollment = availablePrograms.filter((p) => !enrolledProgramIds.has(p.id));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold">{member.name}</CardTitle>
          {member.relationship && (
            <Badge variant="outline">
              {RELATIONSHIP_LABELS[member.relationship as RelationshipValue] ??
                member.relationship}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <EditFamilyMemberDialog member={member} />
          <DeleteFamilyMemberButton
            familyMemberId={member.id}
            memberName={member.name}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {member.programEnrollments.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Program Enrollments</h4>
            <div className="grid gap-2">
              {member.programEnrollments.map((enrollment) => (
                <FamilyEnrollmentCard
                  key={enrollment.id}
                  enrollment={enrollment}
                  familyMemberId={member.id}
                />
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No programs enrolled yet.</p>
        )}
        {programsForEnrollment.length > 0 && (
          <FamilyEnrollmentFormDialog
            familyMemberId={member.id}
            availablePrograms={programsForEnrollment}
          />
        )}
      </CardContent>
    </Card>
  );
}
