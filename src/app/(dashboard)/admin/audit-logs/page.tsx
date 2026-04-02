import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { fetchAuditLogs } from '@/lib/services/audit-log.service';
import { AuditLogTable } from '@/components/admin/audit-log-table';

const PAGE_SIZE = 20;

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string; targetUserId?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  if ((session.user as { role?: string }).role !== 'ADMIN') {
    redirect('/');
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const action = params.action;
  const targetUserId = params.targetUserId;

  const result = await fetchAuditLogs(session.user.id, {
    page,
    pageSize: PAGE_SIZE,
    action,
    targetUserId,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">
          Record of all admin actions performed on client accounts.
        </p>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {result.total} {result.total === 1 ? 'entry' : 'entries'} total
        </span>
        {result.totalPages > 1 && (
          <span>
            Page {result.page} of {result.totalPages}
          </span>
        )}
      </div>

      <AuditLogTable entries={result.entries} />

      {result.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <a
              href={`?page=${page - 1}${action ? `&action=${action}` : ''}${targetUserId ? `&targetUserId=${targetUserId}` : ''}`}
              className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              Previous
            </a>
          )}
          {page < result.totalPages && (
            <a
              href={`?page=${page + 1}${action ? `&action=${action}` : ''}${targetUserId ? `&targetUserId=${targetUserId}` : ''}`}
              className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              Next
            </a>
          )}
        </div>
      )}
    </div>
  );
}
