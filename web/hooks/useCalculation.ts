/**
 * Hook for managing CME calculations
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useInputStore } from '@/stores/inputStore';
import { calculateFull } from '@/lib/api';
import type { CalculateResponse } from '@/lib/types';

interface UseCalculationResult {
  results: CalculateResponse | null;
  baseResults: CalculateResponse | null;
  isLoading: boolean;
  error: string | null;
  calculate: () => Promise<void>;
}

export function useCalculation(): UseCalculationResult {
  const [results, setResults] = useState<CalculateResponse | null>(null);
  const [baseResults, setBaseResults] = useState<CalculateResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { getOverrides, baseCurrency } = useInputStore();

  const calculate = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const overrides = getOverrides();

      // Calculate current scenario and base case in parallel
      const [currentResults, defaultResults] = await Promise.all([
        calculateFull(overrides, baseCurrency, 'Current Scenario'),
        calculateFull(undefined, baseCurrency, 'RA Defaults'),
      ]);

      setResults(currentResults);
      setBaseResults(defaultResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed');
    } finally {
      setIsLoading(false);
    }
  }, [getOverrides, baseCurrency]);

  // Auto-calculate on mount and when currency changes
  useEffect(() => {
    calculate();
  }, [baseCurrency]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    results,
    baseResults,
    isLoading,
    error,
    calculate,
  };
}
