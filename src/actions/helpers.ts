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

export class AuthorizationError extends Error {
  constructor() {
    super('Not authorized');
    this.name = 'AuthorizationError';
  }
}

export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthenticationError();
  }
  return session.user.id;
}

export async function requireAdminRole(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthenticationError();
  }
  if ((session.user as { role?: string }).role !== 'ADMIN') {
    throw new AuthorizationError();
  }
  return session.user.id;
}

export function isAuthenticationError(error: unknown): boolean {
  return error instanceof AuthenticationError;
}

export function isAuthorizationError(error: unknown): boolean {
  return error instanceof AuthorizationError;
}
