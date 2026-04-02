import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('publicEnv', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV } as NodeJS.ProcessEnv;
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('should parse optional PostHog configuration', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      NEXT_PUBLIC_POSTHOG_KEY: 'phc_test_key',
      NEXT_PUBLIC_POSTHOG_HOST: 'https://app.posthog.com',
    } as NodeJS.ProcessEnv;

    const { publicEnv, IS_ANALYTICS_ENABLED } = await import('./public-env');

    expect(publicEnv.NEXT_PUBLIC_POSTHOG_KEY).toBe('phc_test_key');
    expect(publicEnv.NEXT_PUBLIC_POSTHOG_HOST).toBe('https://app.posthog.com');
    expect(IS_ANALYTICS_ENABLED).toBe(true);
  });

  it('should default the PostHog host when it is not configured', async () => {
    const envCopy = { ...ORIGINAL_ENV } as Record<string, string | undefined>;
    envCopy.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test_key';
    delete envCopy.NEXT_PUBLIC_POSTHOG_HOST;
    process.env = envCopy as NodeJS.ProcessEnv;

    const { publicEnv } = await import('./public-env');

    expect(publicEnv.NEXT_PUBLIC_POSTHOG_HOST).toBe('https://us.i.posthog.com');
  });

  it('should keep analytics disabled when the project key is missing', async () => {
    const envCopy = { ...ORIGINAL_ENV } as Record<string, string | undefined>;
    delete envCopy.NEXT_PUBLIC_POSTHOG_KEY;
    delete envCopy.NEXT_PUBLIC_POSTHOG_HOST;
    process.env = envCopy as NodeJS.ProcessEnv;

    const { publicEnv, IS_ANALYTICS_ENABLED } = await import('./public-env');

    expect(publicEnv.NEXT_PUBLIC_POSTHOG_KEY).toBeUndefined();
    expect(IS_ANALYTICS_ENABLED).toBe(false);
  });

  it('should reject an invalid PostHog host value', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      NEXT_PUBLIC_POSTHOG_HOST: 'not-a-url',
    } as NodeJS.ProcessEnv;

    await expect(import('./public-env')).rejects.toThrow('Invalid public environment variables');
  });
});
