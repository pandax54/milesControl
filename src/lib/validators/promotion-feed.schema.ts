import { z } from 'zod';

export const PROMO_STATUS_OPTIONS = ['ACTIVE', 'EXPIRED'] as const;
export const PROMO_TYPE_OPTIONS = ['TRANSFER_BONUS', 'POINT_PURCHASE', 'CLUB_SIGNUP', 'MIXED'] as const;
export const PROMO_SORT_OPTIONS = ['detectedAt', 'costPerMilheiro', 'deadline', 'bonusPercent'] as const;

export const PROMO_TYPE_LABELS: Record<(typeof PROMO_TYPE_OPTIONS)[number], string> = {
  TRANSFER_BONUS: 'Transfer Bonus',
  POINT_PURCHASE: 'Point Purchase',
  CLUB_SIGNUP: 'Club Signup',
  MIXED: 'Mixed',
};

export const PROMO_SORT_LABELS: Record<(typeof PROMO_SORT_OPTIONS)[number], string> = {
  detectedAt: 'Most Recent',
  costPerMilheiro: 'Best Value',
  deadline: 'Deadline',
  bonusPercent: 'Highest Bonus',
};

export const promotionFeedFilterSchema = z.object({
  status: z.enum(PROMO_STATUS_OPTIONS).optional(),
  type: z.enum(PROMO_TYPE_OPTIONS).optional(),
  programId: z.string().optional(),
  sortBy: z.enum(PROMO_SORT_OPTIONS).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export type PromotionFeedFilter = z.infer<typeof promotionFeedFilterSchema>;
