export const ANALYTICS_EVENTS = {
  featureUsed: 'feature_used',
  onboardingCompleted: 'onboarding_completed',
  promoEngaged: 'promo_engaged',
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type AnalyticsPropertyValue = string | number | boolean | null | undefined;

export type AnalyticsProperties = Readonly<Record<string, AnalyticsPropertyValue>>;
