import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    disabled,
    onClick,
    variant,
  }: React.PropsWithChildren<{
    disabled?: boolean;
    onClick?: () => void;
    variant?: string;
  }>) => (
    <button data-variant={variant} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: React.PropsWithChildren) => <section>{children}</section>,
  CardHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CardTitle: ({ children }: React.PropsWithChildren) => <h2>{children}</h2>,
  CardDescription: ({ children }: React.PropsWithChildren) => <p>{children}</p>,
  CardContent: ({ children }: React.PropsWithChildren<{ className?: string }>) => <div>{children}</div>,
}));

vi.mock('lucide-react', () => ({
  CheckCircle2: () => <span data-testid="check-icon" />,
  Download: () => <span data-testid="download-icon" />,
  Signal: () => <span data-testid="signal-icon" />,
  SignalHigh: () => <span data-testid="signal-high-icon" />,
  Smartphone: () => <span data-testid="smartphone-icon" />,
  TriangleAlert: () => <span data-testid="alert-icon" />,
}));

import { DashboardPwaCard } from './dashboard-pwa-card';
import {
  DASHBOARD_OFFLINE_SNAPSHOT_STORAGE_KEY,
  createDashboardOfflineSnapshot,
  serializeDashboardOfflineSnapshot,
} from '@/lib/pwa/dashboard-offline-snapshot';

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

function createSnapshot() {
  return createDashboardOfflineSnapshot(
    {
      totalMiles: 15000,
      totalPoints: 8000,
      activeSubscriptionCount: 1,
      staleEnrollmentCount: 0,
      projection: {
        months: [],
        totalProjectedMiles: 6000,
        balanceAt3Months: 21000,
        balanceAt6Months: 27000,
        balanceAt12Months: 39000,
      },
      enrollments: [],
      activeSubscriptions: [],
      recentTransfers: [],
    },
    new Date('2026-03-27T00:00:00.000Z'),
  );
}

describe('DashboardPwaCard', () => {
  beforeEach(() => {
    localStorage.clear();

    defineTestProperty(navigator as unknown as Record<string, unknown>, 'serviceWorker', {
      value: {
        register: vi.fn().mockResolvedValue({}),
      },
    });

    defineTestProperty(navigator as unknown as Record<string, unknown>, 'onLine', {
      value: true,
      writable: true,
    });

    defineTestProperty(navigator as unknown as Record<string, unknown>, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15',
      writable: true,
    });

    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      media: '(display-mode: standalone)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));
  });

  afterEach(() => {
    restoreProperties();
    vi.restoreAllMocks();
  });

  it('should save the dashboard snapshot and register the service worker', async () => {
    const snapshot = createSnapshot();
    const register = vi.mocked(navigator.serviceWorker.register);

    render(<DashboardPwaCard snapshot={snapshot} />);

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith('/sw.js');
      expect(localStorage.getItem(DASHBOARD_OFFLINE_SNAPSHOT_STORAGE_KEY)).toBe(
        serializeDashboardOfflineSnapshot(snapshot),
      );
    });
  });

  it('should prompt installation when the browser exposes beforeinstallprompt', async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    const snapshot = createSnapshot();

    render(<DashboardPwaCard snapshot={snapshot} />);

    const installEvent = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted'; platform: string }>;
    };
    Object.assign(installEvent, {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted' as const, platform: 'web' }),
    });

    await act(async () => {
      window.dispatchEvent(installEvent);
    });

    fireEvent.click(screen.getByRole('button', { name: /Install app/i }));

    await waitFor(() => {
      expect(prompt).toHaveBeenCalled();
      expect(screen.getByText('Installed')).toBeInTheDocument();
    });
  });

  it('should show iPhone installation instructions when running on iOS Safari', async () => {
    defineTestProperty(navigator as unknown as Record<string, unknown>, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile/15E148 Safari/604.1',
      writable: true,
    });

    render(<DashboardPwaCard snapshot={createSnapshot()} />);

    fireEvent.click(screen.getByRole('button', { name: /How to install on iPhone/i }));

    await waitFor(() => {
      expect(screen.getByText('Install MilesControl on iPhone')).toBeInTheDocument();
      expect(screen.getByText('Choose "Add to Home Screen" to launch the app full screen later.')).toBeInTheDocument();
    });
  });
});
