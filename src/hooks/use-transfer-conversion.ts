'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  getTransferConversionData,
  type TransferConversionData,
  type TransferConversionPromotion,
} from '@/actions/transfers';

type NetValueType = 'positive' | 'negative' | 'neutral';

interface DerivedConversionValues {
  sourceBrl: number | null;
  destBrl: number | null;
  netValue: number | null;
  netValueType: NetValueType | null;
}

export interface TransferConversionResult extends DerivedConversionValues {
  sourceCpm: number | null;
  destCpm: number | null;
  activePromotion: TransferConversionPromotion | null;
  isLoading: boolean;
  error: Error | null;
}

const DEBOUNCE_DELAY_MS = 300;
const NET_VALUE_THRESHOLD_PERCENT = 5;
const EMPTY_DERIVED_VALUES: DerivedConversionValues = {
  sourceBrl: null,
  destBrl: null,
  netValue: null,
  netValueType: null,
};

function calculateBrlValue(miles: number, cpm: number | null): number | null {
  if (cpm === null) {
    return null;
  }

  return (miles * cpm) / 1000;
}

function calculateNetValue(
  sourceBrl: number | null,
  destBrl: number | null,
): Pick<DerivedConversionValues, 'netValue' | 'netValueType'> {
  if (sourceBrl === null || destBrl === null) {
    return {
      netValue: null,
      netValueType: null,
    };
  }

  const netValue = destBrl - sourceBrl;

  if (sourceBrl === 0) {
    return {
      netValue,
      netValueType: 'neutral',
    };
  }

  const netValuePercentage = (netValue / sourceBrl) * 100;

  if (netValuePercentage > NET_VALUE_THRESHOLD_PERCENT) {
    return {
      netValue,
      netValueType: 'positive',
    };
  }

  if (netValuePercentage < -NET_VALUE_THRESHOLD_PERCENT) {
    return {
      netValue,
      netValueType: 'negative',
    };
  }

  return {
    netValue,
    netValueType: 'neutral',
  };
}

/**
 * Fetches CPM data for the selected transfer route and derives debounced BRL values.
 *
 * The hook uses React Query to cache CPM and promotion lookups per source/destination
 * program pair while keeping the 300ms debounce required for local BRL recalculation
 * as the user edits transfer amounts.
 *
 * @param sourceProgramName - Selected source program name.
 * @param destProgramName - Selected destination program name.
 * @param pointsTransferred - Source points entered in the form.
 * @param milesReceived - Destination miles expected after bonus.
 * @returns Conversion data with BRL amounts, net value classification, loading state,
 * and the latest query error when the lookup fails.
 */
export function useTransferConversion(
  sourceProgramName: string,
  destProgramName: string,
  pointsTransferred: number,
  milesReceived: number,
): TransferConversionResult {
  const [derivedValues, setDerivedValues] = useState<DerivedConversionValues>(EMPTY_DERIVED_VALUES);
  const trimmedSourceProgramName = sourceProgramName.trim();
  const trimmedDestProgramName = destProgramName.trim();
  const shouldFetch = trimmedSourceProgramName.length > 0 && trimmedDestProgramName.length > 0;

  const queryKey = useMemo(
    () => ['transfer-conversion', trimmedSourceProgramName, trimmedDestProgramName] as const,
    [trimmedDestProgramName, trimmedSourceProgramName],
  );
  const {
    data: conversionData,
    error,
    isFetching,
  } = useQuery<TransferConversionData, Error>({
    queryKey,
    queryFn: async () =>
      getTransferConversionData({
        sourceProgramName: trimmedSourceProgramName,
        destProgramName: trimmedDestProgramName,
      }),
    enabled: shouldFetch,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  });
  const hasConversionData = conversionData !== undefined;
  const sourceCpm = conversionData?.sourceCpm ?? null;
  const destCpm = conversionData?.destCpm ?? null;
  const activePromotion = conversionData?.activePromotion ?? null;

  useEffect(() => {
    if (!shouldFetch || !hasConversionData) {
      setDerivedValues(EMPTY_DERIVED_VALUES);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const sourceBrl = calculateBrlValue(pointsTransferred, sourceCpm);
      const destBrl = calculateBrlValue(milesReceived, destCpm);

      setDerivedValues({
        sourceBrl,
        destBrl,
        ...calculateNetValue(sourceBrl, destBrl),
      });
    }, DEBOUNCE_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    destCpm,
    hasConversionData,
    milesReceived,
    pointsTransferred,
    sourceCpm,
    shouldFetch,
  ]);

  return useMemo(
    () => ({
      sourceBrl: derivedValues.sourceBrl,
      destBrl: derivedValues.destBrl,
      netValue: derivedValues.netValue,
      netValueType: derivedValues.netValueType,
      sourceCpm,
      destCpm,
      activePromotion,
      isLoading: shouldFetch && isFetching,
      error: shouldFetch ? error ?? null : null,
    }),
    [
      activePromotion,
      destCpm,
      derivedValues.destBrl,
      derivedValues.netValue,
      derivedValues.netValueType,
      derivedValues.sourceBrl,
      error,
      isFetching,
      sourceCpm,
      shouldFetch,
    ],
  );
}
