import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type {
  CreateFamilyMemberInput,
  UpdateFamilyMemberInput,
  CreateFamilyEnrollmentInput,
  UpdateFamilyEnrollmentInput,
} from '@/lib/validators/family.schema';

export async function listFamilyMembers(userId: string) {
  return prisma.familyMember.findMany({
    where: { userId },
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
}

export async function createFamilyMember(userId: string, input: CreateFamilyMemberInput) {
  const member = await prisma.familyMember.create({
    data: {
      userId,
      name: input.name,
      relationship: input.relationship || null,
    },
  });

  logger.info({ userId, familyMemberId: member.id }, 'Family member created');

  return member;
}

export async function updateFamilyMember(userId: string, input: UpdateFamilyMemberInput) {
  const member = await prisma.familyMember.findFirst({
    where: { id: input.familyMemberId, userId },
  });

  if (!member) {
    throw new FamilyMemberNotFoundError(input.familyMemberId);
  }

  const updated = await prisma.familyMember.update({
    where: { id: input.familyMemberId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.relationship !== undefined && { relationship: input.relationship }),
    },
  });

  logger.info({ userId, familyMemberId: input.familyMemberId }, 'Family member updated');

  return updated;
}

export async function deleteFamilyMember(userId: string, familyMemberId: string) {
  const member = await prisma.familyMember.findFirst({
    where: { id: familyMemberId, userId },
  });

  if (!member) {
    throw new FamilyMemberNotFoundError(familyMemberId);
  }

  await prisma.familyMember.delete({
    where: { id: familyMemberId },
  });

  logger.info({ userId, familyMemberId }, 'Family member deleted');
}

export async function createFamilyEnrollment(
  userId: string,
  input: CreateFamilyEnrollmentInput
) {
  const member = await prisma.familyMember.findFirst({
    where: { id: input.familyMemberId, userId },
  });

  if (!member) {
    throw new FamilyMemberNotFoundError(input.familyMemberId);
  }

  const program = await prisma.program.findUnique({
    where: { id: input.programId },
  });

  if (!program) {
    throw new ProgramNotFoundError(input.programId);
  }

  const existing = await prisma.familyProgramEnrollment.findUnique({
    where: {
      familyMemberId_programId: {
        familyMemberId: input.familyMemberId,
        programId: input.programId,
      },
    },
  });

  if (existing) {
    throw new FamilyEnrollmentAlreadyExistsError(input.familyMemberId, input.programId);
  }

  const enrollment = await prisma.familyProgramEnrollment.create({
    data: {
      familyMemberId: input.familyMemberId,
      programId: input.programId,
      memberNumber: input.memberNumber || null,
      currentBalance: input.currentBalance ?? 0,
      tier: input.tier || null,
      expirationDate: input.expirationDate ? new Date(input.expirationDate) : null,
      balanceUpdatedAt: new Date(),
    },
    include: {
      program: {
        select: { id: true, name: true, type: true, currency: true },
      },
    },
  });

  logger.info(
    { userId, familyMemberId: input.familyMemberId, programId: input.programId },
    'Family enrollment created'
  );

  return enrollment;
}

export async function updateFamilyEnrollment(
  userId: string,
  input: UpdateFamilyEnrollmentInput
) {
  const member = await prisma.familyMember.findFirst({
    where: { id: input.familyMemberId, userId },
  });

  if (!member) {
    throw new FamilyMemberNotFoundError(input.familyMemberId);
  }

  const enrollment = await prisma.familyProgramEnrollment.findFirst({
    where: { id: input.enrollmentId, familyMemberId: input.familyMemberId },
  });

  if (!enrollment) {
    throw new FamilyEnrollmentNotFoundError(input.enrollmentId);
  }

  const hasBalanceChange =
    input.currentBalance !== undefined && input.currentBalance !== enrollment.currentBalance;

  const updated = await prisma.familyProgramEnrollment.update({
    where: { id: input.enrollmentId },
    data: {
      ...(input.memberNumber !== undefined && { memberNumber: input.memberNumber || null }),
      ...(input.currentBalance !== undefined && { currentBalance: input.currentBalance }),
      ...(input.tier !== undefined && { tier: input.tier || null }),
      ...(input.expirationDate !== undefined && {
        expirationDate: input.expirationDate ? new Date(input.expirationDate) : null,
      }),
      ...(hasBalanceChange && { balanceUpdatedAt: new Date() }),
    },
    include: {
      program: {
        select: { id: true, name: true, type: true, currency: true },
      },
    },
  });

  logger.info(
    { userId, enrollmentId: input.enrollmentId, familyMemberId: input.familyMemberId },
    'Family enrollment updated'
  );

  return updated;
}

export async function deleteFamilyEnrollment(
  userId: string,
  familyMemberId: string,
  enrollmentId: string
) {
  const member = await prisma.familyMember.findFirst({
    where: { id: familyMemberId, userId },
  });

  if (!member) {
    throw new FamilyMemberNotFoundError(familyMemberId);
  }

  const enrollment = await prisma.familyProgramEnrollment.findFirst({
    where: { id: enrollmentId, familyMemberId },
  });

  if (!enrollment) {
    throw new FamilyEnrollmentNotFoundError(enrollmentId);
  }

  await prisma.familyProgramEnrollment.delete({
    where: { id: enrollmentId },
  });

  logger.info({ userId, familyMemberId, enrollmentId }, 'Family enrollment deleted');
}

export class FamilyMemberNotFoundError extends Error {
  constructor(familyMemberId: string) {
    super(`Family member not found: ${familyMemberId}`);
    this.name = 'FamilyMemberNotFoundError';
  }
}

export class FamilyEnrollmentNotFoundError extends Error {
  constructor(enrollmentId: string) {
    super(`Family enrollment not found: ${enrollmentId}`);
    this.name = 'FamilyEnrollmentNotFoundError';
  }
}

export class FamilyEnrollmentAlreadyExistsError extends Error {
  constructor(familyMemberId: string, programId: string) {
    super(`Family member ${familyMemberId} already enrolled in program ${programId}`);
    this.name = 'FamilyEnrollmentAlreadyExistsError';
  }
}

export class ProgramNotFoundError extends Error {
  constructor(programId: string) {
    super(`Program not found: ${programId}`);
    this.name = 'ProgramNotFoundError';
  }
}
