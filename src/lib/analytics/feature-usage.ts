export interface FeatureUsageContext {
  readonly featureName: string;
  readonly pathname: string;
  readonly productArea: string;
}

interface FeatureRouteDefinition {
  readonly pathname: string;
  readonly featureName: string;
  readonly productArea: string;
}

const FEATURE_ROUTE_DEFINITIONS: readonly FeatureRouteDefinition[] = [
  { pathname: '/promotions/calendar', featureName: 'promo_calendar', productArea: 'promotions' },
  { pathname: '/promotions', featureName: 'promo_feed', productArea: 'promotions' },
  { pathname: '/flights/search', featureName: 'flight_search', productArea: 'flights' },
  { pathname: '/flights/explore', featureName: 'flight_explore', productArea: 'flights' },
  { pathname: '/flights/watchlist', featureName: 'flight_watchlist', productArea: 'flights' },
  { pathname: '/credit-cards', featureName: 'credit_cards', productArea: 'dashboard' },
  { pathname: '/subscriptions', featureName: 'subscriptions', productArea: 'dashboard' },
  { pathname: '/transfers', featureName: 'transfers', productArea: 'dashboard' },
  { pathname: '/benefits', featureName: 'benefits', productArea: 'dashboard' },
  { pathname: '/family', featureName: 'family', productArea: 'dashboard' },
  { pathname: '/programs', featureName: 'programs', productArea: 'dashboard' },
  { pathname: '/calculator', featureName: 'calculator', productArea: 'planning' },
  { pathname: '/alerts', featureName: 'alerts', productArea: 'notifications' },
  { pathname: '/notifications', featureName: 'notifications', productArea: 'notifications' },
  { pathname: '/admin/promotions', featureName: 'admin_promo_matching', productArea: 'admin' },
  { pathname: '/admin/clients', featureName: 'admin_clients', productArea: 'admin' },
  { pathname: '/admin/audit-logs', featureName: 'admin_audit', productArea: 'admin' },
  { pathname: '/admin/audit', featureName: 'admin_audit', productArea: 'admin' },
  { pathname: '/admin', featureName: 'admin_dashboard', productArea: 'admin' },
  { pathname: '/upgrade', featureName: 'upgrade', productArea: 'billing' },
  { pathname: '/', featureName: 'home', productArea: 'dashboard' },
] as const;

function normalizePathname(pathname: string): string {
  if (!pathname) {
    return '/';
  }

  if (pathname === '/') {
    return pathname;
  }

  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

export function getFeatureUsageContext(pathname: string): FeatureUsageContext | null {
  const normalizedPathname = normalizePathname(pathname);

  const matchingDefinition = FEATURE_ROUTE_DEFINITIONS.find((definition) =>
    normalizedPathname === definition.pathname || normalizedPathname.startsWith(`${definition.pathname}/`),
  );

  if (!matchingDefinition) {
    return null;
  }

  return {
    featureName: matchingDefinition.featureName,
    pathname: normalizedPathname,
    productArea: matchingDefinition.productArea,
  };
}
