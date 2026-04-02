import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsProvider } from './analytics-provider';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';

let currentPathname = '/promotions';

vi.mock('next/navigation', () => ({
  usePathname: () => currentPathname,
}));

vi.mock('@/lib/analytics/client', () => ({
  initializeAnalytics: vi.fn(),
  captureAnalyticsEvent: vi.fn(),
}));

import { captureAnalyticsEvent, initializeAnalytics } from '@/lib/analytics/client';

const mockCaptureAnalyticsEvent = vi.mocked(captureAnalyticsEvent);
const mockInitializeAnalytics = vi.mocked(initializeAnalytics);

describe('AnalyticsProvider', () => {
  beforeEach(() => {
    currentPathname = '/promotions';
    vi.clearAllMocks();
  });

  it('should initialize analytics and capture feature usage for tracked routes', async () => {
    render(
      <AnalyticsProvider>
        <div>Analytics ready</div>
      </AnalyticsProvider>,
    );

    await waitFor(() => {
      expect(mockInitializeAnalytics).toHaveBeenCalledTimes(1);
      expect(mockCaptureAnalyticsEvent).toHaveBeenCalledWith(ANALYTICS_EVENTS.featureUsed, {
        featureName: 'promo_feed',
        pathname: '/promotions',
        productArea: 'promotions',
        trigger: 'page_view',
      });
    });
  });

  it('should skip tracking for routes outside the analytics map', async () => {
    currentPathname = '/login';

    render(
      <AnalyticsProvider>
        <div>Auth page</div>
      </AnalyticsProvider>,
    );

    await waitFor(() => {
      expect(mockInitializeAnalytics).toHaveBeenCalledTimes(1);
    });

    expect(mockCaptureAnalyticsEvent).not.toHaveBeenCalled();
  });
});
