import { z } from 'zod';

export const enrollProgramSchema = z.object({
  programId: z.string().min(1, 'Program is required'),
  memberNumber: z.string().optional(),
  currentBalance: z.number().int().min(0, 'Balance must be non-negative').default(0),
  tier: z.string().optional(),
  expirationDate: z.string().datetime().optional(),
});

export const updateEnrollmentSchema = z.object({
  enrollmentId: z.string().min(1, 'Enrollment ID is required'),
  memberNumber: z.string().optional(),
  currentBalance: z.number().int().min(0, 'Balance must be non-negative').optional(),
  tier: z.string().optional(),
  expirationDate: z.string().datetime().nullable().optional(),
});

export const deleteEnrollmentSchema = z.object({
  enrollmentId: z.string().min(1, 'Enrollment ID is required'),
});

export const quickUpdateBalanceSchema = z.object({
  enrollmentId: z.string().min(1, 'Enrollment ID is required'),
  mode: z.enum(['add', 'subtract', 'set']),
  amount: z.number().int().min(0, 'Amount must be non-negative'),
});

export type EnrollProgramInput = z.infer<typeof enrollProgramSchema>;
export type UpdateEnrollmentInput = z.infer<typeof updateEnrollmentSchema>;
export type DeleteEnrollmentInput = z.infer<typeof deleteEnrollmentSchema>;
export type QuickUpdateBalanceInput = z.infer<typeof quickUpdateBalanceSchema>;
