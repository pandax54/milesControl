import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MilesControl',
    short_name: 'MilesControl',
    description: 'Miles and points management with offline dashboard access on mobile devices.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#020817',
    theme_color: '#0f172a',
    orientation: 'portrait',
    categories: ['finance', 'productivity', 'travel'],
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
