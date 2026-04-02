import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: {
    NEXTAUTH_URL: 'https://milescontrol.com',
  },
}));

import {
  buildBreadcrumbSchema,
  buildPublicPageMetadata,
  buildSoftwareApplicationSchema,
  getPublicRewritePath,
} from './public-pages';

describe('getPublicRewritePath', () => {
  it('should rewrite supported public routes for signed-out visitors', () => {
    expect(getPublicRewritePath('/', false)).toBe('/_public');
    expect(getPublicRewritePath('/calculator', false)).toBe('/_public/calculator');
    expect(getPublicRewritePath('/promotions', false)).toBe('/_public/promotions');
    expect(getPublicRewritePath('/promotions/calendar', false)).toBe('/_public/promotions/calendar');
  });

  it('should not rewrite when the user is authenticated or route is unknown', () => {
    expect(getPublicRewritePath('/calculator', true)).toBeNull();
    expect(getPublicRewritePath('/programs', false)).toBeNull();
    expect(getPublicRewritePath('/_public/promotions', false)).toBeNull();
  });
});

describe('buildPublicPageMetadata', () => {
  it('should build canonical metadata for rewritten routes', () => {
    const metadata = buildPublicPageMetadata({
      title: 'Miles Calculator',
      description: 'Compare cost per milheiro scenarios.',
      path: '/_public/calculator',
      keywords: ['miles calculator'],
    });

    expect(metadata.alternates?.canonical).toBe('https://milescontrol.com/calculator');
    expect(metadata.openGraph?.url).toBe('https://milescontrol.com/calculator');
    expect(metadata.twitter).toMatchObject({ card: 'summary' });
    expect(metadata.keywords).toEqual(['miles calculator']);
  });
});

describe('structured data helpers', () => {
  it('should build a software application schema', () => {
    const schema = buildSoftwareApplicationSchema();

    expect(schema['@type']).toBe('SoftwareApplication');
    expect(schema.url).toBe('https://milescontrol.com/');
  });

  it('should build breadcrumb entries with absolute URLs', () => {
    const schema = buildBreadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Calculator', path: '/calculator' },
    ]);

    expect(schema.itemListElement).toEqual([
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://milescontrol.com/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Calculator',
        item: 'https://milescontrol.com/calculator',
      },
    ]);
  });
});
