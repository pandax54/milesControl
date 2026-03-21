'use server';

import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { registerSchema, type RegisterInput } from '@/lib/validators/auth.schema';
import { logger } from '@/lib/logger';

const SALT_ROUNDS = 12;

interface RegisterResult {
  success: boolean;
  error?: string;
}

export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  const { name, email, password } = parsed.data;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { success: false, error: 'Email already registered' };
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });

    logger.info({ email: '[REGISTERED]' }, 'User registered');

    return { success: true };
  } catch (error) {
    logger.error({ err: error }, 'Registration failed');
    return { success: false, error: 'Registration failed. Please try again.' };
  }
}
