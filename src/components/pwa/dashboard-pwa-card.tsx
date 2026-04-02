'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, Signal, SignalHigh, Smartphone, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DASHBOARD_OFFLINE_SNAPSHOT_STORAGE_KEY,
  serializeDashboardOfflineSnapshot,
  type DashboardOfflineSnapshot,
} from '@/lib/pwa/dashboard-offline-snapshot';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type ServiceWorkerStatus = 'checking' | 'ready' | 'unsupported' | 'error';
type SnapshotStatus = 'saved' | 'error';

interface DashboardPwaCardProps {
  snapshot: DashboardOfflineSnapshot;
}

interface StandaloneNavigator extends Navigator {
  standalone?: boolean;
}

function isStandaloneMode(): boolean {
  const matchesStandaloneDisplayMode =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;

  return (
    matchesStandaloneDisplayMode ||
    Boolean((navigator as StandaloneNavigator).standalone)
  );
}

function isIosDevice(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function formatSnapshotTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function DashboardPwaCard({ snapshot }: DashboardPwaCardProps) {
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState<ServiceWorkerStatus>('checking');
  const [snapshotStatus, setSnapshotStatus] = useState<SnapshotStatus>('saved');
  const [isOnline, setIsOnline] = useState(true);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  const supportsInstallPrompt = Boolean(installPromptEvent);
  const iosDevice = useMemo(() => isIosDevice(), []);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        DASHBOARD_OFFLINE_SNAPSHOT_STORAGE_KEY,
        serializeDashboardOfflineSnapshot(snapshot),
      );
      setSnapshotStatus('saved');
    } catch {
      setSnapshotStatus('error');
    }
  }, [snapshot]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      setServiceWorkerStatus('unsupported');
      return;
    }

    let isActive = true;

    navigator.serviceWorker.register('/sw.js').then(
      () => {
        if (isActive) {
          setServiceWorkerStatus('ready');
        }
      },
      () => {
        if (isActive) {
          setServiceWorkerStatus('error');
        }
      },
    );

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    setIsInstalled(isStandaloneMode());

    if (typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleModeChange = (event: MediaQueryListEvent) => {
      setIsInstalled(event.matches || Boolean((navigator as StandaloneNavigator).standalone));
    };
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPromptEvent(null);
      setShowIosInstructions(false);
    };

    mediaQuery.addEventListener('change', handleModeChange);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener('change', handleModeChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  async function handleInstallClick() {
    if (!installPromptEvent) {
      return;
    }

    setIsInstalling(true);
    try {
      await installPromptEvent.prompt();
      const choice = await installPromptEvent.userChoice;

      setInstallPromptEvent(null);

      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
    } finally {
      setIsInstalling(false);
    }
  }

  const serviceWorkerLabel = {
    checking: 'Preparing offline access',
    ready: 'Offline access ready',
    unsupported: 'Offline access unavailable',
    error: 'Offline access error',
  } satisfies Record<ServiceWorkerStatus, string>;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Offline dashboard</CardTitle>
            <CardDescription>
              Save the latest dashboard snapshot on this device and install MilesControl for
              faster mobile access.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isOnline ? 'secondary' : 'destructive'}>
              {isOnline ? (
                <>
                  <SignalHigh className="h-3 w-3" />
                  Online
                </>
              ) : (
                <>
                  <Signal className="h-3 w-3" />
                  Offline
                </>
              )}
            </Badge>
            <Badge variant={serviceWorkerStatus === 'ready' ? 'secondary' : 'outline'}>
              {serviceWorkerStatus === 'error' && <TriangleAlert className="h-3 w-3" />}
              {serviceWorkerStatus === 'ready' && <CheckCircle2 className="h-3 w-3" />}
              {serviceWorkerLabel[serviceWorkerStatus]}
            </Badge>
            {isInstalled && <Badge>Installed</Badge>}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-1 text-sm">
          <p>
            {snapshotStatus === 'saved'
              ? `Last snapshot saved at ${formatSnapshotTime(snapshot.capturedAt)}.`
              : 'MilesControl could not save a fresh dashboard snapshot on this device.'}
          </p>
          <p className="text-muted-foreground">
            If you lose your connection, MilesControl will show a cached dashboard summary with
            your balances, subscriptions, transfers, and projections.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {supportsInstallPrompt && !isInstalled && (
            <Button onClick={handleInstallClick} disabled={isInstalling}>
              <Download className="mr-2 h-4 w-4" />
              {isInstalling ? 'Installing...' : 'Install app'}
            </Button>
          )}

          {iosDevice && !isInstalled && !supportsInstallPrompt && (
            <Button
              variant="outline"
              onClick={() => setShowIosInstructions((currentValue) => !currentValue)}
            >
              <Smartphone className="mr-2 h-4 w-4" />
              How to install on iPhone
            </Button>
          )}

          {!supportsInstallPrompt && !iosDevice && !isInstalled && (
            <p className="text-sm text-muted-foreground">
              Use your browser&apos;s install or add-to-home-screen menu when it becomes available.
            </p>
          )}
        </div>

        {showIosInstructions && (
          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <p className="font-medium">Install MilesControl on iPhone</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>Open MilesControl in Safari.</li>
              <li>Tap the Share button.</li>
              <li>Choose "Add to Home Screen" to launch the app full screen later.</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
