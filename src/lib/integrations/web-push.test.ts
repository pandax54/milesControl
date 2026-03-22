import { describe, it, expect, vi, beforeEach } from 'vitest';

// ==================== Mocks ====================

const { mockSendNotification, mockSetVapidDetails } = vi.hoisted(() => ({
  mockSendNotification: vi.fn(),
  mockSetVapidDetails: vi.fn(),
}));

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: mockSetVapidDetails,
    sendNotification: mockSendNotification,
  },
}));

vi.mock('@/lib/env', () => ({
  env: {
    VAPID_PUBLIC_KEY: 'test-public-key',
    VAPID_PRIVATE_KEY: 'test-private-key',
    VAPID_EMAIL: 'mailto:admin@milescontrol.com',
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Import after mocks
import { sendPushNotification, getVapidPublicKey } from './web-push';
import type { PushSubscriptionKeys, PushPayload } from './web-push';

// ==================== Factories ====================

function buildSubscription(overrides: Partial<PushSubscriptionKeys> = {}): PushSubscriptionKeys {
  return {
    endpoint: 'https://push.example.com/subscription/abc123',
    p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlV_Ev5UMVo6aFbxoJklHMOlPqLq1k43tVQWrREQ',
    auth: 'tBHItJI5svbpez7KI4CCXg',
    ...overrides,
  };
}

function buildPayload(overrides: Partial<PushPayload> = {}): PushPayload {
  return {
    title: '90% transfer bonus: Livelo → Smiles',
    body: 'Min transfer: 1,000 pts · Deadline: 31/12/2025',
    ...overrides,
  };
}

// ==================== getVapidPublicKey ====================

describe('getVapidPublicKey', () => {
  it('should return the configured public key', () => {
    const key = getVapidPublicKey();

    expect(key).toBe('test-public-key');
  });
});

// ==================== sendPushNotification ====================

describe('sendPushNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendNotification.mockResolvedValue({ statusCode: 201 });
  });

  // This test must run first — vapidConfigured is module-level state set once
  it('should configure VAPID details on first invocation', async () => {
    await sendPushNotification(buildSubscription(), buildPayload());

    expect(mockSetVapidDetails).toHaveBeenCalledWith(
      'mailto:admin@milescontrol.com',
      'test-public-key',
      'test-private-key',
    );
  });

  it('should send a notification successfully', async () => {
    const result = await sendPushNotification(buildSubscription(), buildPayload());

    expect(result).toBe(true);
    expect(mockSendNotification).toHaveBeenCalledOnce();
    expect(mockSendNotification).toHaveBeenCalledWith(
      {
        endpoint: 'https://push.example.com/subscription/abc123',
        keys: {
          p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlV_Ev5UMVo6aFbxoJklHMOlPqLq1k43tVQWrREQ',
          auth: 'tBHItJI5svbpez7KI4CCXg',
        },
      },
      JSON.stringify(buildPayload()),
    );
  });

  it('should return false when subscription is expired (410)', async () => {
    mockSendNotification.mockRejectedValue({ statusCode: 410 });

    const result = await sendPushNotification(buildSubscription(), buildPayload());

    expect(result).toBe(false);
  });

  it('should return false when subscription is gone (404)', async () => {
    mockSendNotification.mockRejectedValue({ statusCode: 404 });

    const result = await sendPushNotification(buildSubscription(), buildPayload());

    expect(result).toBe(false);
  });

  it('should return false on unexpected error', async () => {
    mockSendNotification.mockRejectedValue(new Error('Network error'));

    const result = await sendPushNotification(buildSubscription(), buildPayload());

    expect(result).toBe(false);
  });

  it('should serialize payload as JSON string', async () => {
    const payload = buildPayload({ title: 'Test Alert', body: 'Test body', tag: 'promo-1' });

    await sendPushNotification(buildSubscription(), payload);

    const sentPayload = mockSendNotification.mock.calls[0][1] as string;
    const parsed = JSON.parse(sentPayload) as PushPayload;

    expect(parsed.title).toBe('Test Alert');
    expect(parsed.body).toBe('Test body');
    expect(parsed.tag).toBe('promo-1');
  });
});
