import { Star, User } from 'lucide-react';
import type { PromoMatch } from '@/lib/services/promo-matcher.service';

interface PersonalizedBadgeProps {
  match: PromoMatch;
}

const MATCH_ICON = {
  SOURCE: Star,
  BOTH: Star,
  DESTINATION: User,
} as const;

export function PersonalizedBadge({ match }: PersonalizedBadgeProps) {
  const Icon = MATCH_ICON[match.matchType];

  return (
    <div className="flex items-start gap-2 rounded-md bg-primary/10 px-3 py-2 text-xs text-primary">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div>
        <span className="font-semibold">Relevant for you: </span>
        <span>{match.reason}</span>
      </div>
    </div>
  );
}
