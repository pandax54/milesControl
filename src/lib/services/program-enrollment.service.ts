import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type {
  EnrollProgramInput,
  UpdateEnrollmentInput,
  QuickUpdateBalanceInput,
} from '@/lib/validators/program.schema';
import { assertProgramEnrollmentAvailable } from '@/lib/services/freemium.service';

export async function listPrograms() {
  return prisma.program.findMany({
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
}

export async function listEnrollments(userId: string) {
  return prisma.programEnrollment.findMany({
    where: { userId },
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
}

export async function createEnrollment(userId: string, input: EnrollProgramInput) {
  const existingEnrollment = await prisma.programEnrollment.findUnique({
    where: {
      userId_programId: {
        userId,
        programId: input.programId,
      },
    },
  });

  if (existingEnrollment) {
    throw new EnrollmentAlreadyExistsError(input.programId);
  }

  const program = await prisma.program.findUnique({
    where: { id: input.programId },
  });

  if (!program) {
    throw new ProgramNotFoundError(input.programId);
  }

  await assertProgramEnrollmentAvailable(userId);

  try {
    const enrollment = await prisma.programEnrollment.create({
      data: {
        userId,
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

    logger.info({ userId, programId: input.programId }, 'Program enrollment created');

    return enrollment;
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      throw new EnrollmentAlreadyExistsError(input.programId);
    }
    throw error;
  }
}

export async function updateEnrollment(userId: string, input: UpdateEnrollmentInput) {
  const enrollment = await prisma.programEnrollment.findFirst({
    where: { id: input.enrollmentId, userId },
  });

  if (!enrollment) {
    throw new EnrollmentNotFoundError(input.enrollmentId);
  }

  const hasBalanceChange =
    input.currentBalance !== undefined && input.currentBalance !== enrollment.currentBalance;

  const updated = await prisma.programEnrollment.update({
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

  logger.info({ userId, enrollmentId: input.enrollmentId }, 'Program enrollment updated');

  return updated;
}

export function calculateNewBalance(
  currentBalance: number,
  mode: QuickUpdateBalanceInput['mode'],
  amount: number
): number {
  switch (mode) {
    case 'add':
      return currentBalance + amount;
    case 'subtract':
      return Math.max(0, currentBalance - amount);
    case 'set':
      return amount;
  }
}

export async function quickUpdateBalance(userId: string, input: QuickUpdateBalanceInput) {
  const enrollment = await prisma.programEnrollment.findFirst({
    where: { id: input.enrollmentId, userId },
  });

  if (!enrollment) {
    throw new EnrollmentNotFoundError(input.enrollmentId);
  }

  const newBalance = calculateNewBalance(enrollment.currentBalance, input.mode, input.amount);

  const updated = await prisma.programEnrollment.update({
    where: { id: input.enrollmentId },
    data: {
      currentBalance: newBalance,
      balanceUpdatedAt: new Date(),
    },
    include: {
      program: {
        select: { id: true, name: true, type: true, currency: true },
      },
    },
  });

  logger.info(
    { userId, enrollmentId: input.enrollmentId, mode: input.mode, amount: input.amount, newBalance },
    'Balance quick-updated'
  );

  return updated;
}

export async function deleteEnrollment(userId: string, enrollmentId: string) {
  const enrollment = await prisma.programEnrollment.findFirst({
    where: { id: enrollmentId, userId },
  });

  if (!enrollment) {
    throw new EnrollmentNotFoundError(enrollmentId);
  }

  await prisma.programEnrollment.delete({
    where: { id: enrollmentId },
  });

  logger.info({ userId, enrollmentId }, 'Program enrollment deleted');
}

export class ProgramNotFoundError extends Error {
  constructor(programId: string) {
    super(`Program not found: ${programId}`);
    this.name = 'ProgramNotFoundError';
  }
}

export class EnrollmentAlreadyExistsError extends Error {
  constructor(programId: string) {
    super(`Already enrolled in program: ${programId}`);
    this.name = 'EnrollmentAlreadyExistsError';
  }
}

export class EnrollmentNotFoundError extends Error {
  constructor(enrollmentId: string) {
    super(`Enrollment not found: ${enrollmentId}`);
    this.name = 'EnrollmentNotFoundError';
  }
}

function isPrismaUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === 'P2002'
  );
}
