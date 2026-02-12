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

export { calculateWorkload } from './workload';
export { calculatePricing } from './pricing';
export { findProductionRate } from './production-rates';
export type { BidVersionSnapshot, WorkloadResult, PricingResult } from './types';
