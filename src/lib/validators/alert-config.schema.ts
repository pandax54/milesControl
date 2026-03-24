import { z } from 'zod';

export const ALERT_CHANNELS = ['IN_APP', 'EMAIL', 'TELEGRAM', 'WEB_PUSH'] as const;
export const PROMO_TYPES = ['TRANSFER_BONUS', 'POINT_PURCHASE', 'CLUB_SIGNUP', 'MIXED'] as const;

export type AlertChannelValue = (typeof ALERT_CHANNELS)[number];
export type PromoTypeValue = (typeof PROMO_TYPES)[number];

export const ALERT_CHANNEL_LABELS: Record<AlertChannelValue, string> = {
  IN_APP: 'In-App',
  EMAIL: 'Email',
  TELEGRAM: 'Telegram',
  WEB_PUSH: 'Web Push',
};

export const PROMO_TYPE_LABELS: Record<PromoTypeValue, string> = {
  TRANSFER_BONUS: 'Transfer Bonus',
  POINT_PURCHASE: 'Point Purchase',
  CLUB_SIGNUP: 'Club Signup',
  MIXED: 'Mixed',
};

export const createAlertConfigSchema = z.object({
  name: z.string().min(1, 'Rule name is required').max(100, 'Name is too long'),
  channels: z
    .array(z.enum(ALERT_CHANNELS))
    .min(1, 'At least one notification channel is required'),
  programNames: z.array(z.string()).default([]),
  promoTypes: z.array(z.enum(PROMO_TYPES)).default([]),
  minBonusPercent: z
    .number()
    .min(0, 'Must be non-negative')
    .max(1000, 'Value too large')
    .nullable()
    .optional(),
  maxCostPerMilheiro: z
    .number()
    .min(0, 'Must be non-negative')
    .max(1000, 'Value too large')
    .nullable()
    .optional(),
  telegramChatId: z.string().nullable().optional(),
});

export const updateAlertConfigSchema = z.object({
  alertConfigId: z.string().min(1, 'Alert config ID is required'),
  name: z.string().min(1, 'Rule name is required').max(100, 'Name is too long').optional(),
  channels: z.array(z.enum(ALERT_CHANNELS)).min(1, 'At least one channel is required').optional(),
  programNames: z.array(z.string()).optional(),
  promoTypes: z.array(z.enum(PROMO_TYPES)).optional(),
  minBonusPercent: z.number().min(0).max(1000).nullable().optional(),
  maxCostPerMilheiro: z.number().min(0).max(1000).nullable().optional(),
  telegramChatId: z.string().nullable().optional(),
});

export const deleteAlertConfigSchema = z.object({
  alertConfigId: z.string().min(1, 'Alert config ID is required'),
});

export const toggleAlertConfigSchema = z.object({
  alertConfigId: z.string().min(1, 'Alert config ID is required'),
  isActive: z.boolean(),
});

export type CreateAlertConfigInput = z.infer<typeof createAlertConfigSchema>;
export type UpdateAlertConfigInput = z.infer<typeof updateAlertConfigSchema>;
export type DeleteAlertConfigInput = z.infer<typeof deleteAlertConfigSchema>;
export type ToggleAlertConfigInput = z.infer<typeof toggleAlertConfigSchema>;
