'use server';

import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';
import {
  createFamilyMemberSchema,
  updateFamilyMemberSchema,
  deleteFamilyMemberSchema,
  createFamilyEnrollmentSchema,
  updateFamilyEnrollmentSchema,
  deleteFamilyEnrollmentSchema,
  type CreateFamilyMemberInput,
  type UpdateFamilyMemberInput,
  type CreateFamilyEnrollmentInput,
  type UpdateFamilyEnrollmentInput,
} from '@/lib/validators/family.schema';
import {
  createFamilyMember as createFamilyMemberService,
  updateFamilyMember as updateFamilyMemberService,
  deleteFamilyMember as deleteFamilyMemberService,
  createFamilyEnrollment as createFamilyEnrollmentService,
  updateFamilyEnrollment as updateFamilyEnrollmentService,
  deleteFamilyEnrollment as deleteFamilyEnrollmentService,
  FamilyMemberNotFoundError,
  FamilyEnrollmentNotFoundError,
  FamilyEnrollmentAlreadyExistsError,
  ProgramNotFoundError,
} from '@/lib/services/family-member.service';
import { requireUserId, isAuthenticationError, type ActionResult } from './helpers';

const FAMILY_PATH = '/family';

export async function addFamilyMember(input: CreateFamilyMemberInput): Promise<ActionResult> {
  const parsed = createFamilyMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const userId = await requireUserId();
    await createFamilyMemberService(userId, parsed.data);
    revalidatePath(FAMILY_PATH);
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    logger.error({ err: error }, 'Failed to create family member');
    return { success: false, error: 'Failed to add family member. Please try again.' };
  }
}

export async function editFamilyMember(input: UpdateFamilyMemberInput): Promise<ActionResult> {
  const parsed = updateFamilyMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const userId = await requireUserId();
    await updateFamilyMemberService(userId, parsed.data);
    revalidatePath(FAMILY_PATH);
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    if (error instanceof FamilyMemberNotFoundError) {
      return { success: false, error: 'Family member not found' };
    }
    logger.error({ err: error }, 'Failed to update family member');
    return { success: false, error: 'Failed to update family member. Please try again.' };
  }
}

export async function removeFamilyMember(familyMemberId: string): Promise<ActionResult> {
  const parsed = deleteFamilyMemberSchema.safeParse({ familyMemberId });
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const userId = await requireUserId();
    await deleteFamilyMemberService(userId, parsed.data.familyMemberId);
    revalidatePath(FAMILY_PATH);
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    if (error instanceof FamilyMemberNotFoundError) {
      return { success: false, error: 'Family member not found' };
    }
    logger.error({ err: error }, 'Failed to delete family member');
    return { success: false, error: 'Failed to remove family member. Please try again.' };
  }
}

export async function addFamilyEnrollment(
  input: CreateFamilyEnrollmentInput
): Promise<ActionResult> {
  const parsed = createFamilyEnrollmentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const userId = await requireUserId();
    await createFamilyEnrollmentService(userId, parsed.data);
    revalidatePath(FAMILY_PATH);
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    if (error instanceof FamilyMemberNotFoundError) {
      return { success: false, error: 'Family member not found' };
    }
    if (error instanceof ProgramNotFoundError) {
      return { success: false, error: 'Program not found' };
    }
    if (error instanceof FamilyEnrollmentAlreadyExistsError) {
      return { success: false, error: 'Family member is already enrolled in this program' };
    }
    logger.error({ err: error }, 'Failed to create family enrollment');
    return { success: false, error: 'Failed to add enrollment. Please try again.' };
  }
}

export async function editFamilyEnrollment(
  input: UpdateFamilyEnrollmentInput
): Promise<ActionResult> {
  const parsed = updateFamilyEnrollmentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const userId = await requireUserId();
    await updateFamilyEnrollmentService(userId, parsed.data);
    revalidatePath(FAMILY_PATH);
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    if (error instanceof FamilyMemberNotFoundError) {
      return { success: false, error: 'Family member not found' };
    }
    if (error instanceof FamilyEnrollmentNotFoundError) {
      return { success: false, error: 'Enrollment not found' };
    }
    logger.error({ err: error }, 'Failed to update family enrollment');
    return { success: false, error: 'Failed to update enrollment. Please try again.' };
  }
}

export async function removeFamilyEnrollment(
  familyMemberId: string,
  enrollmentId: string
): Promise<ActionResult> {
  const parsed = deleteFamilyEnrollmentSchema.safeParse({ enrollmentId, familyMemberId });
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const userId = await requireUserId();
    await deleteFamilyEnrollmentService(
      userId,
      parsed.data.familyMemberId,
      parsed.data.enrollmentId
    );
    revalidatePath(FAMILY_PATH);
    return { success: true };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { success: false, error: 'You must be logged in to perform this action' };
    }
    if (error instanceof FamilyMemberNotFoundError) {
      return { success: false, error: 'Family member not found' };
    }
    if (error instanceof FamilyEnrollmentNotFoundError) {
      return { success: false, error: 'Enrollment not found' };
    }
    logger.error({ err: error }, 'Failed to delete family enrollment');
    return { success: false, error: 'Failed to remove enrollment. Please try again.' };
  }
}
