/**
 * UI-layer types for the Supply Calculator wizard.
 * State shape, reducer actions, step config.
 */
import type {
  CustomerTier,
  SupplyPricingStructure,
  SupplyPricingMethod,
  SupplyItemInput,
  SupplyPricingResult,
  VolumeDiscountBracket,
  SupplyManagementFee,
} from '@gleamops/cleanflow';

// ---------------------------------------------------------------------------
// Calculator State
// ---------------------------------------------------------------------------
export interface SupplyCalculatorState {
  // Step 1
  items: SupplyItemInput[];

  // Step 2
  customerTier: CustomerTier;
  pricingStructure: SupplyPricingStructure;
  pricingMethod: SupplyPricingMethod;
  managementFee: SupplyManagementFee;
  volumeDiscounts: {
    enabled: boolean;
    brackets: VolumeDiscountBracket[];
  };
  allowance: {
    method: 'PER_PERSON' | 'PER_SQFT';
    occupant_count: number;
    total_sqft: number;
    rate: number;
  } | null;
  allInclusive: {
    monthly_cleaning_rate: number;
    supply_pct: number;
  } | null;

  // Computed
  result: SupplyPricingResult | null;
}

// ---------------------------------------------------------------------------
// Reducer Actions
// ---------------------------------------------------------------------------
export type SupplyCalculatorAction =
  | { type: 'SET_ITEMS'; items: SupplyItemInput[] }
  | { type: 'ADD_ITEM'; item: SupplyItemInput }
  | { type: 'REMOVE_ITEM'; index: number }
  | { type: 'UPDATE_ITEM'; index: number; patch: Partial<SupplyItemInput> }
  | { type: 'SET_TIER'; tier: CustomerTier }
  | { type: 'SET_STRUCTURE'; structure: SupplyPricingStructure }
  | { type: 'SET_METHOD'; method: SupplyPricingMethod }
  | { type: 'SET_MANAGEMENT_FEE'; fee: SupplyManagementFee }
  | { type: 'SET_VOLUME_DISCOUNTS'; volumeDiscounts: SupplyCalculatorState['volumeDiscounts'] }
  | { type: 'SET_ALLOWANCE'; allowance: SupplyCalculatorState['allowance'] }
  | { type: 'SET_ALL_INCLUSIVE'; allInclusive: SupplyCalculatorState['allInclusive'] }
  | { type: 'QUICK_QUOTE' }
  | { type: 'RECALCULATE'; result: SupplyPricingResult }
  | { type: 'LOAD_DRAFT'; state: SupplyCalculatorState }
  | { type: 'RESET' };

// ---------------------------------------------------------------------------
// Wizard Step Config
// ---------------------------------------------------------------------------
export interface SupplyWizardStep {
  id: string;
  title: string;
  description: string;
}

export const SUPPLY_WIZARD_STEPS: SupplyWizardStep[] = [
  { id: 'items', title: 'Select Items', description: 'Choose supplies to price' },
  { id: 'config', title: 'Configure', description: 'Set pricing strategy' },
  { id: 'pricing', title: 'Price Items', description: 'Review & adjust margins' },
  { id: 'review', title: 'Review', description: 'Export quote' },
];
