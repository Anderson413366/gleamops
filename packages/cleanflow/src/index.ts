/**
 * @gleamops/cleanflow — Bid math engine (pure functions).
 *
 * No database calls. No framework imports. Just math.
 * Receives a fully-hydrated BidVersionSnapshot, returns deterministic results.
 *
 * Milestone E will implement:
 * - Production rate matching (5-priority algorithm)
 * - Workload calculation
 * - Pricing calculation (cost_plus, target_margin, hybrid, market_rate)
 * - "Why this price?" explanation payload
 */

export { calculateBid } from './engine';
export type { BidCalculationResult } from './engine';
export { calculateWorkload } from './workload';
export { calculatePricing } from './pricing';
export { findProductionRate } from './production-rates';
export { expressLoad } from './express-load';
export { scopeAwareExpressLoad } from './scope-express-load';
export { calculateSpecialization } from './specialization';
export { calculateWeightedWage } from './weighted-wage';
export { calculateDayPorter } from './day-porter';
export { calculateConsumables, DEFAULT_CONSUMABLE_ITEMS } from './consumables';
export type { BidVersionSnapshot, WorkloadResult, PricingResult } from './types';
export type {
  BidTypeCode,
  BidSpecialization,
  DisinfectingInputs,
  MaidInputs,
  CarpetInputs,
  WindowInputs,
  TileInputs,
  MoveInOutInputs,
  PostConstructionInputs,
  CrewMember,
  WeightedWageResult,
  DayPorterConfig,
  DayPorterResult,
  ConsumableItem,
  ConsumablesResult,
} from './types';
export type { SpecializationAdjustment } from './specialization';
export type { ExpressLoadInput, ExpressLoadArea, FloorMixEntry } from './express-load';
export type { ScopeExpressLoadInput } from './scope-express-load';

// ---------------------------------------------------------------------------
// Supply Pricing (AC-SUM-007)
// ---------------------------------------------------------------------------
export {
  calculateLandedCost,
  calculateSalePrice,
  marginToMarkup,
  markupToMargin,
  calculateVolumeDiscount,
  calculateDeliveryFee,
  priceSupplyItem,
  calculateSupplyPricing,
} from './supply-pricing';
export {
  SUPPLY_MARGIN_TARGETS,
  MARGIN_FLOOR_PCT,
  MARKET_CHECK_THRESHOLD,
  BLENDED_TARGET_MIN,
  BLENDED_TARGET_MAX,
  DEFAULT_VOLUME_BRACKETS,
  DELIVERY_FEE_TIERS,
  EMERGENCY_DELIVERY_FEE,
  ALLOWANCE_PER_PERSON_YEAR_DEFAULT,
  ALLOWANCE_PER_SQFT_YEAR_DEFAULT,
  MANAGEMENT_FEE_PCT_DEFAULT,
  MANAGEMENT_FEE_FLAT_DEFAULT,
  CATEGORY_TO_FAMILY,
  mapCategoryToFamily,
  PRODUCT_FAMILY_LABELS,
  ANDERSON_ANCHOR_SKUS,
} from './supply-constants';
export type {
  CustomerTier,
  SupplyProductFamily,
  SupplyPricingStructure,
  SupplyPricingMethod,
  VolumeDiscountBracket,
  DeliveryFeeTier,
  SupplyItemInput,
  SupplyItemResult,
  SupplyManagementFee,
  SupplyPricingInput,
  SupplyPricingResult,
  SupplyMarginHealth,
} from './types';
