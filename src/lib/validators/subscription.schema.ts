import { z } from 'zod';

export const accrualPhaseSchema = z.object({
  fromMonth: z.number().int().min(1, 'From month must be at least 1'),
  toMonth: z.number().int().min(1).nullable(),
  milesPerMonth: z.number().int().min(0, 'Miles must be non-negative'),
});

export const createSubscriptionSchema = z.object({
  clubTierId: z.string().min(1, 'Club tier is required'),
  startDate: z.string().min(1, 'Start date is required'),
  monthlyCost: z.number().positive('Monthly cost must be positive'),
  accrualSchedule: z.array(accrualPhaseSchema).min(1, 'At least one accrual phase is required'),
  nextBillingDate: z.string().optional(),
});

export const updateSubscriptionSchema = z.object({
  subscriptionId: z.string().min(1, 'Subscription ID is required'),
  status: z.enum(['ACTIVE', 'CANCELLED', 'EXPIRED', 'PAUSED']).optional(),
  monthlyCost: z.number().positive().optional(),
  accrualSchedule: z.array(accrualPhaseSchema).min(1).optional(),
  endDate: z.string().nullable().optional(),
  nextBillingDate: z.string().nullable().optional(),
});

export const deleteSubscriptionSchema = z.object({
  subscriptionId: z.string().min(1, 'Subscription ID is required'),
});

export type AccrualPhase = z.infer<typeof accrualPhaseSchema>;
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
export type DeleteSubscriptionInput = z.infer<typeof deleteSubscriptionSchema>;
