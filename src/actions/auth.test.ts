import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerUser } from './auth';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { prisma } from '@/lib/prisma';

const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockCreate = vi.mocked(prisma.user.create);

describe('registerUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should register a new user successfully', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: 'test-id',
      email: 'test@example.com',
      name: 'Test User',
      passwordHash: 'hashed',
      image: null,
      role: 'USER',
      managedById: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await registerUser({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    });

    expect(result.success).toBe(true);
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it('should return error for invalid input', async () => {
    const result = await registerUser({
      name: '',
      email: 'invalid',
      password: '123',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('should return error when email already exists', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'existing-id',
      email: 'test@example.com',
      name: 'Existing User',
      passwordHash: 'hashed',
      image: null,
      role: 'USER',
      managedById: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await registerUser({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Email already registered');
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
