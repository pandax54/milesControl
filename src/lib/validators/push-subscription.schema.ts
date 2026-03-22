import { z } from 'zod';

export const registerPushSubscriptionSchema = z.object({
  endpoint: z.string().url('Endpoint must be a valid URL'),
  p256dh: z.string().min(1, 'p256dh key is required'),
  auth: z.string().min(1, 'auth key is required'),
  userAgent: z.string().optional(),
});

export type RegisterPushSubscriptionInput = z.infer<typeof registerPushSubscriptionSchema>;

export const unregisterPushSubscriptionSchema = z.object({
  endpoint: z.string().url('Endpoint must be a valid URL'),
});

export type UnregisterPushSubscriptionInput = z.infer<typeof unregisterPushSubscriptionSchema>;
