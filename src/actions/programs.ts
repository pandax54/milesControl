'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import {
  enrollProgramSchema,
  updateEnrollmentSchema,
  deleteEnrollmentSchema,
  quickUpdateBalanceSchema,
  type EnrollProgramInput,
  type UpdateEnrollmentInput,
  type QuickUpdateBalanceInput,
} from '@/lib/validators/program.schema';
import {
  createEnrollment,
  updateEnrollment as updateEnrollmentService,
  deleteEnrollment as deleteEnrollmentService,
  quickUpdateBalance as quickUpdateBalanceService,
  EnrollmentAlreadyExistsError,
  ProgramNotFoundError,
  EnrollmentNotFoundError,
} from '@/lib/services/program-enrollment.service';
import { ProgramEnrollmentLimitReachedError } from '@/lib/services/freemium.service';

interface ActionResult {
  success: boolean;
  error?: string;
}

class AuthenticationError extends Error {
  constructor() {
    super('Not authenticated');
    this.name = 'AuthenticationError';
  }
}

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthenticationError();
  }
  return session.user.id;
}

function isAuthenticationError(error: unknown): boolean {
  return error instanceof AuthenticationError;
}

export async function enrollInProgram(input: EnrollProgramInput): Promise<ActionResult> {
  const parsed = enrollProgramSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const userId = await requireUserId();
    await createEnrollment(userId, parsed.data);
    revalidatePath('/programs');
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    if (error instanceof EnrollmentAlreadyExistsError) {
      return { success: false, error: 'You are already enrolled in this program' };
    }
    if (error instanceof ProgramNotFoundError) {
      return { success: false, error: 'Program not found' };
    }
    if (error instanceof ProgramEnrollmentLimitReachedError) {
      return { success: false, error: error.message };
    }
    logger.error({ err: error }, 'Failed to enroll in program');
    return { success: false, error: 'Failed to enroll. Please try again.' };
  }
}

export async function editEnrollment(input: UpdateEnrollmentInput): Promise<ActionResult> {
  const parsed = updateEnrollmentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const userId = await requireUserId();
    await updateEnrollmentService(userId, parsed.data);
    revalidatePath('/programs');
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    if (error instanceof EnrollmentNotFoundError) {
      return { success: false, error: 'Enrollment not found' };
    }
    logger.error({ err: error }, 'Failed to update enrollment');
    return { success: false, error: 'Failed to update. Please try again.' };
  }
}

export async function removeEnrollment(enrollmentId: string): Promise<ActionResult> {
  const parsed = deleteEnrollmentSchema.safeParse({ enrollmentId });
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const userId = await requireUserId();
    await deleteEnrollmentService(userId, parsed.data.enrollmentId);
    revalidatePath('/programs');
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    if (error instanceof EnrollmentNotFoundError) {
      return { success: false, error: 'Enrollment not found' };
    }
    logger.error({ err: error }, 'Failed to delete enrollment');
    return { success: false, error: 'Failed to delete. Please try again.' };
  }
}

export async function quickUpdateBalance(input: QuickUpdateBalanceInput): Promise<ActionResult> {
  const parsed = quickUpdateBalanceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const userId = await requireUserId();
    await quickUpdateBalanceService(userId, parsed.data);
    revalidatePath('/programs');
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    if (error instanceof EnrollmentNotFoundError) {
      return { success: false, error: 'Enrollment not found' };
    }
    logger.error({ err: error }, 'Failed to quick-update balance');
    return { success: false, error: 'Failed to update balance. Please try again.' };
  }
}
