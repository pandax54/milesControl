'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BENEFIT_TYPE_LABELS, type BenefitTypeValue } from '@/lib/validators/benefit.schema';
import { EditBenefitDialog } from './edit-benefit-dialog';
import { DeleteBenefitButton } from './delete-benefit-button';
import { UseBenefitButton } from './use-benefit-button';

export interface BenefitData {
  id: string;
  type: string;
  programOrCard: string;
  description: string;
  quantity: number;
  remainingQty: number;
  expirationDate: string | null;
  isUsed: boolean;
  usedAt: string | null;
  notes: string | null;
}

interface BenefitCardProps {
  benefit: BenefitData;
}

const EXPIRATION_WARNING_DAYS = 30;
const MILLISECONDS_PER_DAY = 86_400_000;

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function getExpirationStatus(expirationDate: string | null): 'expired' | 'warning' | 'ok' | null {
  if (!expirationDate) return null;

  const now = new Date();
  const expiry = new Date(expirationDate);
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / MILLISECONDS_PER_DAY);

  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= EXPIRATION_WARNING_DAYS) return 'warning';
  return 'ok';
}

function getExpirationBadgeVariant(status: 'expired' | 'warning' | 'ok'): 'destructive' | 'secondary' | 'outline' {
  if (status === 'expired') return 'destructive';
  if (status === 'warning') return 'secondary';
  return 'outline';
}

export function BenefitCard({ benefit }: BenefitCardProps) {
  const typeLabel = BENEFIT_TYPE_LABELS[benefit.type as BenefitTypeValue] ?? benefit.type;
  const expirationStatus = getExpirationStatus(benefit.expirationDate);

  return (
    <Card className={benefit.isUsed ? 'opacity-60' : undefined}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold">
            {benefit.description}
          </CardTitle>
          <Badge variant="secondary">{typeLabel}</Badge>
        </div>
        <div className="flex items-center gap-1">
          {!benefit.isUsed && (
            <UseBenefitButton benefitId={benefit.id} benefitDescription={benefit.description} />
          )}
          <EditBenefitDialog benefit={benefit} />
          <DeleteBenefitButton
            benefitId={benefit.id}
            benefitDescription={benefit.description}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Source:</span>
            <Badge variant="outline">{benefit.programOrCard}</Badge>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>
              {benefit.remainingQty}/{benefit.quantity} remaining
            </span>
            {benefit.isUsed && (
              <Badge variant="secondary" className="text-xs">
                Fully used
              </Badge>
            )}
          </div>

          {benefit.expirationDate && expirationStatus && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Expires: {formatDate(benefit.expirationDate)}</span>
              {expirationStatus === 'expired' && (
                <Badge variant={getExpirationBadgeVariant(expirationStatus)} className="text-xs">
                  Expired
                </Badge>
              )}
              {expirationStatus === 'warning' && (
                <Badge variant={getExpirationBadgeVariant(expirationStatus)} className="text-xs text-yellow-600 dark:text-yellow-400">
                  Expiring soon
                </Badge>
              )}
            </div>
          )}

          {benefit.notes && (
            <p className="text-sm text-muted-foreground italic">{benefit.notes}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
