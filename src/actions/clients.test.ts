import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./helpers', () => {
  class AuthenticationError extends Error {
    constructor() {
      super('Not authenticated');
      this.name = 'AuthenticationError';
    }
  }
  class AuthorizationError extends Error {
    constructor() {
      super('Not authorized');
      this.name = 'AuthorizationError';
    }
  }
  return {
    requireAdminRole: vi.fn(),
    isAuthenticationError: (error: unknown) => error instanceof AuthenticationError,
    isAuthorizationError: (error: unknown) => error instanceof AuthorizationError,
    AuthenticationError,
    AuthorizationError,
  };
});

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/services/client-management.service', () => ({
  createClient: vi.fn(),
  updateClient: vi.fn(),
  deleteClient: vi.fn(),
  ClientNotFoundError: class extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = 'ClientNotFoundError';
    }
  },
  ClientEmailAlreadyExistsError: class extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = 'ClientEmailAlreadyExistsError';
    }
  },
}));

import { revalidatePath } from 'next/cache';
import {
  createClient,
  updateClient,
  deleteClient,
  ClientNotFoundError,
  ClientEmailAlreadyExistsError,
} from '@/lib/services/client-management.service';
import { requireAdminRole, AuthenticationError, AuthorizationError } from './helpers';
import { addClient, editClient, removeClient } from './clients';

const mockRequireAdminRole = vi.mocked(requireAdminRole);
const mockCreateClient = vi.mocked(createClient);
const mockUpdateClient = vi.mocked(updateClient);
const mockDeleteClient = vi.mocked(deleteClient);

const ADMIN_ID = 'admin-1';
const CLIENT_ID = 'client-1';

describe('addClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a client and revalidate path', async () => {
    mockRequireAdminRole.mockResolvedValue(ADMIN_ID);
    mockCreateClient.mockResolvedValue({
      id: CLIENT_ID,
      email: 'client@example.com',
      name: 'Test Client',
      createdAt: new Date(),
      totalMiles: 0,
      totalPoints: 0,
      enrollmentCount: 0,
      activeSubscriptionCount: 0,
    });

    const result = await addClient({ name: 'Test Client', email: 'client@example.com' });

    expect(result.success).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/clients');
  });

  it('should return error when input is invalid', async () => {
    const result = await addClient({ name: '', email: 'not-an-email' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('should return authentication error', async () => {
    mockRequireAdminRole.mockRejectedValue(new AuthenticationError());

    const result = await addClient({ name: 'Test', email: 'test@example.com' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be logged in to perform this action');
  });

  it('should return authorization error for non-admin', async () => {
    mockRequireAdminRole.mockRejectedValue(new AuthorizationError());

    const result = await addClient({ name: 'Test', email: 'test@example.com' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Admin access required');
  });

  it('should return error when email already registered', async () => {
    mockRequireAdminRole.mockResolvedValue(ADMIN_ID);
    mockCreateClient.mockRejectedValue(new ClientEmailAlreadyExistsError('test@example.com'));

    const result = await addClient({ name: 'Test', email: 'test@example.com' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Email already registered');
  });
});

describe('editClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update client and revalidate paths', async () => {
    mockRequireAdminRole.mockResolvedValue(ADMIN_ID);
    mockUpdateClient.mockResolvedValue(undefined);

    const result = await editClient({ clientId: CLIENT_ID, name: 'New Name' });

    expect(result.success).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/clients');
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/clients/${CLIENT_ID}`);
  });

  it('should return error when clientId is missing', async () => {
    const result = await editClient({ clientId: '' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
  });

  it('should return error when client not found', async () => {
    mockRequireAdminRole.mockResolvedValue(ADMIN_ID);
    mockUpdateClient.mockRejectedValue(new ClientNotFoundError(CLIENT_ID));

    const result = await editClient({ clientId: CLIENT_ID, name: 'Name' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Client not found');
  });

  it('should return error when email already taken', async () => {
    mockRequireAdminRole.mockResolvedValue(ADMIN_ID);
    mockUpdateClient.mockRejectedValue(new ClientEmailAlreadyExistsError('taken@example.com'));

    const result = await editClient({ clientId: CLIENT_ID, email: 'taken@example.com' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Email already registered');
  });
});

describe('removeClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete client and revalidate path', async () => {
    mockRequireAdminRole.mockResolvedValue(ADMIN_ID);
    mockDeleteClient.mockResolvedValue(undefined);

    const result = await removeClient(CLIENT_ID);

    expect(result.success).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/clients');
  });

  it('should return error when clientId is empty', async () => {
    const result = await removeClient('');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
  });

  it('should return error when client not found', async () => {
    mockRequireAdminRole.mockResolvedValue(ADMIN_ID);
    mockDeleteClient.mockRejectedValue(new ClientNotFoundError(CLIENT_ID));

    const result = await removeClient(CLIENT_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Client not found');
  });

  it('should return authentication error', async () => {
    mockRequireAdminRole.mockRejectedValue(new AuthenticationError());

    const result = await removeClient(CLIENT_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be logged in to perform this action');
  });
});
