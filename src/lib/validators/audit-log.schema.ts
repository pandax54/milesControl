import { z } from 'zod';

export const fetchAuditLogsSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  targetUserId: z.string().min(1).optional(),
  action: z.string().min(1).optional(),
});

export type FetchAuditLogsInput = z.infer<typeof fetchAuditLogsSchema>;
