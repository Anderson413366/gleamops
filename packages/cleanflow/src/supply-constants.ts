/**
 * Supply pricing constants — sourced from AC-SUM-007 playbook.
 * All numbers are midpoints of the documented ranges.
 */
import type {
  CustomerTier,
  SupplyProductFamily,
  SupplyItemInput,
  VolumeDiscountBracket,
  DeliveryFeeTier,
} from './types';

// ---------------------------------------------------------------------------
// Margin Targets (midpoints of AC-SUM-007 ranges)
// ---------------------------------------------------------------------------
export const SUPPLY_MARGIN_TARGETS: Record<
  SupplyProductFamily,
  Record<CustomerTier, number>
> = {
  PAPER_COMMODITIES: { STRATEGIC: 21.5, CORE: 21.5, BASE: 22.5 },
  HAND_SOAP_SANITIZER: { STRATEGIC: 26.5, CORE: 26.5, BASE: 26.5 },
  GENERAL_CHEMICALS: { STRATEGIC: 28.5, CORE: 28.5, BASE: 30.5 },
  SPECIALTY_FLOOR: { STRATEGIC: 31, CORE: 30.5, BASE: 32.5 },
};

// ---------------------------------------------------------------------------
// Guardrails
// ---------------------------------------------------------------------------
/** No SKU below 20% margin without exec approval */
export const MARGIN_FLOOR_PCT = 20;
/** Flag if sale price > 115% of market */
export const MARKET_CHECK_THRESHOLD = 1.15;
/** Warn if blended margin < 25% */
export const BLENDED_TARGET_MIN = 25;
/** Target range ceiling */
export const BLENDED_TARGET_MAX = 30;

// ---------------------------------------------------------------------------
// Volume Discount Brackets (incremental, not whole-order)
// ---------------------------------------------------------------------------
export const DEFAULT_VOLUME_BRACKETS: VolumeDiscountBracket[] = [
  { min_quantity: 1, max_quantity: 4, discount_pct: 0 },
  { min_quantity: 5, max_quantity: 10, discount_pct: 7.5 },
  { min_quantity: 11, max_quantity: 24, discount_pct: 12.5 },
  { min_quantity: 25, max_quantity: null, discount_pct: 20 },
];

// ---------------------------------------------------------------------------
// Delivery Fee Tiers
// ---------------------------------------------------------------------------
export const DELIVERY_FEE_TIERS: DeliveryFeeTier[] = [
  { min_order: 0, max_order: 100, fee: 20 },
  { min_order: 100, max_order: 300, fee: 10 },
  { min_order: 300, max_order: null, fee: 0 },
];

export const EMERGENCY_DELIVERY_FEE = 25;

// ---------------------------------------------------------------------------
// Monthly Allowance Defaults
// ---------------------------------------------------------------------------
export const ALLOWANCE_PER_PERSON_YEAR_DEFAULT = 31;
export const ALLOWANCE_PER_SQFT_YEAR_DEFAULT = 0.07;

// ---------------------------------------------------------------------------
// Management Fee Defaults
// ---------------------------------------------------------------------------
export const MANAGEMENT_FEE_PCT_DEFAULT = 5;
export const MANAGEMENT_FEE_FLAT_DEFAULT = 125;

// ---------------------------------------------------------------------------
// Category-to-Family Mapping
// ---------------------------------------------------------------------------
export const CATEGORY_TO_FAMILY: Record<string, SupplyProductFamily> = {
  // Paper products
  'Toilet Paper': 'PAPER_COMMODITIES',
  'Paper Towels': 'PAPER_COMMODITIES',
  'Facial Tissue': 'PAPER_COMMODITIES',
  'Seat Covers': 'PAPER_COMMODITIES',
  Paper: 'PAPER_COMMODITIES',
  // Hand hygiene
  'Hand Soap': 'HAND_SOAP_SANITIZER',
  'Hand Sanitizer': 'HAND_SOAP_SANITIZER',
  Soap: 'HAND_SOAP_SANITIZER',
  Sanitizer: 'HAND_SOAP_SANITIZER',
  // Chemicals
  'All-Purpose Cleaner': 'GENERAL_CHEMICALS',
  'Glass Cleaner': 'GENERAL_CHEMICALS',
  Disinfectant: 'GENERAL_CHEMICALS',
  'Bathroom Cleaner': 'GENERAL_CHEMICALS',
  'Bowl Cleaner': 'GENERAL_CHEMICALS',
  Chemical: 'GENERAL_CHEMICALS',
  Chemicals: 'GENERAL_CHEMICALS',
  Degreaser: 'GENERAL_CHEMICALS',
  // Floor specialty
  'Floor Finish': 'SPECIALTY_FLOOR',
  'Floor Pads': 'SPECIALTY_FLOOR',
  Stripper: 'SPECIALTY_FLOOR',
  'Floor Care': 'SPECIALTY_FLOOR',
};

