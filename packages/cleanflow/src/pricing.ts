/**
 * Pricing calculation — cost → recommended price.
 * Implements COST_PLUS, TARGET_MARGIN, MARKET_RATE, HYBRID methods.
 *
 * Extended in P1 to support:
 * - Weighted average wage from crew roster
 * - Day porter add-on labor cost
 * - Itemized consumables (overrides flat consumables_monthly)
 * - Bid-type specialization adjustments
 */
import type { BidVersionSnapshot, WorkloadResult, PricingResult, DayPorterResult, ConsumablesResult } from './types';
import { WEEKS_PER_MONTH } from '@gleamops/shared';
import { calculateWeightedWage } from './weighted-wage';
import { calculateDayPorter } from './day-porter';
import { calculateConsumables } from './consumables';
import { calculateSpecialization } from './specialization';

export function calculatePricing(
  snapshot: BidVersionSnapshot,
  workload: WorkloadResult
): PricingResult {
  const { labor_rates, burden, overhead, supplies, equipment, pricing_strategy } = snapshot;

  // Burden multiplier
  const burdenMultiplier = 1 + (
    burden.employer_tax_pct +
    burden.workers_comp_pct +
    burden.insurance_pct +
    burden.other_pct
  ) / 100;

  // Determine effective cleaner rate: weighted wage if crew provided, else flat rate
  let effectiveCleanerRate = labor_rates.cleaner_rate;
  let weightedAvgWage: number | undefined;

  if (snapshot.crew && snapshot.crew.length > 0) {
    const wageResult = calculateWeightedWage(snapshot.crew);
    effectiveCleanerRate = wageResult.weighted_avg_rate;
    weightedAvgWage = wageResult.weighted_avg_rate;
  }

  // Monthly labor cost
  let laborCost = workload.monthly_hours * effectiveCleanerRate;

  if (workload.lead_needed) {
    const supervisorMonthlyHours = snapshot.schedule.supervisor_hours_week * WEEKS_PER_MONTH;
    laborCost += supervisorMonthlyHours * labor_rates.supervisor_rate;
  }

  // Day porter add-on
  let dayPorterResult: DayPorterResult | undefined;
  if (snapshot.day_porter?.enabled) {
    dayPorterResult = calculateDayPorter(snapshot.day_porter);
    laborCost += dayPorterResult.monthly_cost;
  }

  const burdenedLabor = laborCost * burdenMultiplier;

  // Supplies cost — use itemized consumables if provided
  const totalSqft = snapshot.areas.reduce(
    (sum, a) => sum + a.square_footage * a.quantity, 0
  );

  let consumablesMonthly = supplies.consumables_monthly;
  let consumablesDetail: ConsumablesResult | undefined;

  if (snapshot.consumable_items && snapshot.consumable_items.length > 0) {
    consumablesDetail = calculateConsumables(snapshot.consumable_items);
    consumablesMonthly = consumablesDetail.total_monthly;
  }

  const suppliesCost =
    totalSqft * supplies.allowance_per_sqft_monthly +
    consumablesMonthly;

  // Equipment depreciation
  const equipmentCost = equipment.reduce(
    (sum, e) => sum + e.monthly_depreciation, 0
  );

  // Total cost
  const totalMonthlyCost =
    burdenedLabor + suppliesCost + equipmentCost + overhead.monthly_overhead_allocated;

  // Price recommendation
  let recommendedPrice: number;

  switch (pricing_strategy.method) {
    case 'COST_PLUS':
      recommendedPrice = totalMonthlyCost * (1 + (pricing_strategy.cost_plus_pct ?? 20) / 100);
      break;
    case 'TARGET_MARGIN':
      recommendedPrice = totalMonthlyCost / (1 - (pricing_strategy.target_margin_pct ?? 25) / 100);
      break;
    case 'MARKET_RATE':
      recommendedPrice = pricing_strategy.market_price_monthly ?? totalMonthlyCost;
      break;
    case 'HYBRID': {
      const targetPrice = totalMonthlyCost / (1 - (pricing_strategy.target_margin_pct ?? 25) / 100);
      const marketPrice = pricing_strategy.market_price_monthly ?? targetPrice;
      // Clamp target price within 10% of market
      const lowerBound = marketPrice * 0.9;
      const upperBound = marketPrice * 1.1;
      recommendedPrice = Math.max(lowerBound, Math.min(upperBound, targetPrice));
      break;
    }
    default:
      recommendedPrice = totalMonthlyCost;
  }

  const effectiveMarginPct = totalMonthlyCost > 0
    ? ((recommendedPrice - totalMonthlyCost) / recommendedPrice) * 100
    : 0;

  const pricePerSqft = totalSqft > 0 ? recommendedPrice / totalSqft : null;
  const effectiveHourlyRevenue = workload.monthly_hours > 0
    ? recommendedPrice / workload.monthly_hours
    : 0;

  return {
    pricing_method: pricing_strategy.method,
    burdened_labor_cost: burdenedLabor,
    supplies_cost: suppliesCost,
    equipment_cost: equipmentCost,
    overhead_cost: overhead.monthly_overhead_allocated,
    total_monthly_cost: totalMonthlyCost,
    recommended_price: recommendedPrice,
    effective_margin_pct: effectiveMarginPct,
    explanation: {
      labor_hours_monthly: workload.monthly_hours,
      cleaner_rate: effectiveCleanerRate,
      burden_multiplier: burdenMultiplier,
      burden_components: {
        employer_tax_pct: burden.employer_tax_pct,
        workers_comp_pct: burden.workers_comp_pct,
        insurance_pct: burden.insurance_pct,
        other_pct: burden.other_pct,
      },
      supplies_breakdown: {
        allowance: totalSqft * supplies.allowance_per_sqft_monthly,
        consumables: consumablesMonthly,
      },
      equipment_total: equipmentCost,
      overhead_allocated: overhead.monthly_overhead_allocated,
      price_per_sqft: pricePerSqft,
      effective_hourly_revenue: effectiveHourlyRevenue,
      weighted_avg_wage: weightedAvgWage,
      day_porter: dayPorterResult,
      consumables_detail: consumablesDetail,
      specialization_adjustments: snapshot.specialization && snapshot.specialization.type !== 'JANITORIAL'
        ? (() => {
            const specResult = calculateSpecialization(
              snapshot.specialization,
              totalSqft
            );
            return {
              bid_type: snapshot.specialization.type,
              extra_minutes_per_visit: specResult.extra_minutes_per_visit,
              workload_multiplier: specResult.workload_multiplier,
              adjustments: specResult.adjustments,
            };
          })()
        : undefined,
    },
  };
}
