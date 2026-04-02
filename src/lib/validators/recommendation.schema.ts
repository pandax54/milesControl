import { z } from 'zod';

export const sendRecommendationSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  promotionId: z.string().min(1, 'Promotion ID is required'),
  message: z.string().max(500, 'Message must be 500 characters or less').optional(),
});

export const sendBatchRecommendationsSchema = z.object({
  clientIds: z.array(z.string().min(1)).min(1, 'At least one client is required'),
  promotionId: z.string().min(1, 'Promotion ID is required'),
  message: z.string().max(500, 'Message must be 500 characters or less').optional(),
});

export type SendRecommendationInput = z.infer<typeof sendRecommendationSchema>;
export type SendBatchRecommendationsInput = z.infer<typeof sendBatchRecommendationsSchema>;
