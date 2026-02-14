/**
 * CleanFlow engine entrypoint.
 * Orchestrates workload + pricing calculation from a BidVersionSnapshot.
 */
import type { BidVersionSnapshot, WorkloadResult, PricingResult } from './types';
import { calculateWorkload } from './workload';
import { calculatePricing } from './pricing';

export interface BidCalculationResult {
  workload: WorkloadResult;
  pricing: PricingResult;
}

/**
 * Calculate a complete bid from a fully-hydrated snapshot.
 *
 * @throws Error with code BID_001 if snapshot has zero areas.
 */
export function calculateBid(snapshot: BidVersionSnapshot): BidCalculationResult {
  if (!snapshot.areas || snapshot.areas.length === 0) {
    const err = new Error('At least one area must be defined before calculation');
    (err as any).code = 'BID_001';
    throw err;
  }

  const workload = calculateWorkload(snapshot);
  const pricing = calculatePricing(snapshot, workload);

  return { workload, pricing };
}
