'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { captureAnalyticsEvent, initializeAnalytics } from '@/lib/analytics/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { getFeatureUsageContext } from '@/lib/analytics/feature-usage';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initializeAnalytics();
  }, []);

  return (
    <>
      <AnalyticsPageTracker />
      {children}
    </>
  );
}

export function AnalyticsPageTracker() {
  const pathname = usePathname();
  const lastTrackedPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    const featureUsageContext = getFeatureUsageContext(pathname);

    if (!featureUsageContext || lastTrackedPathnameRef.current === featureUsageContext.pathname) {
      return;
    }

    captureAnalyticsEvent(ANALYTICS_EVENTS.featureUsed, {
      ...featureUsageContext,
      trigger: 'page_view',
    });
    lastTrackedPathnameRef.current = featureUsageContext.pathname;
  }, [pathname]);

  return null;
}
