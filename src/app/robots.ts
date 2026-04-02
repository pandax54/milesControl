import type { MetadataRoute } from 'next';
import { buildAbsoluteUrl } from '@/lib/seo/site-config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/calculator', '/promotions', '/promotions/calendar'],
      disallow: [
        '/_public',
        '/admin',
        '/alerts',
        '/api',
        '/benefits',
        '/credit-cards',
        '/family',
        '/flights',
        '/login',
        '/notifications',
        '/programs',
        '/register',
        '/subscriptions',
        '/transfers',
        '/upgrade',
      ],
    },
    sitemap: buildAbsoluteUrl('/sitemap.xml'),
  };
}
