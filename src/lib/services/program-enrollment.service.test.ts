import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    program: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    programEnrollment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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
import {
  listPrograms,
  listEnrollments,
  createEnrollment,
  updateEnrollment,
  deleteEnrollment,
  calculateNewBalance,
  quickUpdateBalance,
  ProgramNotFoundError,
  EnrollmentAlreadyExistsError,
  EnrollmentNotFoundError,
} from './program-enrollment.service';

const mockProgramFindMany = vi.mocked(prisma.program.findMany);
const mockProgramFindUnique = vi.mocked(prisma.program.findUnique);
const mockEnrollmentFindMany = vi.mocked(prisma.programEnrollment.findMany);
const mockEnrollmentFindUnique = vi.mocked(prisma.programEnrollment.findUnique);
const mockEnrollmentFindFirst = vi.mocked(prisma.programEnrollment.findFirst);
const mockEnrollmentCreate = vi.mocked(prisma.programEnrollment.create);
const mockEnrollmentUpdate = vi.mocked(prisma.programEnrollment.update);
const mockEnrollmentDelete = vi.mocked(prisma.programEnrollment.delete);

const MOCK_USER_ID = 'user-123';
const MOCK_PROGRAM_ID = 'prog-smiles';
const MOCK_ENROLLMENT_ID = 'enr-456';

const mockProgram = {
  id: MOCK_PROGRAM_ID,
  name: 'Smiles',
  type: 'AIRLINE' as const,
  currency: 'miles',
  logoUrl: null,
  website: 'https://smiles.com.br',
  transferPartners: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockEnrollment = {
  id: MOCK_ENROLLMENT_ID,
  userId: MOCK_USER_ID,
  programId: MOCK_PROGRAM_ID,
  memberNumber: '123456',
  currentBalance: 10000,
  tier: 'Gold',
  balanceUpdatedAt: new Date(),
  expirationDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  program: {
    id: MOCK_PROGRAM_ID,
    name: 'Smiles',
    type: 'AIRLINE' as const,
    currency: 'miles',
  },
};

describe('listPrograms', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return all programs ordered by name', async () => {
    const programs = [
      { id: '1', name: 'Azul', type: 'AIRLINE', currency: 'points', logoUrl: null, website: null },
      { id: '2', name: 'Smiles', type: 'AIRLINE', currency: 'miles', logoUrl: null, website: null },
    ];
    mockProgramFindMany.mockResolvedValue(programs as never);

    const result = await listPrograms();

    expect(result).toEqual(programs);
    expect(mockProgramFindMany).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        type: true,
        currency: true,
        logoUrl: true,
        website: true,
      },
    });
  });
});

