'use client';

import { Badge } from '@/components/ui/badge';
import { EditFamilyEnrollmentDialog } from './edit-family-enrollment-dialog';
import { DeleteFamilyEnrollmentButton } from './delete-family-enrollment-button';
import { formatNumber } from '@/lib/utils/format';
import { formatDistanceToNow } from 'date-fns';

export interface FamilyEnrollmentData {
  id: string;
  memberNumber: string | null;
  currentBalance: number;
  tier: string | null;
  expirationDate: string | null;
  balanceUpdatedAt: string;
  program: {
    id: string;
    name: string;
    type: string;
    currency: string;
  };
}

const STALENESS_FRESH_DAYS = 7;
const STALENESS_WARNING_DAYS = 30;

function getStalenessColor(updatedAt: string): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(updatedAt).getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < STALENESS_FRESH_DAYS) return 'text-green-600 dark:text-green-400';
  if (diffDays < STALENESS_WARNING_DAYS) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

interface FamilyEnrollmentCardProps {
  enrollment: FamilyEnrollmentData;
  familyMemberId: string;
}

export function FamilyEnrollmentCard({ enrollment, familyMemberId }: FamilyEnrollmentCardProps) {
  const stalenessColor = getStalenessColor(enrollment.balanceUpdatedAt);
  const updatedAgo = formatDistanceToNow(new Date(enrollment.balanceUpdatedAt), {
    addSuffix: true,
  });

  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{enrollment.program.name}</span>
          <Badge
            variant={enrollment.program.type === 'AIRLINE' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {enrollment.program.type === 'AIRLINE' ? 'Airline' : 'Banking'}
          </Badge>
          {enrollment.tier && (
            <Badge variant="outline" className="text-xs">
              {enrollment.tier}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">
            {formatNumber(enrollment.currentBalance)} {enrollment.program.currency}
          </span>
          {enrollment.memberNumber && <span>Member: {enrollment.memberNumber}</span>}
          {enrollment.expirationDate && (
            <span>
              Expires: {new Date(enrollment.expirationDate).toLocaleDateString('pt-BR')}
            </span>
          )}
          <span className={stalenessColor}>Updated {updatedAgo}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <EditFamilyEnrollmentDialog
          enrollment={enrollment}
          familyMemberId={familyMemberId}
        />
        <DeleteFamilyEnrollmentButton
          enrollmentId={enrollment.id}
          familyMemberId={familyMemberId}
          programName={enrollment.program.name}
        />
      </div>
    </div>
  );
}
