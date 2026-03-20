'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DeleteSubscriptionButton } from './delete-subscription-button';
import { EditSubscriptionDialog } from './edit-subscription-dialog';
import { ExternalLink } from 'lucide-react';
import type { AccrualPhase } from '@/lib/validators/subscription.schema';

interface SubscriptionCardProps {
  subscription: {
    id: string;
    status: string;
    startDate: Date;
    endDate: Date | null;
    monthlyCost: string | number | { toString(): string };
    totalMilesAccrued: number;
    nextBillingDate: Date | null;
    accrualSchedule: unknown;
    clubTier: {
      name: string;
      baseMonthlyMiles: number;
      minimumStayMonths: number;
      program: {
        name: string;
        currency: string;
        website: string | null;
      };
    };
  };
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'default',
  PAUSED: 'secondary',
  CANCELLED: 'destructive',
  EXPIRED: 'outline',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
};

function formatCurrency(value: string | number | { toString(): string }): string {
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}

function formatMiles(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

function describeAccrualSchedule(schedule: unknown, currency: string): string {
  if (!Array.isArray(schedule) || schedule.length === 0) return '—';

  const phases = schedule as AccrualPhase[];

  if (phases.length === 1) {
    const phase = phases[0];
    return `${formatMiles(phase.milesPerMonth)} ${currency}/mês`;
  }

  return phases
    .map((phase) => {
      const range =
        phase.toMonth === null
          ? `Mês ${phase.fromMonth}+`
          : `Mês ${phase.fromMonth}–${phase.toMonth}`;
      return `${range}: ${formatMiles(phase.milesPerMonth)}/mês`;
    })
    .join(' · ');
}

export function SubscriptionCard({ subscription }: SubscriptionCardProps) {
  const statusVariant = STATUS_VARIANTS[subscription.status] ?? 'outline';
  const statusLabel = STATUS_LABELS[subscription.status] ?? subscription.status;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-base font-semibold">
              {subscription.clubTier.name}
            </CardTitle>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{subscription.clubTier.program.name}</p>
        </div>
        <div className="flex items-center gap-1">
          {subscription.clubTier.program.website && (
            <a
              href={subscription.clubTier.program.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <EditSubscriptionDialog subscription={subscription} />
          <DeleteSubscriptionButton
            subscriptionId={subscription.id}
            tierName={subscription.clubTier.name}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">
            {formatCurrency(subscription.monthlyCost)}
          </span>
          <span className="text-sm text-muted-foreground">/mês</span>
        </div>

        <div className="text-sm text-muted-foreground">
          {describeAccrualSchedule(
            subscription.accrualSchedule,
            subscription.clubTier.program.currency
          )}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>
            Desde{' '}
            {new Date(subscription.startDate).toLocaleDateString('pt-BR', {
              month: 'short',
              year: 'numeric',
            })}
          </span>
          {subscription.nextBillingDate && (
            <span>
              Próx. cobrança:{' '}
              {new Date(subscription.nextBillingDate).toLocaleDateString('pt-BR')}
            </span>
          )}
          {subscription.totalMilesAccrued > 0 && (
            <span>
              Acumulado: {formatMiles(subscription.totalMilesAccrued)}{' '}
              {subscription.clubTier.program.currency}
            </span>
          )}
        </div>

        {subscription.clubTier.minimumStayMonths > 0 && (
          <p className="text-xs text-muted-foreground">
            Permanência mínima: {subscription.clubTier.minimumStayMonths} meses
          </p>
        )}
      </CardContent>
    </Card>
  );
}
