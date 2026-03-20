import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./helpers', () => {
  class AuthenticationError extends Error {
    constructor() {
      super('Not authenticated');
      this.name = 'AuthenticationError';
    }
  }
  return {
    requireUserId: vi.fn(),
    isAuthenticationError: (error: unknown) => error instanceof AuthenticationError,
    AuthenticationError,
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

vi.mock('@/lib/services/family-member.service', () => ({
  createFamilyMember: vi.fn(),
  updateFamilyMember: vi.fn(),
  deleteFamilyMember: vi.fn(),
  createFamilyEnrollment: vi.fn(),
  updateFamilyEnrollment: vi.fn(),
  deleteFamilyEnrollment: vi.fn(),
  FamilyMemberNotFoundError: class extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = 'FamilyMemberNotFoundError';
    }
  },
  FamilyEnrollmentNotFoundError: class extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = 'FamilyEnrollmentNotFoundError';
    }
  },
  FamilyEnrollmentAlreadyExistsError: class extends Error {
    constructor(familyMemberId: string, programId?: string) {
      super(`${familyMemberId} ${programId ?? ''}`);
      this.name = 'FamilyEnrollmentAlreadyExistsError';
    }
  },
  ProgramNotFoundError: class extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = 'ProgramNotFoundError';
    }
  },
}));

import { revalidatePath } from 'next/cache';
import {
  createFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
  createFamilyEnrollment,
  updateFamilyEnrollment,
  deleteFamilyEnrollment,
  FamilyMemberNotFoundError,
  FamilyEnrollmentNotFoundError,
  FamilyEnrollmentAlreadyExistsError,
  ProgramNotFoundError,
} from '@/lib/services/family-member.service';
import { requireUserId, AuthenticationError } from './helpers';
import {
  addFamilyMember,
  editFamilyMember,
  removeFamilyMember,
  addFamilyEnrollment,
  editFamilyEnrollment,
  removeFamilyEnrollment,
} from './family';
import type { FamilyMember as FamilyMemberType } from '@/generated/prisma/client';

