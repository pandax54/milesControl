'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QuickUpdateBalance } from './quick-update-balance';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { formatNumber } from '@/lib/utils/format';
import type { EnrollmentSummary, StalenessLevel } from '@/lib/services/dashboard.service';

interface DashboardBalancesProps {
  enrollments: readonly EnrollmentSummary[];
}

const STALENESS_COLORS: Record<StalenessLevel, string> = {
  fresh: 'text-green-600 dark:text-green-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  stale: 'text-red-600 dark:text-red-400',
};

export function DashboardBalances({ enrollments }: DashboardBalancesProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Program Balances</CardTitle>
        <Link href="/programs" className="text-sm text-muted-foreground hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {enrollments.map((enrollment) => {
          const stalenessColor = STALENESS_COLORS[enrollment.stalenessLevel];
          const updatedAgo = formatDistanceToNow(new Date(enrollment.balanceUpdatedAt), {
            addSuffix: true,
          });

          return (
            <div key={enrollment.id} className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{enrollment.program.name}</span>
                  <Badge
                    variant={enrollment.program.type === 'AIRLINE' ? 'default' : 'secondary'}
                    className="shrink-0"
                  >
                    {enrollment.program.type === 'AIRLINE' ? 'Airline' : 'Banking'}
                  </Badge>
                  {enrollment.program.website && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <a
                              href={enrollment.program.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Open ${enrollment.program.name} website`}
                              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md hover:bg-accent"
                            />
                          }
                        >
                          <ExternalLink className="h-3 w-3" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Open {enrollment.program.name} website
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <p className={`text-xs ${stalenessColor}`}>Updated {updatedAgo}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold tabular-nums">
                  {formatNumber(enrollment.currentBalance)}
                </span>
                <QuickUpdateBalance
                  enrollmentId={enrollment.id}
                  currentBalance={enrollment.currentBalance}
                  currency={enrollment.program.currency}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
