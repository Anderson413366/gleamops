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