function buildMockMemberReturn(overrides: Partial<FamilyMemberType> = {}): FamilyMemberType {
  return {
    id: 'member-123',
    userId: 'user-123',
    name: 'Maria',
    relationship: 'spouse',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const mockRequireUserId = vi.mocked(requireUserId);
const mockCreateMember = vi.mocked(createFamilyMember);
const mockUpdateMember = vi.mocked(updateFamilyMember);
const mockDeleteMember = vi.mocked(deleteFamilyMember);
const mockCreateEnrollment = vi.mocked(createFamilyEnrollment);
const mockUpdateEnrollment = vi.mocked(updateFamilyEnrollment);
const mockDeleteEnrollment = vi.mocked(deleteFamilyEnrollment);
const mockRevalidatePath = vi.mocked(revalidatePath);

describe('addFamilyMember', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUserId.mockResolvedValue('user-123');
  });

  it('should create family member successfully', async () => {
    mockCreateMember.mockResolvedValue(buildMockMemberReturn());

    const result = await addFamilyMember({ name: 'Maria', relationship: 'spouse' });

    expect(result.success).toBe(true);
    expect(mockCreateMember).toHaveBeenCalledWith('user-123', {
      name: 'Maria',
      relationship: 'spouse',
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/family');
  });

  it('should return error for invalid input', async () => {
    const result = await addFamilyMember({ name: '' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
    expect(mockCreateMember).not.toHaveBeenCalled();
  });

  it('should return authentication error when not logged in', async () => {
    mockRequireUserId.mockRejectedValue(new AuthenticationError());

    const result = await addFamilyMember({ name: 'Maria' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be logged in to perform this action');
  });

  it('should return generic error for unexpected failures', async () => {
    mockCreateMember.mockRejectedValue(new Error('DB error'));

    const result = await addFamilyMember({ name: 'Maria' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to add family member. Please try again.');
  });
});

describe('editFamilyMember', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUserId.mockResolvedValue('user-123');
  });

  it('should update family member successfully', async () => {
    mockUpdateMember.mockResolvedValue(buildMockMemberReturn({ name: 'Updated' }));

    const result = await editFamilyMember({
      familyMemberId: 'member-123',
      name: 'Updated',
    });

    expect(result.success).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/family');
  });

  it('should return error for invalid input', async () => {
    const result = await editFamilyMember({ familyMemberId: '' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
  });

  it('should return error when member not found', async () => {
    mockUpdateMember.mockRejectedValue(new FamilyMemberNotFoundError('member-999'));

    const result = await editFamilyMember({
      familyMemberId: 'member-999',
      name: 'Test',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Family member not found');
  });

  it('should return authentication error when not logged in', async () => {
    mockRequireUserId.mockRejectedValue(new AuthenticationError());

    const result = await editFamilyMember({
      familyMemberId: 'member-123',
      name: 'Test',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be logged in to perform this action');
  });
});

describe('removeFamilyMember', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUserId.mockResolvedValue('user-123');
  });

  it('should delete family member successfully', async () => {
    mockDeleteMember.mockResolvedValue(undefined);

    const result = await removeFamilyMember('member-123');

    expect(result.success).toBe(true);
    expect(mockDeleteMember).toHaveBeenCalledWith('user-123', 'member-123');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/family');
  });

  it('should return error for empty familyMemberId', async () => {
    const result = await removeFamilyMember('');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
  });

  it('should return error when member not found', async () => {
    mockDeleteMember.mockRejectedValue(new FamilyMemberNotFoundError('member-999'));

    const result = await removeFamilyMember('member-999');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Family member not found');
  });

  it('should return authentication error when not logged in', async () => {
    mockRequireUserId.mockRejectedValue(new AuthenticationError());

    const result = await removeFamilyMember('member-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be logged in to perform this action');
  });
});

describe('addFamilyEnrollment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUserId.mockResolvedValue('user-123');
  });

  it('should create enrollment successfully', async () => {
    mockCreateEnrollment.mockResolvedValue({} as never);

    const result = await addFamilyEnrollment({
      familyMemberId: 'member-123',
      programId: 'program-abc',
      currentBalance: 5000,
    });

    expect(result.success).toBe(true);
    expect(mockCreateEnrollment).toHaveBeenCalledWith('user-123', {
      familyMemberId: 'member-123',
      programId: 'program-abc',
      currentBalance: 5000,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/family');
  });

  it('should return error for invalid input', async () => {
    const result = await addFamilyEnrollment({
      familyMemberId: '',
      programId: '',
      currentBalance: 0,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
  });

  it('should return error when member not found', async () => {
    mockCreateEnrollment.mockRejectedValue(new FamilyMemberNotFoundError('nonexistent'));

    const result = await addFamilyEnrollment({
      familyMemberId: 'nonexistent',
      programId: 'program-abc',
      currentBalance: 0,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Family member not found');
  });

  it('should return error when program not found', async () => {
    mockCreateEnrollment.mockRejectedValue(new ProgramNotFoundError('nonexistent'));

    const result = await addFamilyEnrollment({
      familyMemberId: 'member-123',
      programId: 'nonexistent',
      currentBalance: 0,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Program not found');
  });

  it('should return error when already enrolled', async () => {
    mockCreateEnrollment.mockRejectedValue(
      new FamilyEnrollmentAlreadyExistsError('member-123', 'program-abc')
    );

    const result = await addFamilyEnrollment({
      familyMemberId: 'member-123',
      programId: 'program-abc',
      currentBalance: 0,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Family member is already enrolled in this program');
  });

  it('should return authentication error when not logged in', async () => {
    mockRequireUserId.mockRejectedValue(new AuthenticationError());

    const result = await addFamilyEnrollment({
      familyMemberId: 'member-123',
      programId: 'program-abc',
      currentBalance: 0,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be logged in to perform this action');
  });
});

describe('editFamilyEnrollment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUserId.mockResolvedValue('user-123');
  });

  it('should update enrollment successfully', async () => {
    mockUpdateEnrollment.mockResolvedValue({} as never);

    const result = await editFamilyEnrollment({
      enrollmentId: 'enr-123',
      familyMemberId: 'member-123',
      currentBalance: 8000,
    });

    expect(result.success).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/family');
  });

  it('should return error for invalid input', async () => {
    const result = await editFamilyEnrollment({
      enrollmentId: '',
      familyMemberId: '',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
  });

  it('should return error when enrollment not found', async () => {
    mockUpdateEnrollment.mockRejectedValue(new FamilyEnrollmentNotFoundError('enr-999'));

    const result = await editFamilyEnrollment({
      enrollmentId: 'enr-999',
      familyMemberId: 'member-123',
      currentBalance: 1000,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Enrollment not found');
  });

  it('should return authentication error when not logged in', async () => {
    mockRequireUserId.mockRejectedValue(new AuthenticationError());

    const result = await editFamilyEnrollment({
      enrollmentId: 'enr-123',
      familyMemberId: 'member-123',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be logged in to perform this action');
  });
});

describe('removeFamilyEnrollment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUserId.mockResolvedValue('user-123');
  });

  it('should delete enrollment successfully', async () => {
    mockDeleteEnrollment.mockResolvedValue(undefined);

    const result = await removeFamilyEnrollment('member-123', 'enr-123');

    expect(result.success).toBe(true);
    expect(mockDeleteEnrollment).toHaveBeenCalledWith('user-123', 'member-123', 'enr-123');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/family');
  });

  it('should return error for empty ids', async () => {
    const result = await removeFamilyEnrollment('', '');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid input');
  });

  it('should return error when member not found', async () => {
    mockDeleteEnrollment.mockRejectedValue(new FamilyMemberNotFoundError('nonexistent'));

    const result = await removeFamilyEnrollment('nonexistent', 'enr-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Family member not found');
  });

  it('should return error when enrollment not found', async () => {
    mockDeleteEnrollment.mockRejectedValue(new FamilyEnrollmentNotFoundError('enr-999'));

    const result = await removeFamilyEnrollment('member-123', 'enr-999');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Enrollment not found');
  });

  it('should return authentication error when not logged in', async () => {
    mockRequireUserId.mockRejectedValue(new AuthenticationError());

    const result = await removeFamilyEnrollment('member-123', 'enr-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be logged in to perform this action');
  });
});
