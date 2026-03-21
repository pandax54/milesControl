import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

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

vi.mock('@/lib/services/program-enrollment.service', () => ({
  createEnrollment: vi.fn(),
  updateEnrollment: vi.fn(),
  deleteEnrollment: vi.fn(),
  quickUpdateBalance: vi.fn(),
  EnrollmentAlreadyExistsError: class extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = 'EnrollmentAlreadyExistsError';
    }
  },
  ProgramNotFoundError: class extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = 'ProgramNotFoundError';
    }
  },
  EnrollmentNotFoundError: class extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = 'EnrollmentNotFoundError';
    }
  },
}));

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import {
  createEnrollment,
  updateEnrollment,
  deleteEnrollment,
  quickUpdateBalance as quickUpdateBalanceService,
  EnrollmentAlreadyExistsError,
  ProgramNotFoundError,
  EnrollmentNotFoundError,
} from '@/lib/services/program-enrollment.service';
import { enrollInProgram, editEnrollment, removeEnrollment, quickUpdateBalance } from './programs';

const mockAuth = vi.mocked(auth);
const mockCreateEnrollment = vi.mocked(createEnrollment);
const mockUpdateEnrollment = vi.mocked(updateEnrollment);
const mockDeleteEnrollment = vi.mocked(deleteEnrollment);
const mockQuickUpdateBalance = vi.mocked(quickUpdateBalanceService);
const mockRevalidatePath = vi.mocked(revalidatePath);

const MOCK_SESSION = {
  user: { id: 'user-123', email: 'test@example.com', role: 'USER' as const },
  expires: '2026-12-31',
};

describe('enrollInProgram', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(MOCK_SESSION as never);
  });

  it('should enroll successfully and revalidate path', async () => {
    mockCreateEnrollment.mockResolvedValue({} as never);

    const result = await enrollInProgram({
      programId: 'prog-123',
      currentBalance: 5000,
    });

    expect(result.success).toBe(true);
    expect(mockCreateEnrollment).toHaveBeenCalledWith('user-123', {
      programId: 'prog-123',
      currentBalance: 5000,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/programs');
  });

  it('should return error for invalid input', async () => {
    const result = await enrollInProgram({
      programId: '',
      currentBalance: -1,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
    expect(mockCreateEnrollment).not.toHaveBeenCalled();
  });

  it('should return error when already enrolled', async () => {
    mockCreateEnrollment.mockRejectedValue(new EnrollmentAlreadyExistsError('prog-123'));

    const result = await enrollInProgram({
      programId: 'prog-123',
      currentBalance: 0,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('You are already enrolled in this program');
  });

  it('should return error when program not found', async () => {
    mockCreateEnrollment.mockRejectedValue(new ProgramNotFoundError('prog-999'));

    const result = await enrollInProgram({
      programId: 'prog-999',
      currentBalance: 0,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Program not found');
  });

  it('should return generic error for unexpected failures', async () => {
    mockCreateEnrollment.mockRejectedValue(new Error('DB connection failed'));

    const result = await enrollInProgram({
      programId: 'prog-123',
      currentBalance: 0,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to enroll. Please try again.');
  });

  it('should return authentication error when not logged in', async () => {
    mockAuth.mockResolvedValue(null as never);

    const result = await enrollInProgram({ programId: 'prog-123', currentBalance: 0 });

    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be logged in to perform this action');
  });
});

describe('editEnrollment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(MOCK_SESSION as never);
  });

  it('should update enrollment successfully', async () => {
    mockUpdateEnrollment.mockResolvedValue({} as never);

    const result = await editEnrollment({
      enrollmentId: 'enr-123',
      currentBalance: 20000,
    });

    expect(result.success).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/programs');
  });

  it('should return error for invalid input', async () => {
    const result = await editEnrollment({
      enrollmentId: '',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
  });

  it('should return error when enrollment not found', async () => {
    mockUpdateEnrollment.mockRejectedValue(new EnrollmentNotFoundError('enr-999'));

    const result = await editEnrollment({
      enrollmentId: 'enr-999',
      currentBalance: 5000,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Enrollment not found');
  });

  it('should return generic error for unexpected failures', async () => {
    mockUpdateEnrollment.mockRejectedValue(new Error('DB error'));

    const result = await editEnrollment({
      enrollmentId: 'enr-123',
      currentBalance: 5000,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to update. Please try again.');
  });

  it('should return authentication error when not logged in', async () => {
    mockAuth.mockResolvedValue(null as never);

    const result = await editEnrollment({
      enrollmentId: 'enr-123',
      currentBalance: 5000,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be logged in to perform this action');
  });
});

describe('removeEnrollment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(MOCK_SESSION as never);
  });

  it('should delete enrollment successfully', async () => {
    mockDeleteEnrollment.mockResolvedValue(undefined);

    const result = await removeEnrollment('enr-123');

    expect(result.success).toBe(true);
    expect(mockDeleteEnrollment).toHaveBeenCalledWith('user-123', 'enr-123');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/programs');
  });

  it('should return error for empty enrollmentId', async () => {
    const result = await removeEnrollment('');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
  });

  it('should return error when enrollment not found', async () => {
    mockDeleteEnrollment.mockRejectedValue(new EnrollmentNotFoundError('enr-999'));

    const result = await removeEnrollment('enr-999');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Enrollment not found');
  });

  it('should return generic error for unexpected failures', async () => {
    mockDeleteEnrollment.mockRejectedValue(new Error('DB error'));

    const result = await removeEnrollment('enr-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to delete. Please try again.');
  });

  it('should return authentication error when not logged in', async () => {
    mockAuth.mockResolvedValue(null as never);

    const result = await removeEnrollment('enr-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be logged in to perform this action');
  });
});

describe('quickUpdateBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(MOCK_SESSION as never);
  });

  it('should quick-update balance successfully', async () => {
    mockQuickUpdateBalance.mockResolvedValue({} as never);

    const result = await quickUpdateBalance({
      enrollmentId: 'enr-123',
      mode: 'add',
      amount: 1000,
    });

    expect(result.success).toBe(true);
    expect(mockQuickUpdateBalance).toHaveBeenCalledWith('user-123', {
      enrollmentId: 'enr-123',
      mode: 'add',
      amount: 1000,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/programs');
  });

  it('should return error for invalid input', async () => {
    const result = await quickUpdateBalance({
      enrollmentId: '',
      mode: 'add',
      amount: -1,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
  });

  it('should return error when enrollment not found', async () => {
    mockQuickUpdateBalance.mockRejectedValue(new EnrollmentNotFoundError('enr-999'));

    const result = await quickUpdateBalance({
      enrollmentId: 'enr-999',
      mode: 'add',
      amount: 1000,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Enrollment not found');
  });

  it('should return generic error for unexpected failures', async () => {
    mockQuickUpdateBalance.mockRejectedValue(new Error('DB error'));

    const result = await quickUpdateBalance({
      enrollmentId: 'enr-123',
      mode: 'add',
      amount: 1000,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to update balance. Please try again.');
  });

  it('should return authentication error when not logged in', async () => {
    mockAuth.mockResolvedValue(null as never);

    const result = await quickUpdateBalance({
      enrollmentId: 'enr-123',
      mode: 'set',
      amount: 5000,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be logged in to perform this action');
  });
});
