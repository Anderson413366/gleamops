'use client';

import { useReducer, useEffect, useRef, useCallback } from 'react';
import type { SupplyPricingInput } from '@gleamops/cleanflow';
import {
  calculateSupplyPricing,
  ANDERSON_ANCHOR_SKUS,
  DEFAULT_VOLUME_BRACKETS,
  MANAGEMENT_FEE_PCT_DEFAULT,
  MANAGEMENT_FEE_FLAT_DEFAULT,
  ALLOWANCE_PER_PERSON_YEAR_DEFAULT,
} from '@gleamops/cleanflow';
import type {
  SupplyCalculatorState,
  SupplyCalculatorAction,
} from '../lib/supply-calculator-types';

// ---------------------------------------------------------------------------
// Storage Key
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'gleamops:supply-calc-draft';

// ---------------------------------------------------------------------------
// Initial State
// ---------------------------------------------------------------------------
const INITIAL_STATE: SupplyCalculatorState = {
  items: [],
  customerTier: 'CORE',
  pricingStructure: 'LINE_ITEM',
  pricingMethod: 'MARGIN',
  managementFee: {
    enabled: true,
    fee_pct: MANAGEMENT_FEE_PCT_DEFAULT,
    mode: 'SEPARATE',
    flat_amount: MANAGEMENT_FEE_FLAT_DEFAULT,
  },
  volumeDiscounts: {
    enabled: false,
    brackets: DEFAULT_VOLUME_BRACKETS,
  },
  allowance: null,
  allInclusive: null,
  result: null,
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------
function reducer(
  state: SupplyCalculatorState,
  action: SupplyCalculatorAction
): SupplyCalculatorState {
  switch (action.type) {
    case 'SET_ITEMS':
      return { ...state, items: action.items };
    case 'ADD_ITEM':
      return { ...state, items: [...state.items, action.item] };
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter((_, i) => i !== action.index) };
    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map((item, i) =>
          i === action.index ? { ...item, ...action.patch } : item
        ),
      };
    case 'SET_TIER':
      return { ...state, customerTier: action.tier };
    case 'SET_STRUCTURE':
      return {
        ...state,
        pricingStructure: action.structure,
        allowance:
          action.structure === 'MONTHLY_ALLOWANCE'
            ? state.allowance ?? {
                method: 'PER_PERSON',
                occupant_count: 0,
                total_sqft: 0,
                rate: ALLOWANCE_PER_PERSON_YEAR_DEFAULT,
              }
            : null,
        allInclusive:
          action.structure === 'ALL_INCLUSIVE'
            ? state.allInclusive ?? {
                monthly_cleaning_rate: 0,
                supply_pct: 6,
              }
            : null,
      };
    case 'SET_METHOD':
      return { ...state, pricingMethod: action.method };
    case 'SET_MANAGEMENT_FEE':
      return { ...state, managementFee: action.fee };
    case 'SET_VOLUME_DISCOUNTS':
      return { ...state, volumeDiscounts: action.volumeDiscounts };
    case 'SET_ALLOWANCE':
      return { ...state, allowance: action.allowance };
    case 'SET_ALL_INCLUSIVE':
      return { ...state, allInclusive: action.allInclusive };
    case 'QUICK_QUOTE':
      return {
        ...INITIAL_STATE,
        items: ANDERSON_ANCHOR_SKUS.map((sku) => ({ ...sku })),
        customerTier: 'CORE',
      };
    case 'RECALCULATE':
      return { ...state, result: action.result };
    case 'LOAD_DRAFT':
      return { ...action.state };
    case 'RESET':
      return { ...INITIAL_STATE };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useSupplyCalculator() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const recalcTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Auto-recalculate (debounced 300ms)
  useEffect(() => {
    if (recalcTimerRef.current) clearTimeout(recalcTimerRef.current);

    if (state.items.length === 0) {
      dispatch({ type: 'RECALCULATE', result: null as unknown as import('@gleamops/cleanflow').SupplyPricingResult });
      return;
    }

    recalcTimerRef.current = setTimeout(() => {
      const input: SupplyPricingInput = {
        customer_tier: state.customerTier,
        pricing_structure: state.pricingStructure,
        pricing_method: state.pricingMethod,
        items: state.items,
        management_fee: state.managementFee,
        volume_discounts: state.volumeDiscounts,
        allowance: state.allowance ?? undefined,
        all_inclusive: state.allInclusive ?? undefined,
      };

      try {
        const result = calculateSupplyPricing(input);
        dispatch({ type: 'RECALCULATE', result });
      } catch {
        // Silently handle calc errors
      }
    }, 300);

    return () => {
      if (recalcTimerRef.current) clearTimeout(recalcTimerRef.current);
    };
  }, [
    state.items,
    state.customerTier,
    state.pricingStructure,
    state.pricingMethod,
    state.managementFee,
    state.volumeDiscounts,
    state.allowance,
    state.allInclusive,
  ]);

  // Auto-save to localStorage (debounced 1s)
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(() => {
      try {
        const toSave = { ...state, result: null };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      } catch {
        // localStorage may be full or unavailable
      }
    }, 1000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state]);

  // Check for saved draft on mount
  const loadDraft = useCallback((): SupplyCalculatorState | null => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return null;
      const parsed = JSON.parse(saved) as SupplyCalculatorState;
      if (!parsed.items || parsed.items.length === 0) return null;
      return parsed;
    } catch {
      return null;
    }
  }, []);

  const restoreDraft = useCallback(() => {
    const draft = loadDraft();
    if (draft) {
      dispatch({ type: 'LOAD_DRAFT', state: draft });
    }
  }, [loadDraft]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
    clearDraft();
  }, [clearDraft]);

  return {
    state,
    dispatch,
    loadDraft,
    restoreDraft,
    clearDraft,
    reset,
  };
}