/**
 * Map a supply_catalog category string to a product family.
 * Returns GENERAL_CHEMICALS as default for unknown categories.
 */
export function mapCategoryToFamily(category: string): SupplyProductFamily {
  return CATEGORY_TO_FAMILY[category] ?? 'GENERAL_CHEMICALS';
}

// ---------------------------------------------------------------------------
// Product Family Display Labels
// ---------------------------------------------------------------------------
export const PRODUCT_FAMILY_LABELS: Record<SupplyProductFamily, string> = {
  PAPER_COMMODITIES: 'Paper',
  HAND_SOAP_SANITIZER: 'Soap',
  GENERAL_CHEMICALS: 'Chem',
  SPECIALTY_FLOOR: 'Spec',
};

// ---------------------------------------------------------------------------
// Anderson Anchor SKUs (pre-loaded in Quick Quote)
// ---------------------------------------------------------------------------
export const ANDERSON_ANCHOR_SKUS: SupplyItemInput[] = [
  { code: 'PP-TIS-001', name: 'Generic 2-ply 96 rolls/case', product_family: 'PAPER_COMMODITIES', unit: 'case', unit_cost: 55.40, freight_per_unit: 0, shrink_pct: 2, quantity: 1 },
  { code: 'PP-TOW-004', name: 'enMotion 800ft 6 rolls/case', product_family: 'PAPER_COMMODITIES', unit: 'case', unit_cost: 95.66, freight_per_unit: 0, shrink_pct: 2, quantity: 1 },
  { code: 'PP-TOW-006', name: 'Pacific Blue Soft Pull 400ft 6 rolls/case', product_family: 'PAPER_COMMODITIES', unit: 'case', unit_cost: 46.23, freight_per_unit: 0, shrink_pct: 2, quantity: 1 },
  { code: 'CL-GEN-001', name: 'Spartan APC 1 gal', product_family: 'GENERAL_CHEMICALS', unit: 'gal', unit_cost: 12.50, freight_per_unit: 0, shrink_pct: 2, quantity: 1 },
  { code: 'CL-GLS-001', name: 'Glass Cleaner RTU 1 gal', product_family: 'GENERAL_CHEMICALS', unit: 'gal', unit_cost: 9.75, freight_per_unit: 0, shrink_pct: 2, quantity: 1 },
  { code: 'CL-RST-001', name: 'Disinfectant 1 gal', product_family: 'GENERAL_CHEMICALS', unit: 'gal', unit_cost: 18.95, freight_per_unit: 0, shrink_pct: 2, quantity: 1 },
  { code: 'CL-RST-005', name: 'Bowl Cleaner 32oz 12/pack', product_family: 'GENERAL_CHEMICALS', unit: 'pack', unit_cost: 38.74, freight_per_unit: 0, shrink_pct: 2, quantity: 1 },
  { code: 'CL-FLR-003', name: 'iShine Floor Finish 5 gal', product_family: 'SPECIALTY_FLOOR', unit: '5gal', unit_cost: 107.45, freight_per_unit: 0, shrink_pct: 2, quantity: 1 },
  { code: 'CL-FLR-006', name: 'Niagara Burnish Pad 20" 5/pack', product_family: 'SPECIALTY_FLOOR', unit: 'pack', unit_cost: 21.69, freight_per_unit: 0, shrink_pct: 2, quantity: 1 },
  { code: 'HC-SOP-003', name: 'GOJO Green-Seal Foam Soap 6/pack', product_family: 'HAND_SOAP_SANITIZER', unit: 'pack', unit_cost: 47.00, freight_per_unit: 0, shrink_pct: 2, quantity: 1 },
  { code: 'HC-SAN-005', name: 'Purell Foam 1200ml', product_family: 'HAND_SOAP_SANITIZER', unit: 'each', unit_cost: 85.25, freight_per_unit: 0, shrink_pct: 2, quantity: 1 },
  { code: 'HC-SAN-004', name: 'Purell 800ml 12/pack', product_family: 'HAND_SOAP_SANITIZER', unit: 'pack', unit_cost: 124.56, freight_per_unit: 0, shrink_pct: 2, quantity: 1 },
];
