'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EditEnrollmentDialog } from './edit-enrollment-dialog';
import { DeleteEnrollmentButton } from './delete-enrollment-button';
import { QuickUpdateBalance } from './quick-update-balance';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface EnrollmentCardProps {
  enrollment: {
    id: string;
    memberNumber: string | null;
    currentBalance: number;
    tier: string | null;
    expirationDate: Date | null;
    balanceUpdatedAt: Date;
    program: {
      id: string;
      name: string;
      type: string;
      currency: string;
      logoUrl: string | null;
      website: string | null;
    };
  };
}

const STALENESS_FRESH_DAYS = 7;
const STALENESS_WARNING_DAYS = 30;

function getStalenessColor(updatedAt: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(updatedAt).getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < STALENESS_FRESH_DAYS) return 'text-green-600 dark:text-green-400';
  if (diffDays < STALENESS_WARNING_DAYS) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

export function EnrollmentCard({ enrollment }: EnrollmentCardProps) {
  const stalenessColor = getStalenessColor(enrollment.balanceUpdatedAt);
  const updatedAgo = formatDistanceToNow(new Date(enrollment.balanceUpdatedAt), {
    addSuffix: true,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold">
            {enrollment.program.name}
          </CardTitle>
          <Badge variant={enrollment.program.type === 'AIRLINE' ? 'default' : 'secondary'}>
            {enrollment.program.type === 'AIRLINE' ? 'Airline' : 'Banking'}
          </Badge>
          {enrollment.tier && (
            <Badge variant="outline">{enrollment.tier}</Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {enrollment.program.website && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <a
                    href={enrollment.program.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${enrollment.program.name} website`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
                  />
                }
              >
                <ExternalLink className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent>
                Open {enrollment.program.name} website
              </TooltipContent>
            </Tooltip>
          )}
          <EditEnrollmentDialog enrollment={enrollment} />
          <DeleteEnrollmentButton
            enrollmentId={enrollment.id}
            programName={enrollment.program.name}
          />
        </div>
      </CardHeader>
      <CardContent>
        <QuickUpdateBalance
          enrollmentId={enrollment.id}
          currentBalance={enrollment.currentBalance}
          currency={enrollment.program.currency}
        />
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {enrollment.memberNumber && (
            <span>Member: {enrollment.memberNumber}</span>
          )}
          {enrollment.expirationDate && (
            <span>
              Expires:{' '}
              {new Date(enrollment.expirationDate).toLocaleDateString('pt-BR')}
            </span>
          )}
          <span className={stalenessColor}>Updated {updatedAgo}</span>
        </div>
      </CardContent>
    </Card>
  );
}