describe('listEnrollments', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return enrollments for user with program data', async () => {
    mockEnrollmentFindMany.mockResolvedValue([mockEnrollment] as never);

    const result = await listEnrollments(MOCK_USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].program.name).toBe('Smiles');
    expect(mockEnrollmentFindMany).toHaveBeenCalledWith({
      where: { userId: MOCK_USER_ID },
      include: {
        program: {
          select: {
            id: true,
            name: true,
            type: true,
            currency: true,
            logoUrl: true,
            website: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('should return empty array when user has no enrollments', async () => {
    mockEnrollmentFindMany.mockResolvedValue([]);

    const result = await listEnrollments(MOCK_USER_ID);

    expect(result).toEqual([]);
  });
});

describe('createEnrollment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should create enrollment successfully', async () => {
    mockEnrollmentFindUnique.mockResolvedValue(null);
    mockProgramFindUnique.mockResolvedValue(mockProgram as never);
    mockEnrollmentCreate.mockResolvedValue(mockEnrollment as never);

    const result = await createEnrollment(MOCK_USER_ID, {
      programId: MOCK_PROGRAM_ID,
      memberNumber: '123456',
      currentBalance: 10000,
      tier: 'Gold',
    });

    expect(result.program.name).toBe('Smiles');
    expect(mockEnrollmentCreate).toHaveBeenCalledOnce();
  });

  it('should throw EnrollmentAlreadyExistsError when already enrolled', async () => {
    mockEnrollmentFindUnique.mockResolvedValue(mockEnrollment as never);

    await expect(
      createEnrollment(MOCK_USER_ID, {
        programId: MOCK_PROGRAM_ID,
        currentBalance: 0,
      })
    ).rejects.toThrow(EnrollmentAlreadyExistsError);

    expect(mockEnrollmentCreate).not.toHaveBeenCalled();
  });

  it('should throw ProgramNotFoundError when program does not exist', async () => {
    mockEnrollmentFindUnique.mockResolvedValue(null);
    mockProgramFindUnique.mockResolvedValue(null);

    await expect(
      createEnrollment(MOCK_USER_ID, {
        programId: 'nonexistent',
        currentBalance: 0,
      })
    ).rejects.toThrow(ProgramNotFoundError);
  });

  it('should handle optional fields with defaults', async () => {
    mockEnrollmentFindUnique.mockResolvedValue(null);
    mockProgramFindUnique.mockResolvedValue(mockProgram as never);
    mockEnrollmentCreate.mockResolvedValue(mockEnrollment as never);

    await createEnrollment(MOCK_USER_ID, {
      programId: MOCK_PROGRAM_ID,
      currentBalance: 0,
    });

    const createCall = mockEnrollmentCreate.mock.calls[0][0];
    expect(createCall.data.memberNumber).toBeNull();
    expect(createCall.data.tier).toBeNull();
    expect(createCall.data.expirationDate).toBeNull();
  });

  it('should set expirationDate when provided', async () => {
    mockEnrollmentFindUnique.mockResolvedValue(null);
    mockProgramFindUnique.mockResolvedValue(mockProgram as never);
    mockEnrollmentCreate.mockResolvedValue(mockEnrollment as never);

    await createEnrollment(MOCK_USER_ID, {
      programId: MOCK_PROGRAM_ID,
      currentBalance: 5000,
      expirationDate: '2026-12-31T00:00:00.000Z',
    });

    const createCall = mockEnrollmentCreate.mock.calls[0][0];
    expect(createCall.data.expirationDate).toEqual(new Date('2026-12-31T00:00:00.000Z'));
  });
});

describe('updateEnrollment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should update enrollment successfully', async () => {
    mockEnrollmentFindFirst.mockResolvedValue(mockEnrollment as never);
    const updatedEnrollment = { ...mockEnrollment, currentBalance: 15000 };
    mockEnrollmentUpdate.mockResolvedValue(updatedEnrollment as never);

    const result = await updateEnrollment(MOCK_USER_ID, {
      enrollmentId: MOCK_ENROLLMENT_ID,
      currentBalance: 15000,
    });

    expect(result.currentBalance).toBe(15000);
    expect(mockEnrollmentUpdate).toHaveBeenCalledOnce();
  });

  it('should update balanceUpdatedAt when balance changes', async () => {
    mockEnrollmentFindFirst.mockResolvedValue(mockEnrollment as never);
    mockEnrollmentUpdate.mockResolvedValue(mockEnrollment as never);

    await updateEnrollment(MOCK_USER_ID, {
      enrollmentId: MOCK_ENROLLMENT_ID,
      currentBalance: 20000,
    });

    const updateCall = mockEnrollmentUpdate.mock.calls[0][0];
    expect(updateCall.data).toHaveProperty('balanceUpdatedAt');
  });

  it('should not update balanceUpdatedAt when balance unchanged', async () => {
    mockEnrollmentFindFirst.mockResolvedValue(mockEnrollment as never);
    mockEnrollmentUpdate.mockResolvedValue(mockEnrollment as never);

    await updateEnrollment(MOCK_USER_ID, {
      enrollmentId: MOCK_ENROLLMENT_ID,
      tier: 'Diamond',
    });

    const updateCall = mockEnrollmentUpdate.mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty('balanceUpdatedAt');
  });

  it('should throw EnrollmentNotFoundError when enrollment does not exist', async () => {
    mockEnrollmentFindFirst.mockResolvedValue(null);

    await expect(
      updateEnrollment(MOCK_USER_ID, {
        enrollmentId: 'nonexistent',
        currentBalance: 5000,
      })
    ).rejects.toThrow(EnrollmentNotFoundError);
  });

  it('should update memberNumber and clear tier when empty string', async () => {
    mockEnrollmentFindFirst.mockResolvedValue(mockEnrollment as never);
    mockEnrollmentUpdate.mockResolvedValue(mockEnrollment as never);

    await updateEnrollment(MOCK_USER_ID, {
      enrollmentId: MOCK_ENROLLMENT_ID,
      memberNumber: '999888',
      tier: '',
    });

    const updateCall = mockEnrollmentUpdate.mock.calls[0][0];
    expect(updateCall.data.memberNumber).toBe('999888');
    expect(updateCall.data.tier).toBeNull();
  });

  it('should set expirationDate when provided in update', async () => {
    mockEnrollmentFindFirst.mockResolvedValue(mockEnrollment as never);
    mockEnrollmentUpdate.mockResolvedValue(mockEnrollment as never);

    await updateEnrollment(MOCK_USER_ID, {
      enrollmentId: MOCK_ENROLLMENT_ID,
      expirationDate: '2027-06-30T00:00:00.000Z',
    });

    const updateCall = mockEnrollmentUpdate.mock.calls[0][0];
    expect(updateCall.data.expirationDate).toEqual(new Date('2027-06-30T00:00:00.000Z'));
  });

  it('should clear expirationDate when null', async () => {
    mockEnrollmentFindFirst.mockResolvedValue(mockEnrollment as never);
    mockEnrollmentUpdate.mockResolvedValue(mockEnrollment as never);

    await updateEnrollment(MOCK_USER_ID, {
      enrollmentId: MOCK_ENROLLMENT_ID,
      expirationDate: null,
    });

    const updateCall = mockEnrollmentUpdate.mock.calls[0][0];
    expect(updateCall.data.expirationDate).toBeNull();
  });

  it('should not update balanceUpdatedAt when balance is same as current', async () => {
    mockEnrollmentFindFirst.mockResolvedValue(mockEnrollment as never);
    mockEnrollmentUpdate.mockResolvedValue(mockEnrollment as never);

    await updateEnrollment(MOCK_USER_ID, {
      enrollmentId: MOCK_ENROLLMENT_ID,
      currentBalance: mockEnrollment.currentBalance,
    });

    const updateCall = mockEnrollmentUpdate.mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty('balanceUpdatedAt');
  });
});

