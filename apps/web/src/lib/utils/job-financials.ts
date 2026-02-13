/**
 * Job Financial Model — client-side utility
 * Computes cost breakdown, profit, and margin tier for a job.
 */

export interface JobFinancialInput {
  billing_amount: number;
  subcontractor_cost?: number | null;
  internal_labor_cost?: number | null;
  supply_cost_override?: number | null;
  equipment_cost?: number | null;
}

export interface JobFinancialResult {
  billing_amount: number;
  suggested_sub_mo: number;
  suggested_labor_mo: number;
  target_profit_pct: number;
  cost_supplies: number;
  cost_subcontractor: number;
  cost_internal_labor: number;
  cost_equipment: number;
  cost_total: number;
  profit_amount: number;
  profit_margin_pct: number;
  margin_tier: 'A' | 'B' | 'C' | 'D';
}

export function computeJobFinancials(input: JobFinancialInput): JobFinancialResult {
  const billing = input.billing_amount;

  // Subcontractor cost: 60% of billing (was 25%)
  const suggested_sub_mo = billing * 0.60;
  // Suggested labor: 60% of sub cost
  const suggested_labor_mo = suggested_sub_mo * 0.60;
  // Target profit margin
  const target_profit_pct = 0.40;

  const cost_supplies = input.supply_cost_override ?? billing * 0.05;
  const cost_subcontractor = input.subcontractor_cost ?? 0;
  const cost_internal_labor = input.internal_labor_cost ?? 0;
  const cost_equipment = input.equipment_cost ?? 0;

  const cost_total = cost_subcontractor + cost_internal_labor + cost_supplies + cost_equipment;

  // Actual profit depends on whether job is subcontracted or in-house
  let profit_amount: number;
  if (cost_subcontractor > 0) {
    // Subcontracted: profit = billing - actual sub cost
    profit_amount = billing - cost_total;
  } else if (cost_internal_labor > 0) {
    // In-house: profit = billing - actual labor
    profit_amount = billing - cost_total;
  } else {
    // No actual costs entered — use suggested labor as estimate
    profit_amount = billing - (suggested_labor_mo + cost_supplies + cost_equipment);
  }

  const profit_margin_pct = billing > 0 ? (profit_amount / billing) * 100 : 0;

  let margin_tier: 'A' | 'B' | 'C' | 'D';
  if (profit_margin_pct > 30) margin_tier = 'A';
  else if (profit_margin_pct > 15) margin_tier = 'B';
  else if (profit_margin_pct > 5) margin_tier = 'C';
  else margin_tier = 'D';

  return {
    billing_amount: billing,
    suggested_sub_mo,
    suggested_labor_mo,
    target_profit_pct,
    cost_supplies,
    cost_subcontractor,
    cost_internal_labor,
    cost_equipment,
    cost_total,
    profit_amount,
    profit_margin_pct,
    margin_tier,
  };
}
