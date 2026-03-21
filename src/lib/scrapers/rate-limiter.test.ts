import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { enforceRateLimit, clearRateLimitState } from './rate-limiter';

describe('enforceRateLimit', () => {
  beforeEach(() => {
    clearRateLimitState();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not delay the first request for a key', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    await enforceRateLimit('source-a', 2000);

    // setTimeout should not have been called with a delay for sleeping
    const sleepCalls = setTimeoutSpy.mock.calls.filter(
      ([, delay]) => typeof delay === 'number' && delay > 0,
    );
    expect(sleepCalls).toHaveLength(0);

    setTimeoutSpy.mockRestore();
  });

  it('should delay when requests are too close together', async () => {
    await enforceRateLimit('source-a', 2000);

    // Advance only 500ms (less than 2000ms delay)
    vi.advanceTimersByTime(500);

    const promise = enforceRateLimit('source-a', 2000);

    // The rate limiter should have scheduled a sleep for the remaining time
    vi.advanceTimersByTime(1500);

    await promise;
  });

  it('should not delay when enough time has passed', async () => {
    await enforceRateLimit('source-a', 2000);

    // Advance past the delay
    vi.advanceTimersByTime(3000);

    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    await enforceRateLimit('source-a', 2000);

    const sleepCalls = setTimeoutSpy.mock.calls.filter(
      ([, delay]) => typeof delay === 'number' && delay > 0,
    );
    expect(sleepCalls).toHaveLength(0);

    setTimeoutSpy.mockRestore();
  });

  it('should track different keys independently', async () => {
    await enforceRateLimit('source-a', 2000);

    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    // Different key should not be delayed
    await enforceRateLimit('source-b', 2000);

    const sleepCalls = setTimeoutSpy.mock.calls.filter(
      ([, delay]) => typeof delay === 'number' && delay > 0,
    );
    expect(sleepCalls).toHaveLength(0);

    setTimeoutSpy.mockRestore();
  });

  it('should clear all tracked state', async () => {
    await enforceRateLimit('source-a', 2000);

    clearRateLimitState();

    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    // After clearing, the same key should not be delayed
    await enforceRateLimit('source-a', 2000);

    const sleepCalls = setTimeoutSpy.mock.calls.filter(
      ([, delay]) => typeof delay === 'number' && delay > 0,
    );
    expect(sleepCalls).toHaveLength(0);

    setTimeoutSpy.mockRestore();
  });
});