describe('deleteEnrollment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should delete enrollment successfully', async () => {
    mockEnrollmentFindFirst.mockResolvedValue(mockEnrollment as never);
    mockEnrollmentDelete.mockResolvedValue(mockEnrollment as never);

    await deleteEnrollment(MOCK_USER_ID, MOCK_ENROLLMENT_ID);

    expect(mockEnrollmentDelete).toHaveBeenCalledWith({
      where: { id: MOCK_ENROLLMENT_ID },
    });
  });

  it('should throw EnrollmentNotFoundError when enrollment does not exist', async () => {
    mockEnrollmentFindFirst.mockResolvedValue(null);

    await expect(
      deleteEnrollment(MOCK_USER_ID, 'nonexistent')
    ).rejects.toThrow(EnrollmentNotFoundError);

    expect(mockEnrollmentDelete).not.toHaveBeenCalled();
  });
});

describe('calculateNewBalance', () => {
  it('should add amount to current balance', () => {
    expect(calculateNewBalance(10000, 'add', 5000)).toBe(15000);
  });

  it('should subtract amount from current balance', () => {
    expect(calculateNewBalance(10000, 'subtract', 3000)).toBe(7000);
  });

  it('should not go below zero when subtracting', () => {
    expect(calculateNewBalance(1000, 'subtract', 5000)).toBe(0);
  });

  it('should set balance to exact amount', () => {
    expect(calculateNewBalance(10000, 'set', 25000)).toBe(25000);
  });

  it('should handle zero add', () => {
    expect(calculateNewBalance(10000, 'add', 0)).toBe(10000);
  });

  it('should handle set to zero', () => {
    expect(calculateNewBalance(10000, 'set', 0)).toBe(0);
  });
});

describe('quickUpdateBalance', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should add to balance successfully', async () => {
    mockEnrollmentFindFirst.mockResolvedValue(mockEnrollment as never);
    const updated = { ...mockEnrollment, currentBalance: 11000 };
    mockEnrollmentUpdate.mockResolvedValue(updated as never);

    const result = await quickUpdateBalance(MOCK_USER_ID, {
      enrollmentId: MOCK_ENROLLMENT_ID,
      mode: 'add',
      amount: 1000,
    });

    expect(result.currentBalance).toBe(11000);
    const updateCall = mockEnrollmentUpdate.mock.calls[0][0];
    expect(updateCall.data.currentBalance).toBe(11000);
    expect(updateCall.data).toHaveProperty('balanceUpdatedAt');
  });

  it('should subtract from balance successfully', async () => {
    mockEnrollmentFindFirst.mockResolvedValue(mockEnrollment as never);
    const updated = { ...mockEnrollment, currentBalance: 5000 };
    mockEnrollmentUpdate.mockResolvedValue(updated as never);

    const result = await quickUpdateBalance(MOCK_USER_ID, {
      enrollmentId: MOCK_ENROLLMENT_ID,
      mode: 'subtract',
      amount: 5000,
    });

    expect(result.currentBalance).toBe(5000);
    const updateCall = mockEnrollmentUpdate.mock.calls[0][0];
    expect(updateCall.data.currentBalance).toBe(5000);
  });

  it('should set balance to exact amount', async () => {
    mockEnrollmentFindFirst.mockResolvedValue(mockEnrollment as never);
    const updated = { ...mockEnrollment, currentBalance: 50000 };
    mockEnrollmentUpdate.mockResolvedValue(updated as never);

    await quickUpdateBalance(MOCK_USER_ID, {
      enrollmentId: MOCK_ENROLLMENT_ID,
      mode: 'set',
      amount: 50000,
    });

    const updateCall = mockEnrollmentUpdate.mock.calls[0][0];
    expect(updateCall.data.currentBalance).toBe(50000);
  });

  it('should clamp subtract to zero', async () => {
    mockEnrollmentFindFirst.mockResolvedValue(mockEnrollment as never);
    const updated = { ...mockEnrollment, currentBalance: 0 };
    mockEnrollmentUpdate.mockResolvedValue(updated as never);

    await quickUpdateBalance(MOCK_USER_ID, {
      enrollmentId: MOCK_ENROLLMENT_ID,
      mode: 'subtract',
      amount: 999999,
    });

    const updateCall = mockEnrollmentUpdate.mock.calls[0][0];
    expect(updateCall.data.currentBalance).toBe(0);
  });

  it('should throw EnrollmentNotFoundError when not found', async () => {
    mockEnrollmentFindFirst.mockResolvedValue(null);

    await expect(
      quickUpdateBalance(MOCK_USER_ID, {
        enrollmentId: 'nonexistent',
        mode: 'add',
        amount: 1000,
      })
    ).rejects.toThrow(EnrollmentNotFoundError);

    expect(mockEnrollmentUpdate).not.toHaveBeenCalled();
  });
});
