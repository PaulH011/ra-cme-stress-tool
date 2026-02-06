/**
 * Zustand store for managing input state
 */

import { create } from 'zustand';
import { DEFAULT_INPUTS, DIRECT_FORECAST_KEYS } from '@/lib/constants';
import type {
  MacroInputs,
  MacroRegion,
  BondInputs,
  BondType,
  EquityInputs,
  EquityRegion,
  AbsoluteReturnInputs,
  BaseCurrency,
  Overrides,
} from '@/lib/types';

interface InputState {
  // Current input values
  macro: Record<MacroRegion, MacroInputs>;
  bonds: Record<BondType, BondInputs>;
  equity: Record<EquityRegion, EquityInputs>;
  absoluteReturn: AbsoluteReturnInputs;
  baseCurrency: BaseCurrency;

  // UI state
  advancedMode: boolean;

  // Track which direct forecast fields the user has explicitly set
  // Key format: "region.field" e.g. "us.tbill_forecast"
  _dirtyMacroFields: Record<string, boolean>;

  // Actions
  setMacroValue: (region: MacroRegion, key: keyof MacroInputs, value: number) => void;
  syncMacroComputed: (region: MacroRegion, computedValues: Partial<Record<string, number>>) => void;
  isMacroDirty: (region: MacroRegion, key: keyof MacroInputs) => boolean;
  setBondValue: (type: BondType, key: keyof BondInputs, value: number) => void;
  setEquityValue: (region: EquityRegion, key: keyof EquityInputs, value: number) => void;
  setAbsoluteReturnValue: (key: keyof AbsoluteReturnInputs, value: number) => void;
  setBaseCurrency: (currency: BaseCurrency) => void;
  setAdvancedMode: (enabled: boolean) => void;
  resetToDefaults: () => void;
  loadScenario: (overrides: Overrides) => void;
  getOverrides: () => Overrides;
}

/**
 * Check if a value differs from its default
 */
function isDifferent(value: number, defaultValue: number, tolerance = 0.001): boolean {
  return Math.abs(value - defaultValue) > tolerance;
}

