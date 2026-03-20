import { z } from 'zod';

export const RELATIONSHIPS = [
  'spouse',
  'child',
  'parent',
  'sibling',
  'other',
] as const;

export type RelationshipValue = (typeof RELATIONSHIPS)[number];

export const RELATIONSHIP_LABELS: Record<RelationshipValue, string> = {
  spouse: 'Spouse',
  child: 'Child',
  parent: 'Parent',
  sibling: 'Sibling',
  other: 'Other',
};

export const createFamilyMemberSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  relationship: z.enum(RELATIONSHIPS).optional(),
});

export const updateFamilyMemberSchema = z.object({
  familyMemberId: z.string().min(1, 'Family member ID is required'),
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long').optional(),
  relationship: z.enum(RELATIONSHIPS).nullable().optional(),
});

export const deleteFamilyMemberSchema = z.object({
  familyMemberId: z.string().min(1, 'Family member ID is required'),
});

export const createFamilyEnrollmentSchema = z.object({
  familyMemberId: z.string().min(1, 'Family member ID is required'),
  programId: z.string().min(1, 'Program is required'),
  memberNumber: z.string().optional(),
  currentBalance: z.number().int().min(0, 'Balance must be non-negative').default(0),
  tier: z.string().optional(),
  expirationDate: z.string().datetime().optional(),
});

export const updateFamilyEnrollmentSchema = z.object({
  enrollmentId: z.string().min(1, 'Enrollment ID is required'),
  familyMemberId: z.string().min(1, 'Family member ID is required'),
  memberNumber: z.string().optional(),
  currentBalance: z.number().int().min(0, 'Balance must be non-negative').optional(),
  tier: z.string().optional(),
  expirationDate: z.string().datetime().nullable().optional(),
});

export const deleteFamilyEnrollmentSchema = z.object({
  enrollmentId: z.string().min(1, 'Enrollment ID is required'),
  familyMemberId: z.string().min(1, 'Family member ID is required'),
});

export type CreateFamilyMemberInput = z.infer<typeof createFamilyMemberSchema>;
export type UpdateFamilyMemberInput = z.infer<typeof updateFamilyMemberSchema>;
export type DeleteFamilyMemberInput = z.infer<typeof deleteFamilyMemberSchema>;
export type CreateFamilyEnrollmentInput = z.infer<typeof createFamilyEnrollmentSchema>;
export type UpdateFamilyEnrollmentInput = z.infer<typeof updateFamilyEnrollmentSchema>;
export type DeleteFamilyEnrollmentInput = z.infer<typeof deleteFamilyEnrollmentSchema>;
