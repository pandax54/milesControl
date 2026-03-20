'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EditCreditCardDialog } from './edit-credit-card-dialog';
import { DeleteCreditCardButton } from './delete-credit-card-button';
import type { Decimal } from '@prisma/client/runtime/client';

export interface CreditCardData {
  id: string;
  bankName: string;
  cardName: string;
  pointsProgram: string;
  pointsPerReal: number;
  pointsPerDollar: number | null;
  annualFee: Decimal | number;
  isWaivedFee: boolean;
  benefits: string[] | null;
}

interface CreditCardCardProps {
  card: CreditCardData;
}

function formatCurrency(value: Decimal | number): string {
  const num = typeof value === 'number' ? value : Number(value);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
}

export function CreditCardCard({ card }: CreditCardCardProps) {
  const annualFeeNum = typeof card.annualFee === 'number' ? card.annualFee : Number(card.annualFee);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold">
            {card.cardName}
          </CardTitle>
          <Badge variant="secondary">{card.bankName}</Badge>
        </div>
        <div className="flex items-center gap-1">
          <EditCreditCardDialog card={card} />
          <DeleteCreditCardButton
            cardId={card.id}
            cardName={card.cardName}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Program:</span>
            <Badge variant="outline">{card.pointsProgram}</Badge>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>{card.pointsPerReal} pts/R$</span>
            {card.pointsPerDollar && (
              <span>{card.pointsPerDollar} pts/US$</span>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              Annual fee: {annualFeeNum === 0 ? 'Free' : formatCurrency(card.annualFee)}
            </span>
            {card.isWaivedFee && annualFeeNum > 0 && (
              <Badge variant="outline" className="text-green-600 dark:text-green-400">
                Waived
              </Badge>
            )}
          </div>

          {card.benefits && card.benefits.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {card.benefits.map((benefit) => (
                <Badge key={benefit} variant="secondary" className="text-xs">
                  {benefit}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
