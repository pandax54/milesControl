import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FamilyMember, FamilyProgramEnrollment, Program, ProgramType } from '@/generated/prisma/client';

type ProgramSelect = Pick<Program, 'id' | 'name' | 'type' | 'currency' | 'logoUrl' | 'website'>;

type EnrollmentWithProgram = FamilyProgramEnrollment & {
  program: ProgramSelect;
};

type MemberWithEnrollments = FamilyMember & {
  programEnrollments: EnrollmentWithProgram[];
};

vi.mock('@/lib/prisma', () => ({
  prisma: {
    familyMember: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    familyProgramEnrollment: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    program: {
      findUnique: vi.fn(),
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
  listFamilyMembers,
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
} from './family-member.service';

const mockMemberFindMany = vi.mocked(prisma.familyMember.findMany);
const mockMemberFindFirst = vi.mocked(prisma.familyMember.findFirst);
const mockMemberCreate = vi.mocked(prisma.familyMember.create);
const mockMemberUpdate = vi.mocked(prisma.familyMember.update);
const mockMemberDelete = vi.mocked(prisma.familyMember.delete);
const mockEnrollmentFindUnique = vi.mocked(prisma.familyProgramEnrollment.findUnique);
const mockEnrollmentFindFirst = vi.mocked(prisma.familyProgramEnrollment.findFirst);
const mockEnrollmentCreate = vi.mocked(prisma.familyProgramEnrollment.create);
const mockEnrollmentUpdate = vi.mocked(prisma.familyProgramEnrollment.update);
const mockEnrollmentDelete = vi.mocked(prisma.familyProgramEnrollment.delete);
const mockProgramFindUnique = vi.mocked(prisma.program.findUnique);

const MOCK_USER_ID = 'user-123';
const MOCK_MEMBER_ID = 'member-456';
const MOCK_ENROLLMENT_ID = 'enrollment-789';
const MOCK_PROGRAM_ID = 'program-abc';

function buildMockMember(overrides: Partial<FamilyMember> = {}): FamilyMember {
  return {
    id: MOCK_MEMBER_ID,
    userId: MOCK_USER_ID,
    name: 'Maria',
    relationship: 'spouse',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildMockEnrollment(overrides: Partial<FamilyProgramEnrollment> = {}): FamilyProgramEnrollment {
  return {
    id: MOCK_ENROLLMENT_ID,
    familyMemberId: MOCK_MEMBER_ID,
    programId: MOCK_PROGRAM_ID,
    memberNumber: null,
    currentBalance: 5000,
    tier: null,
    expirationDate: null,
    balanceUpdatedAt: new Date(),
    ...overrides,
  };
}

function buildMockProgram(overrides: Partial<Program> = {}): Program {
  return {
    id: MOCK_PROGRAM_ID,
    name: 'Smiles',
    type: 'AIRLINE' as ProgramType,
    currency: 'miles',
    logoUrl: null,
    website: 'https://smiles.com.br',
    transferPartners: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildMockProgramSelect(overrides: Partial<ProgramSelect> = {}): ProgramSelect {
  return {
    id: MOCK_PROGRAM_ID,
    name: 'Smiles',
    type: 'AIRLINE' as ProgramType,
    currency: 'miles',
    logoUrl: null,
    website: 'https://smiles.com.br',
    ...overrides,
  };
}

function buildMockEnrollmentWithProgram(
  overrides: Partial<FamilyProgramEnrollment> = {},
  programOverrides: Partial<ProgramSelect> = {},
): EnrollmentWithProgram {
  return {
    ...buildMockEnrollment(overrides),
    program: buildMockProgramSelect(programOverrides),
  };
}

function buildMockMemberWithEnrollments(
  memberOverrides: Partial<FamilyMember> = {},
  enrollments: EnrollmentWithProgram[] = [],
): MemberWithEnrollments {
  return {
    ...buildMockMember(memberOverrides),
    programEnrollments: enrollments,
  };
}

describe('listFamilyMembers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return family members with enrollments for user', async () => {
    mockMemberFindMany.mockResolvedValue([buildMockMemberWithEnrollments()] as never);

    const result = await listFamilyMembers(MOCK_USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Maria');
    expect(mockMemberFindMany).toHaveBeenCalledWith({
      where: { userId: MOCK_USER_ID },
      include: {
        programEnrollments: {
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
          orderBy: { balanceUpdatedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('should return empty array when user has no family members', async () => {
    mockMemberFindMany.mockResolvedValue([]);

    const result = await listFamilyMembers(MOCK_USER_ID);

    expect(result).toEqual([]);
  });
});

describe('createFamilyMember', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should create family member with name and relationship', async () => {
    mockMemberCreate.mockResolvedValue(buildMockMember());

    const result = await createFamilyMember(MOCK_USER_ID, {
      name: 'Maria',
      relationship: 'spouse',
    });

    expect(result.name).toBe('Maria');
    const createCall = mockMemberCreate.mock.calls[0][0];
    expect(createCall.data.userId).toBe(MOCK_USER_ID);
    expect(createCall.data.name).toBe('Maria');
    expect(createCall.data.relationship).toBe('spouse');
  });

  it('should set relationship to null when not provided', async () => {
    mockMemberCreate.mockResolvedValue(buildMockMember({ relationship: null }));

    await createFamilyMember(MOCK_USER_ID, { name: 'João' });

    const createCall = mockMemberCreate.mock.calls[0][0];
    expect(createCall.data.relationship).toBeNull();
  });
});

describe('updateFamilyMember', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should update family member name', async () => {
    mockMemberFindFirst.mockResolvedValue(buildMockMember());
    mockMemberUpdate.mockResolvedValue(buildMockMember({ name: 'Updated' }));

    const result = await updateFamilyMember(MOCK_USER_ID, {
      familyMemberId: MOCK_MEMBER_ID,
      name: 'Updated',
    });

    expect(result.name).toBe('Updated');
    expect(mockMemberUpdate).toHaveBeenCalledOnce();
  });

  it('should throw FamilyMemberNotFoundError when member does not exist', async () => {
    mockMemberFindFirst.mockResolvedValue(null);

    await expect(
      updateFamilyMember(MOCK_USER_ID, {
        familyMemberId: 'nonexistent',
        name: 'Test',
      })
    ).rejects.toThrow(FamilyMemberNotFoundError);

    expect(mockMemberUpdate).not.toHaveBeenCalled();
  });

  it('should throw FamilyMemberNotFoundError when member belongs to another user', async () => {
    mockMemberFindFirst.mockResolvedValue(null);

    await expect(
      updateFamilyMember('other-user', {
        familyMemberId: MOCK_MEMBER_ID,
        name: 'Test',
      })
    ).rejects.toThrow(FamilyMemberNotFoundError);
  });
});

describe('deleteFamilyMember', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should delete family member successfully', async () => {
    const member = buildMockMember();
    mockMemberFindFirst.mockResolvedValue(member);
    mockMemberDelete.mockResolvedValue(member);

    await deleteFamilyMember(MOCK_USER_ID, MOCK_MEMBER_ID);

    expect(mockMemberDelete).toHaveBeenCalledWith({
      where: { id: MOCK_MEMBER_ID },
    });
  });

  it('should throw FamilyMemberNotFoundError when member does not exist', async () => {
    mockMemberFindFirst.mockResolvedValue(null);

    await expect(
      deleteFamilyMember(MOCK_USER_ID, 'nonexistent')
    ).rejects.toThrow(FamilyMemberNotFoundError);

    expect(mockMemberDelete).not.toHaveBeenCalled();
  });
});

describe('createFamilyEnrollment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should create enrollment with all fields', async () => {
    mockMemberFindFirst.mockResolvedValue(buildMockMember());
    mockProgramFindUnique.mockResolvedValue(buildMockProgram());
    mockEnrollmentFindUnique.mockResolvedValue(null);
    mockEnrollmentCreate.mockResolvedValue(buildMockEnrollmentWithProgram() as never);

    const result = await createFamilyEnrollment(MOCK_USER_ID, {
      familyMemberId: MOCK_MEMBER_ID,
      programId: MOCK_PROGRAM_ID,
      memberNumber: '12345',
      currentBalance: 5000,
      tier: 'Gold',
      expirationDate: '2026-12-31T00:00:00.000Z',
    });

    expect(result.currentBalance).toBe(5000);
    const createCall = mockEnrollmentCreate.mock.calls[0][0];
    expect(createCall.data.familyMemberId).toBe(MOCK_MEMBER_ID);
    expect(createCall.data.programId).toBe(MOCK_PROGRAM_ID);
    expect(createCall.data.memberNumber).toBe('12345');
    expect(createCall.data.tier).toBe('Gold');
    expect(createCall.data.expirationDate).toEqual(new Date('2026-12-31T00:00:00.000Z'));
  });

  it('should throw FamilyMemberNotFoundError when member does not exist', async () => {
    mockMemberFindFirst.mockResolvedValue(null);

    await expect(
      createFamilyEnrollment(MOCK_USER_ID, {
        familyMemberId: 'nonexistent',
        programId: MOCK_PROGRAM_ID,
        currentBalance: 0,
      })
    ).rejects.toThrow(FamilyMemberNotFoundError);
  });

  it('should throw ProgramNotFoundError when program does not exist', async () => {
    mockMemberFindFirst.mockResolvedValue(buildMockMember());
    mockProgramFindUnique.mockResolvedValue(null);

    await expect(
      createFamilyEnrollment(MOCK_USER_ID, {
        familyMemberId: MOCK_MEMBER_ID,
        programId: 'nonexistent',
        currentBalance: 0,
      })
    ).rejects.toThrow(ProgramNotFoundError);
  });

  it('should throw FamilyEnrollmentAlreadyExistsError when duplicate', async () => {
    mockMemberFindFirst.mockResolvedValue(buildMockMember());
    mockProgramFindUnique.mockResolvedValue(buildMockProgram());
    mockEnrollmentFindUnique.mockResolvedValue(buildMockEnrollment());

    await expect(
      createFamilyEnrollment(MOCK_USER_ID, {
        familyMemberId: MOCK_MEMBER_ID,
        programId: MOCK_PROGRAM_ID,
        currentBalance: 0,
      })
    ).rejects.toThrow(FamilyEnrollmentAlreadyExistsError);
  });

  it('should default currentBalance to 0 when passed as 0', async () => {
    mockMemberFindFirst.mockResolvedValue(buildMockMember());
    mockProgramFindUnique.mockResolvedValue(buildMockProgram());
    mockEnrollmentFindUnique.mockResolvedValue(null);
    mockEnrollmentCreate.mockResolvedValue(buildMockEnrollmentWithProgram({ currentBalance: 0 }) as never);

    await createFamilyEnrollment(MOCK_USER_ID, {
      familyMemberId: MOCK_MEMBER_ID,
      programId: MOCK_PROGRAM_ID,
      currentBalance: 0,
    });

    const createCall = mockEnrollmentCreate.mock.calls[0][0];
    expect(createCall.data.currentBalance).toBe(0);
  });
});

describe('updateFamilyEnrollment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should update enrollment balance and set balanceUpdatedAt', async () => {
    mockMemberFindFirst.mockResolvedValue(buildMockMember());
    mockEnrollmentFindFirst.mockResolvedValue(buildMockEnrollment({ currentBalance: 5000 }));
    mockEnrollmentUpdate.mockResolvedValue(buildMockEnrollmentWithProgram({ currentBalance: 8000 }) as never);

    const result = await updateFamilyEnrollment(MOCK_USER_ID, {
      enrollmentId: MOCK_ENROLLMENT_ID,
      familyMemberId: MOCK_MEMBER_ID,
      currentBalance: 8000,
    });

    expect(result.currentBalance).toBe(8000);
    const updateCall = mockEnrollmentUpdate.mock.calls[0][0];
    expect(updateCall.data).toHaveProperty('balanceUpdatedAt');
  });

  it('should not update balanceUpdatedAt when balance unchanged', async () => {
    mockMemberFindFirst.mockResolvedValue(buildMockMember());
    mockEnrollmentFindFirst.mockResolvedValue(buildMockEnrollment({ currentBalance: 5000 }));
    mockEnrollmentUpdate.mockResolvedValue(buildMockEnrollmentWithProgram() as never);

    await updateFamilyEnrollment(MOCK_USER_ID, {
      enrollmentId: MOCK_ENROLLMENT_ID,
      familyMemberId: MOCK_MEMBER_ID,
      currentBalance: 5000,
    });

    const updateCall = mockEnrollmentUpdate.mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty('balanceUpdatedAt');
  });

  it('should throw FamilyMemberNotFoundError when member does not exist', async () => {
    mockMemberFindFirst.mockResolvedValue(null);

    await expect(
      updateFamilyEnrollment(MOCK_USER_ID, {
        enrollmentId: MOCK_ENROLLMENT_ID,
        familyMemberId: 'nonexistent',
      })
    ).rejects.toThrow(FamilyMemberNotFoundError);
  });

  it('should throw FamilyEnrollmentNotFoundError when enrollment does not exist', async () => {
    mockMemberFindFirst.mockResolvedValue(buildMockMember());
    mockEnrollmentFindFirst.mockResolvedValue(null);

    await expect(
      updateFamilyEnrollment(MOCK_USER_ID, {
        enrollmentId: 'nonexistent',
        familyMemberId: MOCK_MEMBER_ID,
      })
    ).rejects.toThrow(FamilyEnrollmentNotFoundError);
  });

  it('should allow clearing expirationDate with null', async () => {
    mockMemberFindFirst.mockResolvedValue(buildMockMember());
    mockEnrollmentFindFirst.mockResolvedValue(buildMockEnrollment());
    mockEnrollmentUpdate.mockResolvedValue(buildMockEnrollmentWithProgram({ expirationDate: null }) as never);

    await updateFamilyEnrollment(MOCK_USER_ID, {
      enrollmentId: MOCK_ENROLLMENT_ID,
      familyMemberId: MOCK_MEMBER_ID,
      expirationDate: null,
    });

    const updateCall = mockEnrollmentUpdate.mock.calls[0][0];
    expect(updateCall.data.expirationDate).toBeNull();
  });
});

describe('deleteFamilyEnrollment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should delete enrollment successfully', async () => {
    mockMemberFindFirst.mockResolvedValue(buildMockMember());
    const enrollment = buildMockEnrollment();
    mockEnrollmentFindFirst.mockResolvedValue(enrollment);
    mockEnrollmentDelete.mockResolvedValue(enrollment);

    await deleteFamilyEnrollment(MOCK_USER_ID, MOCK_MEMBER_ID, MOCK_ENROLLMENT_ID);

    expect(mockEnrollmentDelete).toHaveBeenCalledWith({
      where: { id: MOCK_ENROLLMENT_ID },
    });
  });

  it('should throw FamilyMemberNotFoundError when member does not exist', async () => {
    mockMemberFindFirst.mockResolvedValue(null);

    await expect(
      deleteFamilyEnrollment(MOCK_USER_ID, 'nonexistent', MOCK_ENROLLMENT_ID)
    ).rejects.toThrow(FamilyMemberNotFoundError);

    expect(mockEnrollmentDelete).not.toHaveBeenCalled();
  });

  it('should throw FamilyEnrollmentNotFoundError when enrollment does not exist', async () => {
    mockMemberFindFirst.mockResolvedValue(buildMockMember());
    mockEnrollmentFindFirst.mockResolvedValue(null);

    await expect(
      deleteFamilyEnrollment(MOCK_USER_ID, MOCK_MEMBER_ID, 'nonexistent')
    ).rejects.toThrow(FamilyEnrollmentNotFoundError);

    expect(mockEnrollmentDelete).not.toHaveBeenCalled();
  });
});
