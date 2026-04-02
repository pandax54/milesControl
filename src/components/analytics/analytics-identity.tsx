'use client';

import { useEffect, useRef } from 'react';
import { identifyAnalyticsUser } from '@/lib/analytics/client';

interface AnalyticsIdentityProps {
  readonly userId: string;
  readonly email: string;
  readonly role: string;
  readonly name?: string | null;
}

export function AnalyticsIdentity({
  userId,
  email,
  role,
  name,
}: AnalyticsIdentityProps) {
  const lastIdentifiedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastIdentifiedUserIdRef.current === userId) {
      return;
    }

    identifyAnalyticsUser({
      id: userId,
      email,
      role,
      ...(name ? { name } : {}),
    });
    lastIdentifiedUserIdRef.current = userId;
  }, [email, name, role, userId]);

  return null;
}
