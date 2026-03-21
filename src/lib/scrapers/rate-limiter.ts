const lastRequestTime = new Map<string, number>();

/**
 * Enforces a minimum delay between consecutive requests for the same key.
 * Uses wall-clock time to determine elapsed duration since last request.
 */
export async function enforceRateLimit(key: string, delayMs: number): Promise<void> {
  const lastTime = lastRequestTime.get(key);

  if (lastTime) {
    const elapsed = Date.now() - lastTime;
    if (elapsed < delayMs) {
      await sleep(delayMs - elapsed);
    }
  }

  lastRequestTime.set(key, Date.now());
}

export function clearRateLimitState(): void {
  lastRequestTime.clear();
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
