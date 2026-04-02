import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('env', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV } as NodeJS.ProcessEnv;
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('should parse valid environment variables', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      DATABASE_URL: 'postgresql://localhost:5432/test',
      NEXTAUTH_SECRET: 'test-secret',
      NODE_ENV: 'test',
    } as NodeJS.ProcessEnv;

    const { env } = await import('./env');

    expect(env.DATABASE_URL).toBe('postgresql://localhost:5432/test');
    expect(env.NEXTAUTH_SECRET).toBe('test-secret');
    expect(env.NODE_ENV).toBe('test');
  });

  it('should throw when DATABASE_URL is missing', async () => {
    const envCopy = { ...ORIGINAL_ENV } as Record<string, string | undefined>;
    delete envCopy.DATABASE_URL;
    envCopy.NEXTAUTH_SECRET = 'test-secret';
    process.env = envCopy as NodeJS.ProcessEnv;

    await expect(import('./env')).rejects.toThrow('Invalid environment variables');
  });

  it('should throw when NEXTAUTH_SECRET is missing', async () => {
    const envCopy = { ...ORIGINAL_ENV } as Record<string, string | undefined>;
    envCopy.DATABASE_URL = 'postgresql://localhost:5432/test';
    delete envCopy.NEXTAUTH_SECRET;
    process.env = envCopy as NodeJS.ProcessEnv;

    await expect(import('./env')).rejects.toThrow('Invalid environment variables');
  });

  it('should default NODE_ENV to development when not set', async () => {
    const envCopy = { ...ORIGINAL_ENV } as Record<string, string | undefined>;
    envCopy.DATABASE_URL = 'postgresql://localhost:5432/test';
    envCopy.NEXTAUTH_SECRET = 'test-secret';
    delete envCopy.NODE_ENV;
    process.env = envCopy as NodeJS.ProcessEnv;

    const { env } = await import('./env');

    expect(env.NODE_ENV).toBe('development');
  });

  it('should accept optional fields as undefined', async () => {
    const envCopy = { ...ORIGINAL_ENV } as Record<string, string | undefined>;
    envCopy.DATABASE_URL = 'postgresql://localhost:5432/test';
    envCopy.NEXTAUTH_SECRET = 'test-secret';
    envCopy.NODE_ENV = 'test';
    delete envCopy.GOOGLE_CLIENT_ID;
    delete envCopy.SEATS_AERO_API_KEY;
    delete envCopy.TELEGRAM_BOT_TOKEN;
    process.env = envCopy as NodeJS.ProcessEnv;

    const { env } = await import('./env');

    expect(env.GOOGLE_CLIENT_ID).toBeUndefined();
    expect(env.SEATS_AERO_API_KEY).toBeUndefined();
    expect(env.TELEGRAM_BOT_TOKEN).toBeUndefined();
  });
});
