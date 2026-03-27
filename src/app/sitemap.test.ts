import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: {
    NEXTAUTH_URL: 'https://milescontrol.com',
  },
}));

import sitemap from './sitemap';

describe('sitemap', () => {
  it('should include the public acquisition routes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-27T00:00:00.000Z'));

    const result = sitemap();

    expect(result).toEqual([
      {
        url: 'https://milescontrol.com/',
        lastModified: new Date('2026-03-27T00:00:00.000Z'),
        changeFrequency: 'daily',
        priority: 1,
      },
      {
        url: 'https://milescontrol.com/calculator',
        lastModified: new Date('2026-03-27T00:00:00.000Z'),
        changeFrequency: 'weekly',
        priority: 0.9,
      },
      {
        url: 'https://milescontrol.com/promotions',
        lastModified: new Date('2026-03-27T00:00:00.000Z'),
        changeFrequency: 'hourly',
        priority: 0.9,
      },
      {
        url: 'https://milescontrol.com/promotions/calendar',
        lastModified: new Date('2026-03-27T00:00:00.000Z'),
        changeFrequency: 'weekly',
        priority: 0.8,
      },
    ]);

    vi.useRealTimers();
  });
});
