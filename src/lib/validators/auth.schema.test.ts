import { describe, it, expect } from 'vitest';
import { signInSchema, registerSchema } from './auth.schema';

describe('signInSchema', () => {
  it('should validate a correct sign-in input', () => {
    const result = signInSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
    });

    expect(result.success).toBe(true);
  });

  it('should reject an invalid email', () => {
    const result = signInSchema.safeParse({
      email: 'not-an-email',
      password: 'password123',
    });

    expect(result.success).toBe(false);
  });

  it('should reject a short password', () => {
    const result = signInSchema.safeParse({
      email: 'user@example.com',
      password: '1234567',
    });

    expect(result.success).toBe(false);
  });

  it('should reject missing fields', () => {
    const result = signInSchema.safeParse({});

    expect(result.success).toBe(false);
  });
});

describe('registerSchema', () => {
  it('should validate a correct register input', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    });

    expect(result.success).toBe(true);
  });

  it('should reject a short name', () => {
    const result = registerSchema.safeParse({
      name: 'J',
      email: 'john@example.com',
      password: 'password123',
    });

    expect(result.success).toBe(false);
  });

  it('should reject missing name', () => {
    const result = registerSchema.safeParse({
      email: 'john@example.com',
      password: 'password123',
    });

    expect(result.success).toBe(false);
  });
});
