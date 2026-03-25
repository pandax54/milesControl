import { z } from 'zod';

export const createClientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

export const updateClientSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  name: z.string().min(1).max(100).optional(),
  email: z.string().email('Invalid email address').optional(),
});

export const deleteClientSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type DeleteClientInput = z.infer<typeof deleteClientSchema>;
