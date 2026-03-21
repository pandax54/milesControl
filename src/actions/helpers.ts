import { auth } from '@/lib/auth';

export interface ActionResult {
  success: boolean;
  error?: string;
}

export class AuthenticationError extends Error {
  constructor() {
    super('Not authenticated');
    this.name = 'AuthenticationError';
  }
}

export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthenticationError();
  }
  return session.user.id;
}

export function isAuthenticationError(error: unknown): boolean {
  return error instanceof AuthenticationError;
}
