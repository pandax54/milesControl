import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listTransfers, getUserAverageCostPerMilheiro } from '@/lib/services/transfer.service';
import { listPrograms } from '@/lib/services/program-enrollment.service';
import { TransferFormDialog } from '@/components/dashboard/transfer-form-dialog';
import { EditTransferDialog } from '@/components/dashboard/edit-transfer-dialog';
import { DeleteTransferButton } from '@/components/dashboard/delete-transfer-button';
import { NetValueBadge } from '@/components/dashboard/net-value-badge';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowRight } from 'lucide-react';
import { formatNumber, formatCurrency } from '@/lib/utils/format';
import type { TransferData } from '@/lib/validators/transfer.schema';

const COST_THRESHOLD_EXCELLENT = 12;
const COST_THRESHOLD_GOOD = 16;
const COST_THRESHOLD_ACCEPTABLE = 20;
const NET_VALUE_THRESHOLD_PERCENT = 5;

type Rating = 'EXCELLENT' | 'GOOD' | 'ACCEPTABLE' | 'AVOID';
type NetValueType = 'positive' | 'negative' | 'neutral';

interface EnrichedTransfer extends TransferData {
  sourceBrl: number | null;
  destBrl: number | null;
  netValue: number | null;
  netValueType: NetValueType | null;
}

const RATING_VARIANTS: Record<Rating, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  EXCELLENT: 'default',
  GOOD: 'secondary',
  ACCEPTABLE: 'outline',
  AVOID: 'destructive',
};

function rateTransfer(costPerMilheiro: number | null): Rating | null {
  if (costPerMilheiro === null) return null;
  if (costPerMilheiro < COST_THRESHOLD_EXCELLENT) return 'EXCELLENT';
  if (costPerMilheiro < COST_THRESHOLD_GOOD) return 'GOOD';
  if (costPerMilheiro < COST_THRESHOLD_ACCEPTABLE) return 'ACCEPTABLE';
  return 'AVOID';
}

function computeBrlValue(miles: number, cpm: number | null): number | null {
  if (cpm === null) return null;
  return (miles * cpm) / 1000;
}

function computeNetValue(
  sourceBrl: number | null,
  destBrl: number | null,
): { netValue: number | null; netValueType: NetValueType | null } {
  if (sourceBrl === null || destBrl === null) {
    return { netValue: null, netValueType: null };
  }

  const netValue = destBrl - sourceBrl;

  if (sourceBrl === 0) {
    return { netValue, netValueType: 'neutral' };
  }

  const pct = (netValue / sourceBrl) * 100;

  if (pct > NET_VALUE_THRESHOLD_PERCENT) {
    return { netValue, netValueType: 'positive' };
  }

  if (pct < -NET_VALUE_THRESHOLD_PERCENT) {
    return { netValue, netValueType: 'negative' };
  }

  return { netValue, netValueType: 'neutral' };
}

export default async function TransfersPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const [transfers, programs] = await Promise.all([
    listTransfers(session.user.id),
    listPrograms(),
  ]);

  const transferData: TransferData[] = transfers.map((t) => ({
    id: t.id,
    sourceProgramName: t.sourceProgramName,
    destProgramName: t.destProgramName,
    pointsTransferred: t.pointsTransferred,
    bonusPercent: t.bonusPercent,
    milesReceived: t.milesReceived,
    totalCost: t.totalCost ? Number(t.totalCost) : null,
    costPerMilheiro: t.costPerMilheiro ? Number(t.costPerMilheiro) : null,
    promotionId: t.promotionId,
    notes: t.notes,
    transferDate: t.transferDate,
  }));

  const uniquePrograms = [
    ...new Set(transferData.flatMap((t) => [t.sourceProgramName, t.destProgramName])),
  ];

  const cpmValues = await Promise.all(
    uniquePrograms.map((program) => getUserAverageCostPerMilheiro(session.user.id, program)),
  );

  const cpmMap = new Map<string, number | null>(
    uniquePrograms.map((program, i) => [program, cpmValues[i]]),
  );

  const enrichedTransfers: EnrichedTransfer[] = transferData.map((transfer) => {
    const sourceCpm = cpmMap.get(transfer.sourceProgramName) ?? null;
    const destCpm = cpmMap.get(transfer.destProgramName) ?? null;
    const sourceBrl = computeBrlValue(transfer.pointsTransferred, sourceCpm);
    const destBrl = computeBrlValue(transfer.milesReceived, destCpm);
    const { netValue, netValueType } = computeNetValue(sourceBrl, destBrl);

    return { ...transfer, sourceBrl, destBrl, netValue, netValueType };
  });

  const programOptions = programs.map((p) => ({ name: p.name, type: p.type }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transfers</h1>
          <p className="text-muted-foreground">
            Log and track your points transfers between programs.
          </p>
        </div>
        {programOptions.length > 0 && (
          <TransferFormDialog programs={programOptions} />
        )}
      </div>

      {enrichedTransfers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
          <p className="text-lg font-medium">No transfers yet</p>
          <p className="text-sm text-muted-foreground">
            Log your first transfer to start tracking your miles acquisition costs.
          </p>
          {programOptions.length > 0 && (
            <div className="mt-4">
              <TransferFormDialog programs={programOptions} />
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transfer</TableHead>
                <TableHead className="text-right">Points</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Bonus</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">R$/k</TableHead>
                <TableHead className="text-right">Net Value</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrichedTransfers.map((transfer) => {
                const rating = rateTransfer(transfer.costPerMilheiro);

                return (
                  <TableRow key={transfer.id}>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{transfer.sourceProgramName}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{transfer.destProgramName}</span>
                      </div>
                      {transfer.notes && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{transfer.notes}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(transfer.pointsTransferred)}
                      <p className="text-xs text-muted-foreground" aria-label="Source BRL value">
                        {transfer.sourceBrl !== null
                          ? `~${formatCurrency(transfer.sourceBrl)}`
                          : 'Sem dados'}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(transfer.milesReceived)}
                      <p className="text-xs text-muted-foreground" aria-label="Destination BRL value">
                        {transfer.destBrl !== null
                          ? `~${formatCurrency(transfer.destBrl)}`
                          : 'Sem dados'}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      {transfer.bonusPercent > 0 ? (
                        <Badge variant="secondary" className="text-xs">
                          +{transfer.bonusPercent}%
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {transfer.totalCost !== null
                        ? formatCurrency(transfer.totalCost)
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {transfer.costPerMilheiro !== null && rating ? (
                        <Badge variant={RATING_VARIANTS[rating]} className="text-xs">
                          R${transfer.costPerMilheiro.toFixed(2)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <NetValueBadge
                        netValue={transfer.netValue}
                        netValueType={transfer.netValueType}
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(transfer.transferDate).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <EditTransferDialog transfer={transfer} />
                        <DeleteTransferButton
                          transferId={transfer.id}
                          sourceProgramName={transfer.sourceProgramName}
                          destProgramName={transfer.destProgramName}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
