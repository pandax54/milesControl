import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getTransferConversionData, type TransferConversionData } from '@/actions/transfers';
import { useTransferConversion } from './use-transfer-conversion';

vi.mock('@/actions/transfers', () => ({
  getTransferConversionData: vi.fn(),
}));

const DEFAULT_CONVERSION_DATA: TransferConversionData = {
  sourceCpm: null,
  destCpm: null,
  activePromotion: null,
};

function buildConversionData(
  overrides: Partial<TransferConversionData> = {},
): TransferConversionData {
  return {
    ...DEFAULT_CONVERSION_DATA,
    ...overrides,
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return {
    promise,
    resolve,
    reject,
  };
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function flushQueryUpdates() {
  await flushPromises();
  act(() => {
    vi.advanceTimersByTime(0);
  });
  await flushPromises();
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useTransferConversion', () => {
  const mockGetTransferConversionData = vi.mocked(getTransferConversionData);
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.useFakeTimers();
    mockGetTransferConversionData.mockReset();
    queryClient = createQueryClient();
  });

  afterEach(() => {
    queryClient.clear();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('should calculate BRL values after the debounce interval and return active promotion data', async () => {
    mockGetTransferConversionData.mockResolvedValue(buildConversionData({
      sourceCpm: 15,
      destCpm: 12,
      activePromotion: {
        id: 'promotion-1',
        bonusPercent: 100,
        title: 'Best Smiles bonus',
      },
    }));

    const { result } = renderHook(
      () => useTransferConversion(' Livelo ', ' Smiles ', 10000, 19000),
      { wrapper: createWrapper(queryClient) },
    );

    expect(mockGetTransferConversionData).toHaveBeenCalledWith({
      sourceProgramName: 'Livelo',
      destProgramName: 'Smiles',
    });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.sourceBrl).toBeNull();
    expect(result.current.destBrl).toBeNull();

    await flushQueryUpdates();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.sourceCpm).toBe(15);
    expect(result.current.destCpm).toBe(12);
    expect(result.current.activePromotion).toEqual({
      id: 'promotion-1',
      bonusPercent: 100,
      title: 'Best Smiles bonus',
    });
    expect(result.current.sourceBrl).toBeNull();
    expect(result.current.destBrl).toBeNull();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.sourceBrl).toBe(150);
    expect(result.current.destBrl).toBe(228);
    expect(result.current.netValue).toBe(78);
    expect(result.current.netValueType).toBe('positive');
  });

  it('should return a null source BRL value and null net value when source CPM is unavailable', async () => {
    mockGetTransferConversionData.mockResolvedValue(buildConversionData({
      sourceCpm: null,
      destCpm: 12,
    }));

    const { result } = renderHook(
      () => useTransferConversion('Livelo', 'Smiles', 10000, 19000),
      { wrapper: createWrapper(queryClient) },
    );

    await flushQueryUpdates();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.sourceBrl).toBeNull();
    expect(result.current.destBrl).toBe(228);
    expect(result.current.netValue).toBeNull();
    expect(result.current.netValueType).toBeNull();
  });

  it('should return a null destination BRL value and null net value when destination CPM is unavailable', async () => {
    mockGetTransferConversionData.mockResolvedValue(buildConversionData({
      sourceCpm: 15,
      destCpm: null,
    }));

    const { result } = renderHook(
      () => useTransferConversion('Livelo', 'Smiles', 10000, 19000),
      { wrapper: createWrapper(queryClient) },
    );

    await flushQueryUpdates();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.sourceBrl).toBe(150);
    expect(result.current.destBrl).toBeNull();
    expect(result.current.netValue).toBeNull();
    expect(result.current.netValueType).toBeNull();
  });

  it('should classify negative net values correctly', async () => {
    mockGetTransferConversionData.mockResolvedValue(buildConversionData({
      sourceCpm: 15,
      destCpm: 10,
    }));

    const { result } = renderHook(
      () => useTransferConversion('Livelo', 'Smiles', 10000, 10000),
      { wrapper: createWrapper(queryClient) },
    );

    await flushQueryUpdates();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.netValue).toBe(-50);
    expect(result.current.netValueType).toBe('negative');
  });

  it('should classify neutral net values correctly within the threshold', async () => {
    mockGetTransferConversionData.mockResolvedValue(buildConversionData({
      sourceCpm: 15,
      destCpm: 15.4,
    }));

    const { result } = renderHook(
      () => useTransferConversion('Livelo', 'Smiles', 10000, 10000),
      { wrapper: createWrapper(queryClient) },
    );

    await flushQueryUpdates();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.netValue).toBe(4);
    expect(result.current.netValueType).toBe('neutral');
  });

  it('should debounce recalculation and avoid re-fetching when only the miles inputs change', async () => {
    mockGetTransferConversionData.mockResolvedValue(buildConversionData({
      sourceCpm: 15,
      destCpm: 12,
    }));

    const { result, rerender } = renderHook(
      ({
        sourceProgramName,
        destProgramName,
        pointsTransferred,
        milesReceived,
      }: {
        sourceProgramName: string;
        destProgramName: string;
        pointsTransferred: number;
        milesReceived: number;
      }) => useTransferConversion(sourceProgramName, destProgramName, pointsTransferred, milesReceived),
      {
        wrapper: createWrapper(queryClient),
        initialProps: {
          sourceProgramName: 'Livelo',
          destProgramName: 'Smiles',
          pointsTransferred: 10000,
          milesReceived: 19000,
        },
      },
    );

    await flushQueryUpdates();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.sourceBrl).toBe(150);
    expect(result.current.destBrl).toBe(228);
    expect(mockGetTransferConversionData).toHaveBeenCalledTimes(1);

    rerender({
      sourceProgramName: 'Livelo',
      destProgramName: 'Smiles',
      pointsTransferred: 20000,
      milesReceived: 38000,
    });

    expect(mockGetTransferConversionData).toHaveBeenCalledTimes(1);
    expect(result.current.sourceBrl).toBe(150);
    expect(result.current.destBrl).toBe(228);

    act(() => {
      vi.advanceTimersByTime(299);
    });

    expect(result.current.sourceBrl).toBe(150);
    expect(result.current.destBrl).toBe(228);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(result.current.sourceBrl).toBe(300);
    expect(result.current.destBrl).toBe(456);
  });

  it('should fetch conversion data again when program names change', async () => {
    mockGetTransferConversionData
      .mockResolvedValueOnce(buildConversionData({
        sourceCpm: 15,
        destCpm: 12,
      }))
      .mockResolvedValueOnce(buildConversionData({
        sourceCpm: 10,
        destCpm: 18,
      }));

    const { result, rerender } = renderHook(
      ({
        sourceProgramName,
        destProgramName,
      }: {
        sourceProgramName: string;
        destProgramName: string;
      }) => useTransferConversion(sourceProgramName, destProgramName, 10000, 15000),
      {
        wrapper: createWrapper(queryClient),
        initialProps: {
          sourceProgramName: 'Livelo',
          destProgramName: 'Smiles',
        },
      },
    );

    await flushQueryUpdates();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.sourceCpm).toBe(15);
    expect(result.current.destCpm).toBe(12);

    rerender({
      sourceProgramName: 'Livelo',
      destProgramName: 'Azul',
    });

    expect(mockGetTransferConversionData).toHaveBeenNthCalledWith(2, {
      sourceProgramName: 'Livelo',
      destProgramName: 'Azul',
    });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.sourceBrl).toBeNull();
    expect(result.current.destBrl).toBeNull();

    await flushQueryUpdates();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.sourceCpm).toBe(10);
    expect(result.current.destCpm).toBe(18);
  });

  it('should expose loading state while the server action is in flight', async () => {
    const deferred = createDeferred<TransferConversionData>();
    mockGetTransferConversionData.mockImplementation(() => deferred.promise);

    const { result } = renderHook(
      () => useTransferConversion('Livelo', 'Smiles', 10000, 19000),
      { wrapper: createWrapper(queryClient) },
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.sourceCpm).toBeNull();
    expect(result.current.destCpm).toBeNull();
    expect(result.current.error).toBeNull();

    await act(async () => {
      deferred.resolve(buildConversionData({
        sourceCpm: 15,
        destCpm: 12,
      }));
      await Promise.resolve();
    });
    await flushQueryUpdates();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.sourceCpm).toBe(15);
    expect(result.current.destCpm).toBe(12);
  });

  it('should handle server action failures gracefully', async () => {
    const fetchError = new Error('Failed to fetch conversion data');
    mockGetTransferConversionData.mockRejectedValue(fetchError);

    const { result } = renderHook(
      () => useTransferConversion('Livelo', 'Smiles', 10000, 19000),
      { wrapper: createWrapper(queryClient) },
    );

    await flushPromises();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.sourceCpm).toBeNull();
    expect(result.current.destCpm).toBeNull();
    expect(result.current.activePromotion).toBeNull();
    expect(result.current.sourceBrl).toBeNull();
    expect(result.current.destBrl).toBeNull();
    expect(result.current.netValue).toBeNull();
    expect(result.current.netValueType).toBeNull();
    expect(result.current.error).toBe(fetchError);
  });

  it('should discard stale responses when programs change rapidly', async () => {
    const firstRequest = createDeferred<TransferConversionData>();
    const secondRequest = createDeferred<TransferConversionData>();

    mockGetTransferConversionData
      .mockImplementationOnce(() => firstRequest.promise)
      .mockImplementationOnce(() => secondRequest.promise);

    const { result, rerender } = renderHook(
      ({
        sourceProgramName,
        destProgramName,
      }: {
        sourceProgramName: string;
        destProgramName: string;
      }) => useTransferConversion(sourceProgramName, destProgramName, 10000, 12000),
      {
        wrapper: createWrapper(queryClient),
        initialProps: {
          sourceProgramName: 'Livelo',
          destProgramName: 'Smiles',
        },
      },
    );

    rerender({
      sourceProgramName: 'Livelo',
      destProgramName: 'Azul',
    });

    await act(async () => {
      secondRequest.resolve(buildConversionData({
        sourceCpm: 8,
        destCpm: 16,
        activePromotion: {
          id: 'promotion-2',
          bonusPercent: 60,
          title: 'Azul bonus',
        },
      }));
      await Promise.resolve();
    });
    await flushQueryUpdates();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.sourceCpm).toBe(8);
    expect(result.current.destCpm).toBe(16);
    expect(result.current.activePromotion).toEqual({
      id: 'promotion-2',
      bonusPercent: 60,
      title: 'Azul bonus',
    });
    expect(result.current.sourceBrl).toBe(80);
    expect(result.current.destBrl).toBe(192);

    await act(async () => {
      firstRequest.resolve(buildConversionData({
        sourceCpm: 30,
        destCpm: 5,
      }));
      await Promise.resolve();
    });

    expect(result.current.sourceCpm).toBe(8);
    expect(result.current.destCpm).toBe(16);
    expect(result.current.sourceBrl).toBe(80);
    expect(result.current.destBrl).toBe(192);
  });
});
