export const PREMIUM_FEATURE_KEYS = [
  'milesValueAdvisor',
  'awardFlights',
  'exploreDestinations',
  'telegramAlerts',
  'benefits',
] as const;

export type PremiumFeatureKey = (typeof PREMIUM_FEATURE_KEYS)[number];

interface PremiumFeatureMetadata {
  readonly title: string;
  readonly description: string;
}

export const PREMIUM_FEATURE_METADATA: Record<PremiumFeatureKey, PremiumFeatureMetadata> = {
  milesValueAdvisor: {
    title: 'Miles Value Advisor',
    description: 'Use your personal cost history to decide whether paying with miles beats paying cash.',
  },
  awardFlights: {
    title: 'Award flight search',
    description: 'Compare miles prices and award availability alongside cash fares.',
  },
  exploreDestinations: {
    title: 'Explore Destinations',
    description: 'Browse destination ideas by region, dates, and miles value.',
  },
  telegramAlerts: {
    title: 'Telegram alerts',
    description: 'Receive promotion alerts and use MilesControl directly from Telegram.',
  },
  benefits: {
    title: 'Benefits tracking',
    description: 'Track free nights, companion passes, upgrade credits, and more.',
  },
};

export const FREE_TIER_FEATURES = [
  'Up to 5 loyalty programs',
  'Basic cost calculator',
  'Cash flight search',
] as const;

export const PREMIUM_TIER_FEATURES = [
  'Unlimited loyalty programs',
  'Miles Value Advisor',
  'Award flight search',
  'Explore Destinations',
  'Telegram alerts and bot access',
  'Benefits tracking',
] as const;
