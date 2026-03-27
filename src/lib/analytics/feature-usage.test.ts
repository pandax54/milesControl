import { describe, expect, it } from 'vitest';
import { getFeatureUsageContext } from './feature-usage';

describe('getFeatureUsageContext', () => {
  it('should map the dashboard root to the home feature', () => {
    expect(getFeatureUsageContext('/')).toEqual({
      featureName: 'home',
      pathname: '/',
      productArea: 'dashboard',
    });
  });

  it('should normalize trailing slashes before matching a feature route', () => {
    expect(getFeatureUsageContext('/promotions/')).toEqual({
      featureName: 'promo_feed',
      pathname: '/promotions',
      productArea: 'promotions',
    });
  });

  it('should match nested admin routes to the correct feature bucket', () => {
    expect(getFeatureUsageContext('/admin/clients/client-123/report')).toEqual({
      featureName: 'admin_clients',
      pathname: '/admin/clients/client-123/report',
      productArea: 'admin',
    });
  });

  it('should return null for routes outside the tracked product surfaces', () => {
    expect(getFeatureUsageContext('/login')).toBeNull();
  });
});
