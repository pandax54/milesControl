import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';

// ==================== Mocks ====================

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: React.PropsWithChildren<{
    onClick?: () => void;
    disabled?: boolean;
  }>) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('lucide-react', () => ({
  Bell: () => <span data-testid="icon-bell" />,
  BellOff: () => <span data-testid="icon-bell-off" />,
  Loader2: () => <span data-testid="icon-loader" />,
}));

// Import after mocks
import { PushNotificationToggle } from './push-notification-toggle';

// ==================== Helpers ====================

// Track properties we define so we can restore them in afterEach
const definedProperties: Array<{
  obj: Record<string, unknown>;
  key: string;
  had: boolean;
  original?: PropertyDescriptor;
}> = [];

function defineTestProperty(obj: Record<string, unknown>, key: string, descriptor: PropertyDescriptor) {
  const original = Object.getOwnPropertyDescriptor(obj, key);
  definedProperties.push({ obj, key, had: original !== undefined, original });
  Object.defineProperty(obj, key, { configurable: true, ...descriptor });
}

function restoreProperties() {
  for (const { obj, key, had, original } of definedProperties.reverse()) {
    if (had && original) {
      Object.defineProperty(obj, key, original);
    } else {
      Reflect.deleteProperty(obj, key);
    }
  }
  definedProperties.length = 0;
}

function buildMockSubscription(endpoint = 'https://push.example.com/sub/abc') {
  return {
    endpoint,
    unsubscribe: vi.fn().mockResolvedValue(true),
    toJSON: vi.fn().mockReturnValue({
      endpoint,
      keys: { p256dh: 'test-p256dh', auth: 'test-auth' },
    }),
  };
}

function buildMockRegistration(subscription: ReturnType<typeof buildMockSubscription> | null = null) {
  return {
    pushManager: {
      getSubscription: vi.fn().mockResolvedValue(subscription),
      subscribe: vi.fn().mockResolvedValue(buildMockSubscription()),
    },
  };
}

function setupBrowserSupport(options: {
  notificationPermission?: NotificationPermission;
  existingSubscription?: ReturnType<typeof buildMockSubscription> | null;
} = {}) {
  const {
    notificationPermission = 'default',
    existingSubscription = null,
  } = options;

  const mockRegistration = buildMockRegistration(existingSubscription);

  defineTestProperty(navigator as unknown as Record<string, unknown>, 'serviceWorker', {
    value: {
      register: vi.fn().mockResolvedValue(mockRegistration),
      ready: Promise.resolve(mockRegistration),
    },
  });

  defineTestProperty(window as unknown as Record<string, unknown>, 'PushManager', {
    value: class PushManager {},
  });

  defineTestProperty(Notification as unknown as Record<string, unknown>, 'permission', {
    value: notificationPermission,
    writable: true,
  });

  return mockRegistration;
}

// ==================== Tests ====================

