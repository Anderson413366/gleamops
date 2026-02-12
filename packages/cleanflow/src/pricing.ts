/**
 * Pricing calculation — cost → recommended price.
 * Implements COST_PLUS, TARGET_MARGIN, MARKET_RATE, HYBRID methods.
 */
import type { BidVersionSnapshot, WorkloadResult, PricingResult } from './types';
import { WEEKS_PER_MONTH } from '@gleamops/shared';

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

  // Monthly labor cost
  let laborCost = workload.monthly_hours * labor_rates.cleaner_rate;

  if (workload.lead_needed) {
    const supervisorMonthlyHours = snapshot.schedule.supervisor_hours_week * WEEKS_PER_MONTH;
    laborCost += supervisorMonthlyHours * labor_rates.supervisor_rate;
  }

  const burdenedLabor = laborCost * burdenMultiplier;

  // Supplies cost
  const totalSqft = snapshot.areas.reduce(
    (sum, a) => sum + a.square_footage * a.quantity, 0
  );
  const suppliesCost =
    totalSqft * supplies.allowance_per_sqft_monthly +
    supplies.consumables_monthly;

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
      cleaner_rate: labor_rates.cleaner_rate,
      burden_multiplier: burdenMultiplier,
      burden_components: {
        employer_tax_pct: burden.employer_tax_pct,
        workers_comp_pct: burden.workers_comp_pct,
        insurance_pct: burden.insurance_pct,
        other_pct: burden.other_pct,
      },
      supplies_breakdown: {
        allowance: totalSqft * supplies.allowance_per_sqft_monthly,
        consumables: supplies.consumables_monthly,
      },
      equipment_total: equipmentCost,
      overhead_allocated: overhead.monthly_overhead_allocated,
      price_per_sqft: pricePerSqft,
      effective_hourly_revenue: effectiveHourlyRevenue,
    },
  };
}
