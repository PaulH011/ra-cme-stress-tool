/**
 * Hook for real-time macro preview calculations
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useInputStore } from '@/stores/inputStore';
import { calculateMacroPreview } from '@/lib/api';
import { DEFAULT_INPUTS, BUILDING_BLOCK_KEYS } from '@/lib/constants';
import type { MacroRegion, MacroPreviewResponse } from '@/lib/types';

interface MacroPreviewState {
  computed: MacroPreviewResponse | null;
  isLoading: boolean;
  error: string | null;
  hasChanges: boolean;
  conflicts: {
    rgdp_growth: boolean;
    inflation_forecast: boolean;
    tbill_forecast: boolean;
  };
}

export function useMacroPreview(region: MacroRegion): MacroPreviewState {
  const [computed, setComputed] = useState<MacroPreviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const macroInputs = useInputStore((state) => state.macro[region]);
  const defaults = DEFAULT_INPUTS.macro[region];

  // Check if any building blocks have changed
  const hasChanges = useMemo(() => {
    return BUILDING_BLOCK_KEYS.some((key) => {
      const current = macroInputs[key];
      const defaultVal = defaults[key];
      return Math.abs(current - defaultVal) > 0.001;
    });
  }, [macroInputs, defaults]);

  // Calculate preview when building blocks change
  useEffect(() => {
    if (!hasChanges) {
      setComputed(null);
      return;
    }

    const fetchPreview = async () => {
      setIsLoading(true);
      try {
        // Convert from percentage to decimal for API
        const buildingBlocks = {
          population_growth: macroInputs.population_growth / 100,
          productivity_growth: macroInputs.productivity_growth / 100,
          my_ratio: macroInputs.my_ratio,
          current_headline_inflation: macroInputs.current_headline_inflation / 100,
          long_term_inflation: macroInputs.long_term_inflation / 100,
          current_tbill: macroInputs.current_tbill / 100,
          country_factor: macroInputs.country_factor / 100,
        };

        const result = await calculateMacroPreview(region, buildingBlocks);
        setComputed(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Preview calculation failed');
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce the API call
    const timeout = setTimeout(fetchPreview, 300);
    return () => clearTimeout(timeout);
  }, [region, macroInputs, hasChanges]);

  // Check for conflicts between computed values and direct overrides
  const conflicts = useMemo(() => {
    if (!computed || !hasChanges) {
      return {
        rgdp_growth: false,
        inflation_forecast: false,
        tbill_forecast: false,
      };
    }

    // Current direct override values (as decimals for comparison)
    const currentGdp = macroInputs.rgdp_growth / 100;
    const currentInflation = macroInputs.inflation_forecast / 100;
    const currentTbill = macroInputs.tbill_forecast / 100;

    // Default values (as decimals)
    const defaultGdp = defaults.rgdp_growth / 100;
    const defaultInflation = defaults.inflation_forecast / 100;
    const defaultTbill = defaults.tbill_forecast / 100;

    // Conflict exists if:
    // 1. Direct override differs from default (user set an override)
    // 2. Computed value differs from override
    const gdpOverridden = Math.abs(currentGdp - defaultGdp) > 0.0001;
    const inflationOverridden = Math.abs(currentInflation - defaultInflation) > 0.0001;
    const tbillOverridden = Math.abs(currentTbill - defaultTbill) > 0.0001;

    return {
      rgdp_growth: gdpOverridden && Math.abs(computed.rgdp_growth - currentGdp) > 0.0001,
      inflation_forecast: inflationOverridden && Math.abs(computed.inflation - currentInflation) > 0.0001,
      tbill_forecast: tbillOverridden && Math.abs(computed.tbill - currentTbill) > 0.0001,
    };
  }, [computed, hasChanges, macroInputs, defaults]);

  return {
    computed,
    isLoading,
    error,
    hasChanges,
    conflicts,
  };
}
