'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ALERT_CHANNEL_LABELS,
  PROMO_TYPE_LABELS,
  type AlertChannelValue,
  type PromoTypeValue,
} from '@/lib/validators/alert-config.schema';
import { EditAlertConfigDialog, type AlertConfigData } from './edit-alert-config-dialog';
import { DeleteAlertConfigButton } from './delete-alert-config-button';
import { ToggleAlertConfigButton } from './toggle-alert-config-button';

interface AlertConfigCardProps {
  alertConfig: AlertConfigData;
}

function formatCostPerMilheiro(value: number | string | null): string | null {
  if (value === null || value === undefined) return null;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return null;
  return `R$${num.toFixed(2)}/k`;
}

export function AlertConfigCard({ alertConfig }: AlertConfigCardProps) {
  const hasPrograms = alertConfig.programNames.length > 0;
  const hasPromoTypes = alertConfig.promoTypes.length > 0;
  const hasCriteria =
    hasPrograms ||
    hasPromoTypes ||
    alertConfig.minBonusPercent !== null ||
    alertConfig.maxCostPerMilheiro !== null;

  return (
    <Card className={alertConfig.isActive ? undefined : 'opacity-60'}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="flex-1 min-w-0">
          <CardTitle className="text-base font-semibold truncate">
            {alertConfig.name}
          </CardTitle>
          <div className="mt-1">
            <ToggleAlertConfigButton
              alertConfigId={alertConfig.id}
              isActive={alertConfig.isActive}
            />
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <EditAlertConfigDialog alertConfig={alertConfig} />
          <DeleteAlertConfigButton
            alertConfigId={alertConfig.id}
            alertConfigName={alertConfig.name}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Channels
          </p>
          <div className="flex flex-wrap gap-1">
            {alertConfig.channels.map((channel) => (
              <Badge key={channel} variant="secondary" className="text-xs">
                {ALERT_CHANNEL_LABELS[channel as AlertChannelValue] ?? channel}
              </Badge>
            ))}
          </div>
        </div>

        {hasCriteria && (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Filters
            </p>

            {hasPrograms && (
              <div className="flex flex-wrap gap-1 items-center">
                <span className="text-xs">Programs:</span>
                {alertConfig.programNames.map((name) => (
                  <Badge key={name} variant="outline" className="text-xs">
                    {name}
                  </Badge>
                ))}
              </div>
            )}

            {hasPromoTypes && (
              <div className="flex flex-wrap gap-1 items-center">
                <span className="text-xs">Types:</span>
                {alertConfig.promoTypes.map((type) => (
                  <Badge key={type} variant="outline" className="text-xs">
                    {PROMO_TYPE_LABELS[type as PromoTypeValue] ?? type}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex gap-4">
              {alertConfig.minBonusPercent !== null && (
                <span className="text-xs">
                  Min bonus: <strong>{alertConfig.minBonusPercent}%</strong>
                </span>
              )}
              {alertConfig.maxCostPerMilheiro !== null && (
                <span className="text-xs">
                  Max cost:{' '}
                  <strong>{formatCostPerMilheiro(alertConfig.maxCostPerMilheiro)}</strong>
                </span>
              )}
            </div>
          </div>
        )}

        {!hasCriteria && (
          <p className="text-xs text-muted-foreground italic">
            No filters — alerts for all promotions
          </p>
        )}
      </CardContent>
    </Card>
  );
}
