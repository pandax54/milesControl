import { ArrowRight, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PROMO_TYPE_LABELS } from '@/lib/validators/promotion-feed.schema';
import { PromoMatchClientsDialog } from './promo-match-clients-dialog';
import type { PromotionWithClientMatches } from '@/lib/services/admin-promo-matching.service';
import type { PromoType } from '@/generated/prisma/client';

interface PromoMatchingListProps {
  items: readonly PromotionWithClientMatches[];
}

export function PromoMatchingList({ items }: PromoMatchingListProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">No active promotions found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <PromoMatchingCard key={item.promotion.id} item={item} />
      ))}
    </div>
  );
}

function PromoMatchingCard({ item }: { item: PromotionWithClientMatches }) {
  const { promotion, matchedClientCount, totalClientCount, matches } = item;
  const source = promotion.sourceProgram?.name;
  const dest = promotion.destProgram?.name;
  const hasMatches = matchedClientCount > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {PROMO_TYPE_LABELS[promotion.type as PromoType]}
              </Badge>
              {promotion.isVerified && (
                <Badge variant="secondary" className="text-xs">
                  Verified
                </Badge>
              )}
            </div>
            <CardTitle className="text-base">{promotion.title}</CardTitle>
            {(source ?? dest) && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                {source && <span>{source}</span>}
                {source && dest && <ArrowRight className="h-3.5 w-3.5" />}
                {dest && <span>{dest}</span>}
              </div>
            )}
          </div>
          <Badge
            variant={hasMatches ? 'default' : 'secondary'}
            className="flex shrink-0 items-center gap-1"
          >
            <Users className="h-3 w-3" />
            {matchedClientCount} of {totalClientCount} clients
          </Badge>
        </div>
      </CardHeader>
      {hasMatches && (
        <CardContent>
          <PromoMatchClientsDialog
            promotionTitle={promotion.title}
            matches={matches}
            totalClientCount={totalClientCount}
          />
        </CardContent>
      )}
    </Card>
  );
}
