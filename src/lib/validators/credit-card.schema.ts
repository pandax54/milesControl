import { z } from 'zod';

export const createCreditCardSchema = z.object({
  bankName: z.string().min(1, 'Bank name is required'),
  cardName: z.string().min(1, 'Card name is required'),
  pointsProgram: z.string().min(1, 'Points program is required'),
  pointsPerReal: z.number().positive('Points per real must be positive'),
  pointsPerDollar: z.number().positive('Points per dollar must be positive').optional(),
  annualFee: z.number().min(0, 'Annual fee must be non-negative').default(0),
  isWaivedFee: z.boolean().default(false),
  benefits: z.array(z.string()).optional(),
});

export const updateCreditCardSchema = z.object({
  cardId: z.string().min(1, 'Card ID is required'),
  bankName: z.string().min(1, 'Bank name is required').optional(),
  cardName: z.string().min(1, 'Card name is required').optional(),
  pointsProgram: z.string().min(1, 'Points program is required').optional(),
  pointsPerReal: z.number().positive('Points per real must be positive').optional(),
  pointsPerDollar: z.number().positive('Points per dollar must be positive').nullable().optional(),
  annualFee: z.number().min(0, 'Annual fee must be non-negative').optional(),
  isWaivedFee: z.boolean().optional(),
  benefits: z.array(z.string()).nullable().optional(),
});

export const deleteCreditCardSchema = z.object({
  cardId: z.string().min(1, 'Card ID is required'),
});

export type CreateCreditCardInput = z.infer<typeof createCreditCardSchema>;
export type UpdateCreditCardInput = z.infer<typeof updateCreditCardSchema>;
export type DeleteCreditCardInput = z.infer<typeof deleteCreditCardSchema>;
