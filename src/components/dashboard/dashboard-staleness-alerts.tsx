import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import type { EnrollmentSummary } from '@/lib/services/dashboard.service';

interface DashboardStalenessAlertsProps {
  enrollments: readonly EnrollmentSummary[];
}

export function DashboardStalenessAlerts({ enrollments }: DashboardStalenessAlertsProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-red-800 dark:text-red-200">
            {enrollments.length} program{enrollments.length > 1 ? 's' : ''} not updated in 30+ days
          </p>
          <p className="text-sm text-red-700 dark:text-red-300 mt-1">
            {enrollments.map((e) => e.program.name).join(', ')}
            {' — '}
            <Link href="/programs" className="underline">
              Update balances
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
