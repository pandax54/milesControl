import type { Metadata } from 'next';
import { buildAbsoluteUrl, SITE_DESCRIPTION, SITE_NAME } from '@/lib/seo/site-config';

const PUBLIC_ROUTE_REWRITES = {
  '/': '/_public',
  '/calculator': '/_public/calculator',
  '/promotions': '/_public/promotions',
  '/promotions/calendar': '/_public/promotions/calendar',
} as const;

interface BuildPublicPageMetadataOptions {
  title: string;
  description: string;
  path: keyof typeof PUBLIC_ROUTE_REWRITES | '/_public' | '/_public/calculator' | '/_public/promotions' | '/_public/promotions/calendar';
  keywords?: string[];
}

interface BreadcrumbItem {
  name: string;
  path: string;
}

export function getPublicRewritePath(pathname: string, isAuthenticated: boolean): string | null {
  if (isAuthenticated || pathname.startsWith('/_public')) {
    return null;
  }

  return PUBLIC_ROUTE_REWRITES[pathname as keyof typeof PUBLIC_ROUTE_REWRITES] ?? null;
}

export function buildPublicPageMetadata({
  title,
  description,
  path,
  keywords = [],
}: BuildPublicPageMetadataOptions): Metadata {
  const canonicalPath = path.startsWith('/_public')
    ? path.replace('/_public', '') || '/'
    : path;
  const canonicalUrl = buildAbsoluteUrl(canonicalPath);

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: SITE_NAME,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export function buildWebPageSchema({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Record<string, string> {
  const url = buildAbsoluteUrl(path);

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url,
  };
}

export function buildSoftwareApplicationSchema(): Record<string, string> {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    applicationCategory: 'TravelApplication',
    operatingSystem: 'Web',
    description: SITE_DESCRIPTION,
    url: buildAbsoluteUrl('/'),
  };
}

export function buildBreadcrumbSchema(items: readonly BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: buildAbsoluteUrl(item.path),
    })),
  };
}
