'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
}

const DEBOUNCE_DELAY_MS = 300;
const NET_VALUE_THRESHOLD_PERCENT = 5;
const EMPTY_TRANSFER_CONVERSION_DATA: TransferConversionData = {
  sourceCpm: null,
  destCpm: null,
  activePromotion: null,
};
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

export function useTransferConversion(
  sourceProgramName: string,
  destProgramName: string,
  pointsTransferred: number,
  milesReceived: number,
): TransferConversionResult {
  const [conversionData, setConversionData] = useState<TransferConversionData>(EMPTY_TRANSFER_CONVERSION_DATA);
  const [derivedValues, setDerivedValues] = useState<DerivedConversionValues>(EMPTY_DERIVED_VALUES);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmedSourceProgramName = sourceProgramName.trim();
    const trimmedDestProgramName = destProgramName.trim();

    requestIdRef.current += 1;
    const requestId = requestIdRef.current;

    if (!trimmedSourceProgramName || !trimmedDestProgramName) {
      setConversionData(EMPTY_TRANSFER_CONVERSION_DATA);
      setDerivedValues(EMPTY_DERIVED_VALUES);
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    setConversionData(EMPTY_TRANSFER_CONVERSION_DATA);
    setDerivedValues(EMPTY_DERIVED_VALUES);
    setIsLoading(true);

    void getTransferConversionData({
      sourceProgramName: trimmedSourceProgramName,
      destProgramName: trimmedDestProgramName,
    })
      .then((data) => {
        if (isCancelled || requestIdRef.current !== requestId) {
          return;
        }

        setConversionData(data);
        setIsLoading(false);
      })
      .catch(() => {
        if (isCancelled || requestIdRef.current !== requestId) {
          return;
        }

        setConversionData(EMPTY_TRANSFER_CONVERSION_DATA);
        setDerivedValues(EMPTY_DERIVED_VALUES);
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [destProgramName, sourceProgramName]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const sourceBrl = calculateBrlValue(pointsTransferred, conversionData.sourceCpm);
      const destBrl = calculateBrlValue(milesReceived, conversionData.destCpm);

      setDerivedValues({
        sourceBrl,
        destBrl,
        ...calculateNetValue(sourceBrl, destBrl),
      });
    }, DEBOUNCE_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [conversionData.destCpm, conversionData.sourceCpm, milesReceived, pointsTransferred]);

  return useMemo(
    () => ({
      sourceBrl: derivedValues.sourceBrl,
      destBrl: derivedValues.destBrl,
      netValue: derivedValues.netValue,
      netValueType: derivedValues.netValueType,
      sourceCpm: conversionData.sourceCpm,
      destCpm: conversionData.destCpm,
      activePromotion: conversionData.activePromotion,
      isLoading,
    }),
    [conversionData.activePromotion, conversionData.destCpm, conversionData.sourceCpm, derivedValues.destBrl, derivedValues.netValue, derivedValues.netValueType, derivedValues.sourceBrl, isLoading],
  );
}
