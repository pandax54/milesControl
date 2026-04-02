import { z } from 'zod';

export const createTransferSchema = z.object({
  sourceProgramName: z.string().min(1, 'Source program is required'),
  destProgramName: z.string().min(1, 'Destination program is required'),
  pointsTransferred: z.number().int().min(1, 'Points must be at least 1'),
  bonusPercent: z.number().min(0, 'Bonus must be non-negative').default(0),
  milesReceived: z.number().int().min(1, 'Miles received must be at least 1'),
  totalCost: z.number().min(0, 'Cost must be non-negative').nullable().optional(),
  notes: z.string().optional(),
  promotionId: z.string().optional(),
  transferDate: z.string().refine(
    (val) => !Number.isNaN(Date.parse(val)),
    { message: 'Invalid date' },
  ).optional(),
});

export const updateTransferSchema = z.object({
  transferId: z.string().min(1, 'Transfer ID is required'),
  sourceProgramName: z.string().min(1).optional(),
  destProgramName: z.string().min(1).optional(),
  pointsTransferred: z.number().int().min(1).optional(),
  bonusPercent: z.number().min(0).optional(),
  milesReceived: z.number().int().min(1).optional(),
  totalCost: z.number().min(0).nullable().optional(),
  notes: z.string().nullable().optional(),
  promotionId: z.string().nullable().optional(),
  transferDate: z.string().refine(
    (val) => !Number.isNaN(Date.parse(val)),
    { message: 'Invalid date' },
  ).optional(),
});

export const deleteTransferSchema = z.object({
  transferId: z.string().min(1, 'Transfer ID is required'),
});

export const transferConversionSchema = z.object({
  sourceProgramName: z.string().trim().min(1, 'Source program is required'),
  destProgramName: z.string().trim().min(1, 'Destination program is required'),
});

export type CreateTransferInput = z.infer<typeof createTransferSchema>;
export type UpdateTransferInput = z.infer<typeof updateTransferSchema>;
export type DeleteTransferInput = z.infer<typeof deleteTransferSchema>;
export type TransferConversionInput = z.infer<typeof transferConversionSchema>;

export interface TransferData {
  id: string;
  sourceProgramName: string;
  destProgramName: string;
  pointsTransferred: number;
  bonusPercent: number;
  milesReceived: number;
  totalCost: number | null;
  costPerMilheiro: number | null;
  promotionId: string | null;
  notes: string | null;
  transferDate: Date;
}
