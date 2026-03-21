import { describe, it, expect } from 'vitest';
import { enrollProgramSchema, updateEnrollmentSchema, deleteEnrollmentSchema, quickUpdateBalanceSchema } from './program.schema';

describe('enrollProgramSchema', () => {
  it('should accept valid input with all fields', () => {
    const input = {
      programId: 'prog-123',
      memberNumber: '999888777',
      currentBalance: 15000,
      tier: 'Gold',
      expirationDate: '2026-12-31T00:00:00.000Z',
    };

    const result = enrollProgramSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.programId).toBe('prog-123');
      expect(result.data.currentBalance).toBe(15000);
    }
  });

  it('should accept valid input with only required fields', () => {
    const input = { programId: 'prog-123' };

    const result = enrollProgramSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currentBalance).toBe(0);
    }
  });

  it('should reject empty programId', () => {
    const result = enrollProgramSchema.safeParse({ programId: '' });
    expect(result.success).toBe(false);
  });

  it('should reject negative balance', () => {
    const result = enrollProgramSchema.safeParse({
      programId: 'prog-123',
      currentBalance: -100,
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-integer balance', () => {
    const result = enrollProgramSchema.safeParse({
      programId: 'prog-123',
      currentBalance: 15.5,
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid expiration date format', () => {
    const result = enrollProgramSchema.safeParse({
      programId: 'prog-123',
      expirationDate: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateEnrollmentSchema', () => {
  it('should accept valid input with all fields', () => {
    const input = {
      enrollmentId: 'enr-123',
      memberNumber: '111222333',
      currentBalance: 20000,
      tier: 'Diamond',
      expirationDate: '2027-06-30T00:00:00.000Z',
    };

    const result = updateEnrollmentSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should accept partial update with only enrollmentId', () => {
    const result = updateEnrollmentSchema.safeParse({ enrollmentId: 'enr-123' });
    expect(result.success).toBe(true);
  });

  it('should accept null expirationDate for clearing', () => {
    const result = updateEnrollmentSchema.safeParse({
      enrollmentId: 'enr-123',
      expirationDate: null,
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty enrollmentId', () => {
    const result = updateEnrollmentSchema.safeParse({ enrollmentId: '' });
    expect(result.success).toBe(false);
  });

  it('should reject negative balance', () => {
    const result = updateEnrollmentSchema.safeParse({
      enrollmentId: 'enr-123',
      currentBalance: -1,
    });
    expect(result.success).toBe(false);
  });
});

describe('deleteEnrollmentSchema', () => {
  it('should accept valid enrollmentId', () => {
    const result = deleteEnrollmentSchema.safeParse({ enrollmentId: 'enr-123' });
    expect(result.success).toBe(true);
  });

  it('should reject empty enrollmentId', () => {
    const result = deleteEnrollmentSchema.safeParse({ enrollmentId: '' });
    expect(result.success).toBe(false);
  });
});

describe('quickUpdateBalanceSchema', () => {
  it('should accept valid add mode input', () => {
    const result = quickUpdateBalanceSchema.safeParse({
      enrollmentId: 'enr-123',
      mode: 'add',
      amount: 1000,
    });
    expect(result.success).toBe(true);
  });

  it('should accept valid subtract mode input', () => {
    const result = quickUpdateBalanceSchema.safeParse({
      enrollmentId: 'enr-123',
      mode: 'subtract',
      amount: 5000,
    });
    expect(result.success).toBe(true);
  });

  it('should accept valid set mode input', () => {
    const result = quickUpdateBalanceSchema.safeParse({
      enrollmentId: 'enr-123',
      mode: 'set',
      amount: 15000,
    });
    expect(result.success).toBe(true);
  });

  it('should accept zero amount', () => {
    const result = quickUpdateBalanceSchema.safeParse({
      enrollmentId: 'enr-123',
      mode: 'set',
      amount: 0,
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid mode', () => {
    const result = quickUpdateBalanceSchema.safeParse({
      enrollmentId: 'enr-123',
      mode: 'multiply',
      amount: 1000,
    });
    expect(result.success).toBe(false);
  });

  it('should reject negative amount', () => {
    const result = quickUpdateBalanceSchema.safeParse({
      enrollmentId: 'enr-123',
      mode: 'add',
      amount: -100,
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-integer amount', () => {
    const result = quickUpdateBalanceSchema.safeParse({
      enrollmentId: 'enr-123',
      mode: 'add',
      amount: 10.5,
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty enrollmentId', () => {
    const result = quickUpdateBalanceSchema.safeParse({
      enrollmentId: '',
      mode: 'add',
      amount: 1000,
    });
    expect(result.success).toBe(false);
  });
});
