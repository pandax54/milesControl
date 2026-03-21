import { z } from 'zod';

// ==================== Rating type ====================

export const PROMOTION_RATINGS = ['EXCELLENT', 'GOOD', 'ACCEPTABLE', 'AVOID'] as const;
export type PromotionRating = (typeof PROMOTION_RATINGS)[number];

// ==================== Calculator input schemas ====================

export const calculatorInputSchema = z.object({
  purchasePricePerPoint: z.number().min(0, 'Purchase price must be non-negative'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  transferBonusPercent: z.number().min(0, 'Bonus must be non-negative').default(0),
  clubMonthlyCost: z.number().min(0, 'Club cost must be non-negative').optional(),
  clubExclusiveBonusPercent: z.number().min(0, 'Club bonus must be non-negative').optional(),
});

export const compareInputSchema = z.object({
  scenarios: z
    .array(calculatorInputSchema)
    .min(2, 'At least 2 scenarios are required')
    .max(3, 'At most 3 scenarios are allowed'),
});

export type CalculatorInput = z.infer<typeof calculatorInputSchema>;
export type CompareInput = z.infer<typeof compareInputSchema>;
