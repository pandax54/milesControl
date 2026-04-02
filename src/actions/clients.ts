'use server';

import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';
import {
  createClientSchema,
  updateClientSchema,
  deleteClientSchema,
  type CreateClientInput,
  type UpdateClientInput,
} from '@/lib/validators/client.schema';
import {
  createClient as createClientService,
  updateClient as updateClientService,
  deleteClient as deleteClientService,
  ClientNotFoundError,
  ClientEmailAlreadyExistsError,
} from '@/lib/services/client-management.service';
import { logAuditAction, AUDIT_ACTIONS } from '@/lib/services/audit-log.service';
import {
  requireAdminRole,
  isAuthenticationError,
  isAuthorizationError,
  type ActionResult,
} from './helpers';

const CLIENTS_PATH = '/admin/clients';

export async function addClient(input: CreateClientInput): Promise<ActionResult> {
  const parsed = createClientSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const adminId = await requireAdminRole();
    const client = await createClientService(adminId, parsed.data);
    await logAuditAction(adminId, AUDIT_ACTIONS.CREATE_CLIENT, { email: parsed.data.email }, client.id);
    revalidatePath(CLIENTS_PATH);
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    if (isAuthorizationError(error)) {
      return { success: false, error: 'Admin access required' };
    }
    if (error instanceof ClientEmailAlreadyExistsError) {
      return { success: false, error: 'Email already registered' };
    }
    logger.error({ err: error }, 'Failed to create client');
    return { success: false, error: 'Failed to add client. Please try again.' };
  }
}

export async function editClient(input: UpdateClientInput): Promise<ActionResult> {
  const parsed = updateClientSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const adminId = await requireAdminRole();
    await updateClientService(adminId, parsed.data);
    await logAuditAction(
      adminId,
      AUDIT_ACTIONS.UPDATE_CLIENT,
      { name: parsed.data.name, email: parsed.data.email },
      parsed.data.clientId,
    );
    revalidatePath(CLIENTS_PATH);
    revalidatePath(`${CLIENTS_PATH}/${parsed.data.clientId}`);
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    if (isAuthorizationError(error)) {
      return { success: false, error: 'Admin access required' };
    }
    if (error instanceof ClientNotFoundError) {
      return { success: false, error: 'Client not found' };
    }
    if (error instanceof ClientEmailAlreadyExistsError) {
      return { success: false, error: 'Email already registered' };
    }
    logger.error({ err: error }, 'Failed to update client');
    return { success: false, error: 'Failed to update client. Please try again.' };
  }
}

export async function removeClient(clientId: string): Promise<ActionResult> {
  const parsed = deleteClientSchema.safeParse({ clientId });
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const adminId = await requireAdminRole();
    await deleteClientService(adminId, parsed.data.clientId);
    await logAuditAction(adminId, AUDIT_ACTIONS.DELETE_CLIENT, {}, parsed.data.clientId);
    revalidatePath(CLIENTS_PATH);
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    if (isAuthorizationError(error)) {
      return { success: false, error: 'Admin access required' };
    }
    if (error instanceof ClientNotFoundError) {
      return { success: false, error: 'Client not found' };
    }
    logger.error({ err: error }, 'Failed to delete client');
    return { success: false, error: 'Failed to remove client. Please try again.' };
  }
}
