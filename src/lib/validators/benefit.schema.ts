import { z } from 'zod';

export const BENEFIT_TYPES = [
  'FREE_NIGHT',
  'COMPANION_PASS',
  'UPGRADE_CREDIT',
  'LOUNGE_ACCESS',
  'TRAVEL_CREDIT',
  'OTHER',
] as const;

export type BenefitTypeValue = (typeof BENEFIT_TYPES)[number];

export const BENEFIT_TYPE_LABELS: Record<BenefitTypeValue, string> = {
  FREE_NIGHT: 'Free Night',
  COMPANION_PASS: 'Companion Pass',
  UPGRADE_CREDIT: 'Upgrade Credit',
  LOUNGE_ACCESS: 'Lounge Access',
  TRAVEL_CREDIT: 'Travel Credit',
  OTHER: 'Other',
};

const dateStringSchema = z.string().refine(
  (val) => !Number.isNaN(Date.parse(val)),
  { message: 'Invalid date format' },
);

export const createBenefitSchema = z.object({
  type: z.enum(BENEFIT_TYPES, { message: 'Benefit type is required' }),
  programOrCard: z.string().min(1, 'Program or card is required'),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),
  expirationDate: dateStringSchema.nullable().optional(),
  notes: z.string().optional(),
});

export const updateBenefitSchema = z.object({
  benefitId: z.string().min(1, 'Benefit ID is required'),
  type: z.enum(BENEFIT_TYPES).optional(),
  programOrCard: z.string().min(1, 'Program or card is required').optional(),
  description: z.string().min(1, 'Description is required').optional(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').optional(),
  remainingQty: z.number().int().min(0, 'Remaining quantity must be non-negative').optional(),
  expirationDate: dateStringSchema.nullable().optional(),
  isUsed: z.boolean().optional(),
  notes: z.string().nullable().optional(),
});

export const deleteBenefitSchema = z.object({
  benefitId: z.string().min(1, 'Benefit ID is required'),
});

export const markBenefitUsedSchema = z.object({
  benefitId: z.string().min(1, 'Benefit ID is required'),
});

export type CreateBenefitInput = z.infer<typeof createBenefitSchema>;
export type UpdateBenefitInput = z.infer<typeof updateBenefitSchema>;
export type DeleteBenefitInput = z.infer<typeof deleteBenefitSchema>;
export type MarkBenefitUsedInput = z.infer<typeof markBenefitUsedSchema>;
