import { env } from '@/lib/env';

export const SITE_NAME = 'MilesControl';
export const SITE_DESCRIPTION =
  'Track Brazilian airline and bank points, compare transfer promotions, and calculate your cost per milheiro with public miles tools.';
export const DEFAULT_SITE_URL = 'https://milescontrol.com';

export function getSiteUrl(): URL {
  return new URL(env.NEXTAUTH_URL ?? DEFAULT_SITE_URL);
}

export function buildAbsoluteUrl(path = '/'): string {
  return new URL(path, getSiteUrl()).toString();
}
