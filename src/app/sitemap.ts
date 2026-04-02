import type { MetadataRoute } from 'next';
import { buildAbsoluteUrl } from '@/lib/seo/site-config';

const PUBLIC_SITEMAP_ENTRIES = [
  {
    path: '/',
    changeFrequency: 'daily' as const,
    priority: 1,
  },
  {
    path: '/calculator',
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  },
  {
    path: '/promotions',
    changeFrequency: 'hourly' as const,
    priority: 0.9,
  },
  {
    path: '/promotions/calendar',
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLIC_SITEMAP_ENTRIES.map((entry) => ({
    url: buildAbsoluteUrl(entry.path),
    lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
