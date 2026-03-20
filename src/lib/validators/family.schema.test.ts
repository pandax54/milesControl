import { describe, it, expect } from 'vitest';
import {
  createFamilyMemberSchema,
  updateFamilyMemberSchema,
  deleteFamilyMemberSchema,
  createFamilyEnrollmentSchema,
  updateFamilyEnrollmentSchema,
  deleteFamilyEnrollmentSchema,
  RELATIONSHIPS,
  RELATIONSHIP_LABELS,
} from './family.schema';

describe('family.schema', () => {
  describe('RELATIONSHIPS', () => {
    it('should contain expected relationship types', () => {
      expect(RELATIONSHIPS).toContain('spouse');
      expect(RELATIONSHIPS).toContain('child');
      expect(RELATIONSHIPS).toContain('parent');
      expect(RELATIONSHIPS).toContain('sibling');
      expect(RELATIONSHIPS).toContain('other');
    });

    it('should have labels for all relationship types', () => {
      for (const rel of RELATIONSHIPS) {
        expect(RELATIONSHIP_LABELS[rel]).toBeDefined();
        expect(typeof RELATIONSHIP_LABELS[rel]).toBe('string');
      }
    });
  });

  describe('createFamilyMemberSchema', () => {
    it('should accept valid input with name only', () => {
      const result = createFamilyMemberSchema.safeParse({ name: 'Maria' });
      expect(result.success).toBe(true);
    });

    it('should accept valid input with name and relationship', () => {
      const result = createFamilyMemberSchema.safeParse({
        name: 'Maria',
        relationship: 'spouse',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const result = createFamilyMemberSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });

    it('should reject name over 100 characters', () => {
      const result = createFamilyMemberSchema.safeParse({ name: 'a'.repeat(101) });
      expect(result.success).toBe(false);
    });

    it('should reject missing name', () => {
      const result = createFamilyMemberSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject invalid relationship value', () => {
      const result = createFamilyMemberSchema.safeParse({
        name: 'Maria',
        relationship: 'invalid-value',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateFamilyMemberSchema', () => {
    it('should accept valid update with name', () => {
      const result = updateFamilyMemberSchema.safeParse({
        familyMemberId: 'abc123',
        name: 'Updated Name',
      });
      expect(result.success).toBe(true);
    });

    it('should accept update with null relationship', () => {
      const result = updateFamilyMemberSchema.safeParse({
        familyMemberId: 'abc123',
        relationship: null,
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing familyMemberId', () => {
      const result = updateFamilyMemberSchema.safeParse({ name: 'Test' });
      expect(result.success).toBe(false);
    });

    it('should reject empty familyMemberId', () => {
      const result = updateFamilyMemberSchema.safeParse({
        familyMemberId: '',
        name: 'Test',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('deleteFamilyMemberSchema', () => {
    it('should accept valid familyMemberId', () => {
      const result = deleteFamilyMemberSchema.safeParse({ familyMemberId: 'abc123' });
      expect(result.success).toBe(true);
    });

    it('should reject empty familyMemberId', () => {
      const result = deleteFamilyMemberSchema.safeParse({ familyMemberId: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('createFamilyEnrollmentSchema', () => {
    it('should accept valid enrollment input', () => {
      const result = createFamilyEnrollmentSchema.safeParse({
        familyMemberId: 'fm1',
        programId: 'prog1',
        currentBalance: 5000,
      });
      expect(result.success).toBe(true);
    });

    it('should accept enrollment with all optional fields', () => {
      const result = createFamilyEnrollmentSchema.safeParse({
        familyMemberId: 'fm1',
        programId: 'prog1',
        memberNumber: '12345',
        currentBalance: 10000,
        tier: 'Gold',
        expirationDate: '2026-12-31T00:00:00.000Z',
      });
      expect(result.success).toBe(true);
    });

    it('should default currentBalance to 0', () => {
      const result = createFamilyEnrollmentSchema.safeParse({
        familyMemberId: 'fm1',
        programId: 'prog1',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currentBalance).toBe(0);
      }
    });

    it('should reject negative balance', () => {
      const result = createFamilyEnrollmentSchema.safeParse({
        familyMemberId: 'fm1',
        programId: 'prog1',
        currentBalance: -100,
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing familyMemberId', () => {
      const result = createFamilyEnrollmentSchema.safeParse({
        programId: 'prog1',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing programId', () => {
      const result = createFamilyEnrollmentSchema.safeParse({
        familyMemberId: 'fm1',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid expirationDate format', () => {
      const result = createFamilyEnrollmentSchema.safeParse({
        familyMemberId: 'fm1',
        programId: 'prog1',
        expirationDate: '2026-12-31',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateFamilyEnrollmentSchema', () => {
    it('should accept valid update', () => {
      const result = updateFamilyEnrollmentSchema.safeParse({
        enrollmentId: 'enr1',
        familyMemberId: 'fm1',
        currentBalance: 8000,
      });
      expect(result.success).toBe(true);
    });

    it('should accept null expirationDate', () => {
      const result = updateFamilyEnrollmentSchema.safeParse({
        enrollmentId: 'enr1',
        familyMemberId: 'fm1',
        expirationDate: null,
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing enrollmentId', () => {
      const result = updateFamilyEnrollmentSchema.safeParse({
        familyMemberId: 'fm1',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing familyMemberId', () => {
      const result = updateFamilyEnrollmentSchema.safeParse({
        enrollmentId: 'enr1',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('deleteFamilyEnrollmentSchema', () => {
    it('should accept valid input', () => {
      const result = deleteFamilyEnrollmentSchema.safeParse({
        enrollmentId: 'enr1',
        familyMemberId: 'fm1',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing enrollmentId', () => {
      const result = deleteFamilyEnrollmentSchema.safeParse({
        familyMemberId: 'fm1',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing familyMemberId', () => {
      const result = deleteFamilyEnrollmentSchema.safeParse({
        enrollmentId: 'enr1',
      });
      expect(result.success).toBe(false);
    });
  });
});
