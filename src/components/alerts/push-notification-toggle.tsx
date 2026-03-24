'use client';

import { useState, useEffect, useTransition } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ==================== Types ====================

type PushState = 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed';

// ==================== Helpers ====================

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

async function fetchVapidPublicKey(): Promise<string | null> {
  try {
    const response = await fetch('/api/push/vapid-public-key');
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as { publicKey?: string };
    return data.publicKey ?? null;
  } catch {
    return null;
  }
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

async function getCurrentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

// ==================== Component ====================

export function PushNotificationToggle() {
  const [state, setState] = useState<PushState>('unsubscribed');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported');
      return;
    }

    if (Notification.permission === 'denied') {
      setState('denied');
      return;
    }

    getCurrentSubscription().then((sub) => {
      setState(sub ? 'subscribed' : 'unsubscribed');
    }).catch(() => {
      setState('unsubscribed');
    });
  }, []);

  function handleSubscribe() {
    startTransition(async () => {
      const vapidPublicKey = await fetchVapidPublicKey();

      if (!vapidPublicKey) {
        return;
      }

      const registration = await registerServiceWorker();

      if (!registration) {
        return;
      }

      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        setState('denied');
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
      });

      const keys = subscription.toJSON().keys;

      if (!keys?.p256dh || !keys?.auth) {
        await subscription.unsubscribe();
        return;
      }

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent: navigator.userAgent,
        }),
      });

      if (response.ok) {
        setState('subscribed');
      } else {
        await subscription.unsubscribe();
      }
    });
  }

  function handleUnsubscribe() {
    startTransition(async () => {
      const subscription = await getCurrentSubscription();

      if (!subscription) {
        setState('unsubscribed');
        return;
      }

      const response = await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });

      if (response.ok) {
        await subscription.unsubscribe();
        setState('unsubscribed');
      }
    });
  }

  if (state === 'unsupported') {
    return null;
  }

  if (state === 'denied') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <BellOff className="h-4 w-4" />
        <span>Notificações bloqueadas pelo navegador</span>
      </div>
    );
  }

  if (state === 'subscribed') {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleUnsubscribe}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <BellOff className="mr-2 h-4 w-4" />
        )}
        Desativar notificações push
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSubscribe}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Bell className="mr-2 h-4 w-4" />
      )}
      Ativar notificações push
    </Button>
  );
}
