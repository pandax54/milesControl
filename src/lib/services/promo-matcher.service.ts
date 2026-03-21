import type { PromotionWithPrograms } from './promotion.service';

// ==================== Types ====================

export interface EnrollmentSummary {
  readonly programId: string;
  readonly programName: string;
  readonly currentBalance: number;
}

export type PromoMatchType = 'SOURCE' | 'DESTINATION' | 'BOTH';

export interface PromoMatch {
  readonly promotionId: string;
  readonly matchType: PromoMatchType;
  readonly reason: string;
  readonly relevanceScore: number;
}

// ==================== Constants ====================

const SOURCE_MATCH_SCORE = 10;
const DESTINATION_MATCH_SCORE = 5;
const BOTH_MATCH_SCORE = 15;

// ==================== Core matching ====================

/**
 * Match a single promotion against the user's enrolled programs.
 * Returns null when the promotion is not relevant to the user.
 */
export function matchPromotion(
  promotion: PromotionWithPrograms,
  enrollments: readonly EnrollmentSummary[],
): PromoMatch | null {
  if (enrollments.length === 0) {
    return null;
  }

  const enrollmentByProgramId = new Map(
    enrollments.map((e) => [e.programId, e]),
  );

  const sourceEnrollment = promotion.sourceProgramId
    ? enrollmentByProgramId.get(promotion.sourceProgramId)
    : undefined;

  const destEnrollment = promotion.destProgramId
    ? enrollmentByProgramId.get(promotion.destProgramId)
    : undefined;

  if (!sourceEnrollment && !destEnrollment) {
    return null;
  }

  if (sourceEnrollment && destEnrollment) {
    return {
      promotionId: promotion.id,
      matchType: 'BOTH',
      reason: buildBothMatchReason(sourceEnrollment, destEnrollment),
      relevanceScore: BOTH_MATCH_SCORE,
    };
  }

  if (sourceEnrollment) {
    return {
      promotionId: promotion.id,
      matchType: 'SOURCE',
      reason: buildSourceMatchReason(sourceEnrollment, promotion),
      relevanceScore: SOURCE_MATCH_SCORE,
    };
  }

  if (destEnrollment) {
    return {
      promotionId: promotion.id,
      matchType: 'DESTINATION',
      reason: buildDestinationMatchReason(destEnrollment),
      relevanceScore: DESTINATION_MATCH_SCORE,
    };
  }

  return null;
}

/**
 * Match all promotions against the user's enrollments.
 * Returns a Map keyed by promotion ID for O(1) lookup.
 */
export function matchPromotions(
  promotions: readonly PromotionWithPrograms[],
  enrollments: readonly EnrollmentSummary[],
): Map<string, PromoMatch> {
  const matches = new Map<string, PromoMatch>();

  if (enrollments.length === 0) {
    return matches;
  }

  for (const promotion of promotions) {
    const match = matchPromotion(promotion, enrollments);
    if (match) {
      matches.set(match.promotionId, match);
    }
  }

  return matches;
}

// ==================== Reason builders ====================

function formatBalance(balance: number): string {
  return balance.toLocaleString('pt-BR');
}

function buildSourceMatchReason(
  enrollment: EnrollmentSummary,
  promotion: PromotionWithPrograms,
): string {
  const balanceText = `You have ${formatBalance(enrollment.currentBalance)} ${enrollment.programName} points`;

  if (promotion.type === 'TRANSFER_BONUS' && promotion.bonusPercent != null) {
    return `${balanceText} — transfer with ${promotion.bonusPercent}% bonus`;
  }

  return balanceText;
}

function buildDestinationMatchReason(enrollment: EnrollmentSummary): string {
  return `You're enrolled in ${enrollment.programName}`;
}

function buildBothMatchReason(
  sourceEnrollment: EnrollmentSummary,
  destEnrollment: EnrollmentSummary,
): string {
  return `You have ${formatBalance(sourceEnrollment.currentBalance)} ${sourceEnrollment.programName} points to transfer to your ${destEnrollment.programName} account`;
}