describe('PushNotificationToggle', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    vi.stubGlobal('Notification', Object.assign(
      class MockNotification {},
      {
        permission: 'default' as NotificationPermission,
        requestPermission: vi.fn().mockResolvedValue('granted'),
      },
    ));
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ publicKey: 'test-vapid-key' }),
    });
  });

  afterEach(() => {
    restoreProperties();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // ==================== Unsupported state ====================

  describe('unsupported browser', () => {
    it('should render nothing when serviceWorker is not supported', async () => {
      // Only define PushManager, not serviceWorker → 'serviceWorker' in navigator is false
      defineTestProperty(window as unknown as Record<string, unknown>, 'PushManager', {
        value: class PushManager {},
      });

      const { container } = render(<PushNotificationToggle />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it('should render nothing when PushManager is not supported', async () => {
      // Only define serviceWorker, not PushManager → 'PushManager' in window is false
      const mockRegistration = buildMockRegistration(null);
      defineTestProperty(navigator as unknown as Record<string, unknown>, 'serviceWorker', {
        value: {
          register: vi.fn().mockResolvedValue(mockRegistration),
          ready: Promise.resolve(mockRegistration),
        },
      });

      const { container } = render(<PushNotificationToggle />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });
  });

  // ==================== Denied state ====================

  describe('denied permission', () => {
    it('should show blocked message when notification permission is denied', async () => {
      setupBrowserSupport({ notificationPermission: 'denied' });

      render(<PushNotificationToggle />);

      await waitFor(() => {
        expect(screen.getByText('Notificações bloqueadas pelo navegador')).toBeInTheDocument();
      });
    });

    it('should render bell-off icon in denied state', async () => {
      setupBrowserSupport({ notificationPermission: 'denied' });

      render(<PushNotificationToggle />);

      await waitFor(() => {
        expect(screen.getAllByTestId('icon-bell-off')[0]).toBeInTheDocument();
      });
    });
  });

  // ==================== Subscribed state ====================

  describe('existing subscription', () => {
    it('should show unsubscribe button when subscription exists', async () => {
      const subscription = buildMockSubscription();
      setupBrowserSupport({ existingSubscription: subscription });

      render(<PushNotificationToggle />);

      await waitFor(() => {
        expect(screen.getByText('Desativar notificações push')).toBeInTheDocument();
      });
    });
  });

  // ==================== Unsubscribed state ====================

  describe('no existing subscription', () => {
    it('should show subscribe button when no subscription exists', async () => {
      setupBrowserSupport({ existingSubscription: null });

      render(<PushNotificationToggle />);

      await waitFor(() => {
        expect(screen.getByText('Ativar notificações push')).toBeInTheDocument();
      });
    });
  });

  // ==================== Subscribe flow ====================

  describe('subscribe flow', () => {
    it('should subscribe and show unsubscribe button on success', async () => {
      const mockRegistration = setupBrowserSupport({ existingSubscription: null });

      render(<PushNotificationToggle />);

      await waitFor(() => {
        expect(screen.getByText('Ativar notificações push')).toBeInTheDocument();
      });

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ publicKey: 'test-vapid-key' }) })
        .mockResolvedValueOnce({ ok: true });

      await act(async () => {
        fireEvent.click(screen.getByText('Ativar notificações push'));
      });

      await waitFor(() => {
        expect(screen.getByText('Desativar notificações push')).toBeInTheDocument();
      });

      expect(mockRegistration.pushManager.subscribe).toHaveBeenCalledWith({
        userVisibleOnly: true,
        applicationServerKey: expect.any(ArrayBuffer),
      });
    });

    it('should show denied state when user denies notification permission', async () => {
      setupBrowserSupport({ existingSubscription: null });

      vi.stubGlobal('Notification', Object.assign(
        class MockNotification {},
        {
          permission: 'default' as NotificationPermission,
          requestPermission: vi.fn().mockResolvedValue('denied'),
        },
      ));

      render(<PushNotificationToggle />);

      await waitFor(() => {
        expect(screen.getByText('Ativar notificações push')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Ativar notificações push'));
      });

      await waitFor(() => {
        expect(screen.getByText('Notificações bloqueadas pelo navegador')).toBeInTheDocument();
      });
    });

    it('should do nothing when vapid public key fetch fails', async () => {
      setupBrowserSupport({ existingSubscription: null });

      mockFetch.mockResolvedValueOnce({ ok: false });

      render(<PushNotificationToggle />);

      await waitFor(() => {
        expect(screen.getByText('Ativar notificações push')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Ativar notificações push'));
      });

      await waitFor(() => {
        expect(screen.getByText('Ativar notificações push')).toBeInTheDocument();
      });
    });

    it('should unsubscribe locally when server POST fails', async () => {
      const mockSubscription = buildMockSubscription();
      const mockRegistration = setupBrowserSupport({ existingSubscription: null });
      mockRegistration.pushManager.subscribe.mockResolvedValue(mockSubscription);

      render(<PushNotificationToggle />);

      await waitFor(() => {
        expect(screen.getByText('Ativar notificações push')).toBeInTheDocument();
      });

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ publicKey: 'test-vapid-key' }) })
        .mockResolvedValueOnce({ ok: false });

      await act(async () => {
        fireEvent.click(screen.getByText('Ativar notificações push'));
      });

      await waitFor(() => {
        expect(mockSubscription.unsubscribe).toHaveBeenCalled();
      });

      expect(screen.getByText('Ativar notificações push')).toBeInTheDocument();
    });
  });

  // ==================== Unsubscribe flow ====================

  describe('unsubscribe flow', () => {
    it('should unsubscribe and show subscribe button on success', async () => {
      const subscription = buildMockSubscription();
      setupBrowserSupport({ existingSubscription: subscription });

      render(<PushNotificationToggle />);

      await waitFor(() => {
        expect(screen.getByText('Desativar notificações push')).toBeInTheDocument();
      });

      mockFetch.mockResolvedValueOnce({ ok: true });

      await act(async () => {
        fireEvent.click(screen.getByText('Desativar notificações push'));
      });

      await waitFor(() => {
        expect(screen.getByText('Ativar notificações push')).toBeInTheDocument();
      });

      expect(subscription.unsubscribe).toHaveBeenCalled();
    });

    it('should not unsubscribe locally when server POST fails', async () => {
      const subscription = buildMockSubscription();
      setupBrowserSupport({ existingSubscription: subscription });

      render(<PushNotificationToggle />);

      await waitFor(() => {
        expect(screen.getByText('Desativar notificações push')).toBeInTheDocument();
      });

      mockFetch.mockResolvedValueOnce({ ok: false });

      await act(async () => {
        fireEvent.click(screen.getByText('Desativar notificações push'));
      });

      await waitFor(() => {
        expect(subscription.unsubscribe).not.toHaveBeenCalled();
      });

      expect(screen.getByText('Desativar notificações push')).toBeInTheDocument();
    });
  });
});
