import posthog from 'posthog-js';
import { IS_ANALYTICS_ENABLED, publicEnv } from '@/lib/public-env';
import type { AnalyticsEventName, AnalyticsProperties } from './events';

interface AnalyticsUser {
  readonly id: string;
  readonly email: string;
  readonly role: string;
  readonly name?: string;
}

let hasInitializedAnalytics = false;

export function initializeAnalytics() {
  if (!IS_ANALYTICS_ENABLED || hasInitializedAnalytics || typeof window === 'undefined') {
    return;
  }

  posthog.init(publicEnv.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: publicEnv.NEXT_PUBLIC_POSTHOG_HOST,
    capture_pageview: false,
    capture_pageleave: true,
    defaults: '2026-01-30',
    person_profiles: 'identified_only',
    persistence: 'localStorage+cookie',
  });

  hasInitializedAnalytics = true;
}

export function captureAnalyticsEvent(
  eventName: AnalyticsEventName,
  properties: AnalyticsProperties,
) {
  if (!IS_ANALYTICS_ENABLED || typeof window === 'undefined') {
    return;
  }

  initializeAnalytics();
  posthog.capture(eventName, properties);
}

export function identifyAnalyticsUser(user: AnalyticsUser) {
  if (!IS_ANALYTICS_ENABLED || typeof window === 'undefined') {
    return;
  }

  initializeAnalytics();
  posthog.identify(user.id, {
    email: user.email,
    role: user.role,
    ...(user.name ? { name: user.name } : {}),
  });
}
