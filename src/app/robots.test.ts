import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: {
    NEXTAUTH_URL: 'https://milescontrol.com',
  },
}));

import robots from './robots';

describe('robots', () => {
  it('should allow public SEO routes and block internal app paths', () => {
    const result = robots();

    expect(result.rules).toEqual({
      userAgent: '*',
      allow: ['/', '/calculator', '/promotions', '/promotions/calendar'],
      disallow: expect.arrayContaining(['/_public', '/admin', '/api', '/login', '/register']),
    });
    expect(result.sitemap).toBe('https://milescontrol.com/sitemap.xml');
  });
});
