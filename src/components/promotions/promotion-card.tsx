'use client';

import { useState } from 'react';
import { ExternalLink, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DeadlineCountdown } from './deadline-countdown';
import { PersonalizedBadge } from './personalized-badge';
import { PromoCalculatorEmbed } from '@/components/dashboard/promo-calculator-embed';
import type { PromotionWithPrograms } from '@/lib/services/promotion.service';
import type { PromoMatch } from '@/lib/services/promo-matcher.service';
import { PROMOTION_RATINGS, type PromotionRating } from '@/lib/validators/cost-calculator.schema';
import { PROMO_TYPE_LABELS } from '@/lib/validators/promotion-feed.schema';
import type { PromoType } from '@/generated/prisma/client';

const DEFAULT_PURCHASE_PRICE_PER_POINT = 0.028; // R$28 per milheiro

const TYPE_BADGE_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  TRANSFER_BONUS: 'default',
  POINT_PURCHASE: 'secondary',
  CLUB_SIGNUP: 'outline',
  MIXED: 'outline',
};

const RATING_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  EXCELLENT: 'default',
  GOOD: 'secondary',
  ACCEPTABLE: 'outline',
  AVOID: 'destructive',
};

interface PromotionCardProps {
  promotion: PromotionWithPrograms;
  match?: PromoMatch;
}

function buildCalculatorDefaults(promotion: PromotionWithPrograms) {
  if (promotion.type === 'TRANSFER_BONUS' && promotion.bonusPercent != null) {
    return {
      transferBonusPercent: promotion.bonusPercent,
      purchasePricePerPoint: DEFAULT_PURCHASE_PRICE_PER_POINT,
      quantity: 10000,
      ...(promotion.clubExtraBonus != null ? { clubExclusiveBonusPercent: promotion.clubExtraBonus } : {}),
    };
  }

  if (promotion.type === 'POINT_PURCHASE' && promotion.purchasePricePerK != null) {
    return {
      transferBonusPercent: 0,
      purchasePricePerPoint: Number(promotion.purchasePricePerK) / 1000,
      quantity: 10000,
    };
  }

  return undefined;
}

export function PromotionCard({ promotion, match }: PromotionCardProps) {
  const [showCalculator, setShowCalculator] = useState(false);
  const calculatorDefaults = buildCalculatorDefaults(promotion);
  const rating = (PROMOTION_RATINGS as readonly string[]).includes(promotion.rating ?? '')
    ? (promotion.rating as PromotionRating)
    : null;
  const costPerMilheiro = promotion.costPerMilheiro ? Number(promotion.costPerMilheiro) : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={TYPE_BADGE_VARIANTS[promotion.type] ?? 'outline'}>
                {PROMO_TYPE_LABELS[promotion.type as PromoType]}
              </Badge>
              {promotion.isVerified && (
                <Badge variant="secondary" className="text-xs">Verified</Badge>
              )}
              {promotion.requiresClub && (
                <Badge variant="outline" className="text-xs">Club Required</Badge>
              )}
            </div>
            <CardTitle className="text-base leading-snug">{promotion.title}</CardTitle>
          </div>
          {rating && (
            <Badge variant={RATING_VARIANTS[rating] ?? 'outline'} className="shrink-0">
              {rating}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Program transfer flow */}
        <ProgramFlow promotion={promotion} />

        {/* Personalized match badge */}
        {match && <PersonalizedBadge match={match} />}

        {/* Key metrics row */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {promotion.bonusPercent != null && (
            <div>
              <span className="text-muted-foreground">Bonus: </span>
              <span className="font-semibold">{promotion.bonusPercent}%</span>
            </div>
          )}
          {promotion.purchaseDiscount != null && (
            <div>
              <span className="text-muted-foreground">Discount: </span>
              <span className="font-semibold">{promotion.purchaseDiscount}%</span>
            </div>
          )}
          {costPerMilheiro != null && (
            <div>
              <span className="text-muted-foreground">Cost: </span>
              <span className="font-semibold">R${costPerMilheiro.toFixed(2)}/k</span>
            </div>
          )}
          {promotion.minimumTransfer != null && (
            <div>
              <span className="text-muted-foreground">Min: </span>
              <span className="font-medium">{promotion.minimumTransfer.toLocaleString('pt-BR')} pts</span>
            </div>
          )}
          {promotion.maxBonusCap != null && (
            <div>
              <span className="text-muted-foreground">Cap: </span>
              <span className="font-medium">{promotion.maxBonusCap.toLocaleString('pt-BR')} pts</span>
            </div>
          )}
        </div>

        {/* Deadline and source */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {promotion.deadline && (
              <DeadlineCountdown deadline={promotion.deadline} />
            )}
            {!promotion.deadline && (
              <span className="text-xs text-muted-foreground">No deadline</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <a
              href={promotion.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {promotion.sourceSiteName}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Embedded calculator toggle */}
        {calculatorDefaults && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => setShowCalculator((prev) => !prev)}
            >
              {showCalculator ? (
                <>Hide Calculator <ChevronUp className="h-3 w-3 ml-1" /></>
              ) : (
                <>Quick Calculator <ChevronDown className="h-3 w-3 ml-1" /></>
              )}
            </Button>
            {showCalculator && (
              <div className="mt-2">
                <PromoCalculatorEmbed
                  defaultInput={calculatorDefaults}
                  promoLabel={`Calculate: ${promotion.title}`}
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProgramFlow({ promotion }: { promotion: PromotionWithPrograms }) {
  const source = promotion.sourceProgram?.name;
  const dest = promotion.destProgram?.name;

  if (!source && !dest) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      {source && (
        <span className="font-medium">{source}</span>
      )}
      {source && dest && (
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
      )}
      {dest && (
        <span className="font-medium">{dest}</span>
      )}
    </div>
  );
}
