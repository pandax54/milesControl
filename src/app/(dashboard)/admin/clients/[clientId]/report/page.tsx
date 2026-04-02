import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileBarChart } from 'lucide-react';
import { generateClientReport } from '@/lib/services/client-report.service';
import { ClientReportView } from '@/components/admin/client-report-view';
import { ClientNotFoundError } from '@/lib/services/client-management.service';

interface ClientReportPageProps {
  params: Promise<{ clientId: string }>;
}

export default async function ClientReportPage({ params }: ClientReportPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  if ((session.user as { role?: string }).role !== 'ADMIN') {
    redirect('/');
  }

  const { clientId } = await params;

  let report;
  try {
    report = await generateClientReport(session.user.id, clientId);
  } catch (error) {
    if (error instanceof ClientNotFoundError) {
      notFound();
    }
    throw error;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" render={<Link href={`/admin/clients/${clientId}`} />}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Client
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <FileBarChart className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {report.client.name ?? 'Unnamed Client'} — Report
          </h1>
          <p className="text-muted-foreground">{report.client.email}</p>
        </div>
      </div>

      <ClientReportView report={report} />
    </div>
  );
}