export const useInputStore = create<InputState>((set, get) => ({
  // Initialize with defaults
  macro: { ...DEFAULT_INPUTS.macro },
  bonds: { ...DEFAULT_INPUTS.bonds },
  equity: { ...DEFAULT_INPUTS.equity },
  absoluteReturn: { ...DEFAULT_INPUTS.absolute_return },
  baseCurrency: 'usd',
  advancedMode: false,
  _dirtyMacroFields: {},

  setMacroValue: (region, key, value) => {
    const isDirect = (DIRECT_FORECAST_KEYS as readonly string[]).includes(key as string);
    set((state) => ({
      macro: {
        ...state.macro,
        [region]: {
          ...state.macro[region],
          [key]: value,
        },
      },
      // Mark direct forecast fields as dirty when user explicitly sets them
      ...(isDirect
        ? {
            _dirtyMacroFields: {
              ...state._dirtyMacroFields,
              [`${region}.${key}`]: true,
            },
          }
        : {}),
    }));
  },

  syncMacroComputed: (region, computedValues) =>
    set((state) => {
      const newRegionMacro = { ...state.macro[region] };
      let changed = false;

      for (const [key, value] of Object.entries(computedValues)) {
        // Only sync non-dirty direct forecast fields
        if (!state._dirtyMacroFields[`${region}.${key}`]) {
          const currentVal = newRegionMacro[key as keyof MacroInputs];
          if (typeof value === 'number' && Math.abs(currentVal - value) > 0.001) {
            (newRegionMacro as any)[key] = value;
            changed = true;
          }
        }
      }

      if (!changed) return state;

      return {
        macro: {
          ...state.macro,
          [region]: newRegionMacro,
        },
      };
    }),

  isMacroDirty: (region, key) => {
    return !!get()._dirtyMacroFields[`${region}.${key}`];
  },

  setBondValue: (type, key, value) =>
    set((state) => ({
      bonds: {
        ...state.bonds,
        [type]: {
          ...state.bonds[type],
          [key]: value,
        },
      },
    })),

  setEquityValue: (region, key, value) =>
    set((state) => ({
      equity: {
        ...state.equity,
        [region]: {
          ...state.equity[region],
          [key]: value,
        },
      },
    })),

  setAbsoluteReturnValue: (key, value) =>
    set((state) => ({
      absoluteReturn: {
        ...state.absoluteReturn,
        [key]: value,
      },
    })),

  setBaseCurrency: (currency) => set({ baseCurrency: currency }),

  setAdvancedMode: (enabled) => set({ advancedMode: enabled }),

  resetToDefaults: () =>
    set({
      macro: { ...DEFAULT_INPUTS.macro },
      bonds: { ...DEFAULT_INPUTS.bonds },
      equity: { ...DEFAULT_INPUTS.equity },
      absoluteReturn: { ...DEFAULT_INPUTS.absolute_return },
      _dirtyMacroFields: {},
    }),

  loadScenario: (overrides) => {
    const state = get();
    const directKeys = DIRECT_FORECAST_KEYS as readonly string[];

    // Start with current state and apply overrides
    const newMacro = { ...state.macro };
    const newBonds = { ...state.bonds };
    const newEquity = { ...state.equity };
    let newAbsoluteReturn = { ...state.absoluteReturn };
    const newDirtyFields = { ...state._dirtyMacroFields };

    // Apply macro overrides
    if (overrides.macro) {
      for (const [region, values] of Object.entries(overrides.macro)) {
        if (values && region in newMacro) {
          newMacro[region as MacroRegion] = {
            ...newMacro[region as MacroRegion],
            ...values,
          };
          // Mark loaded direct forecast fields as dirty
          for (const key of Object.keys(values)) {
            if (directKeys.includes(key)) {
              newDirtyFields[`${region}.${key}`] = true;
            }
          }
        }
      }
    }

    // Apply bond overrides
    for (const type of ['global', 'hy', 'em'] as BondType[]) {
      const key = `bonds_${type}` as keyof Overrides;
      if (overrides[key]) {
        newBonds[type] = {
          ...newBonds[type],
          ...overrides[key],
        };
      }
    }

    // Apply equity overrides
    for (const region of ['us', 'europe', 'japan', 'em'] as EquityRegion[]) {
      const key = `equity_${region}` as keyof Overrides;
      if (overrides[key]) {
        newEquity[region] = {
          ...newEquity[region],
          ...overrides[key],
        };
      }
    }

    // Apply absolute return overrides
    if (overrides.absolute_return) {
      newAbsoluteReturn = {
        ...newAbsoluteReturn,
        ...overrides.absolute_return,
      };
    }

    set({
      macro: newMacro,
      bonds: newBonds,
      equity: newEquity,
      absoluteReturn: newAbsoluteReturn,
      _dirtyMacroFields: newDirtyFields,
    });
  },

  getOverrides: () => {
    const state = get();
    const overrides: Overrides = {};

    // Check macro differences
    const directKeys = DIRECT_FORECAST_KEYS as readonly string[];

    for (const region of ['us', 'eurozone', 'japan', 'em'] as MacroRegion[]) {
      const current = state.macro[region];
      const defaults = DEFAULT_INPUTS.macro[region];
      const regionOverrides: Partial<MacroInputs> = {};

      for (const [key, value] of Object.entries(current)) {
        const isDirect = directKeys.includes(key);

        if (isDirect) {
          // Direct forecast fields: only send if user explicitly set them
          const isDirty = state._dirtyMacroFields[`${region}.${key}`];
          if (isDirty) {
            // Always send dirty direct fields (even if value matches default,
            // user explicitly chose this value)
            if (key === 'my_ratio') {
              regionOverrides[key as keyof MacroInputs] = value as number;
            } else {
              regionOverrides[key as keyof MacroInputs] = (value as number) / 100;
            }
          }
        } else {
          // Building block fields: use difference-from-default logic
          const defaultValue = defaults[key as keyof MacroInputs];
          if (isDifferent(value as number, defaultValue as number)) {
            if (key === 'my_ratio') {
              regionOverrides[key as keyof MacroInputs] = value as number;
            } else {
              regionOverrides[key as keyof MacroInputs] = (value as number) / 100;
            }
          }
        }
      }

      if (Object.keys(regionOverrides).length > 0) {
        if (!overrides.macro) overrides.macro = {};
        overrides.macro[region] = regionOverrides;
      }
    }

    // Check bond differences
    for (const type of ['global', 'hy', 'em'] as BondType[]) {
      const current = state.bonds[type];
      const defaults = DEFAULT_INPUTS.bonds[type];
      const bondOverrides: Partial<BondInputs> = {};

      for (const [key, value] of Object.entries(current)) {
        if (value === undefined) continue;
        const defaultValue = defaults[key as keyof BondInputs];
        if (defaultValue !== undefined && isDifferent(value as number, defaultValue as number)) {
          // Duration stays as-is, others convert to decimal
          if (key === 'duration') {
            bondOverrides[key as keyof BondInputs] = value as number;
          } else {
            bondOverrides[key as keyof BondInputs] = (value as number) / 100;
          }
        }
      }

      if (Object.keys(bondOverrides).length > 0) {
        const overrideKey = `bonds_${type}` as keyof Overrides;
        (overrides as any)[overrideKey] = bondOverrides;
      }
    }

    // Check equity differences
    for (const region of ['us', 'europe', 'japan', 'em'] as EquityRegion[]) {
      const current = state.equity[region];
      const defaults = DEFAULT_INPUTS.equity[region];
      const equityOverrides: Partial<EquityInputs> = {};

      for (const [key, value] of Object.entries(current)) {
        const defaultValue = defaults[key as keyof EquityInputs];
        if (isDifferent(value as number, defaultValue as number)) {
          equityOverrides[key as keyof EquityInputs] = (value as number) / 100;
        }
      }

      if (Object.keys(equityOverrides).length > 0) {
        const overrideKey = `equity_${region}` as keyof Overrides;
        (overrides as any)[overrideKey] = equityOverrides;
      }
    }

    // Check absolute return differences
    const arOverrides: Partial<AbsoluteReturnInputs> = {};
    for (const [key, value] of Object.entries(state.absoluteReturn)) {
      const defaultValue = DEFAULT_INPUTS.absolute_return[key as keyof AbsoluteReturnInputs];
      if (isDifferent(value, defaultValue)) {
        if (key === 'trading_alpha') {
          arOverrides[key as keyof AbsoluteReturnInputs] = value / 100;
        } else {
          arOverrides[key as keyof AbsoluteReturnInputs] = value;
        }
      }
    }

    if (Object.keys(arOverrides).length > 0) {
      overrides.absolute_return = arOverrides;
    }

    return overrides;
  },
}));
