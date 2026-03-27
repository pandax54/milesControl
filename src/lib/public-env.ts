import { z } from 'zod';

const publicEnvSchema = z.object({
  NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.url().optional().default('https://us.i.posthog.com'),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

function loadPublicEnv(): PublicEnv {
  const parsed = publicEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const formatted = z.prettifyError(parsed.error);
    throw new Error(`Invalid public environment variables:\n${formatted}`);
  }

  return parsed.data;
}

export const publicEnv = loadPublicEnv();

export const IS_ANALYTICS_ENABLED = publicEnv.NEXT_PUBLIC_POSTHOG_KEY !== undefined;
