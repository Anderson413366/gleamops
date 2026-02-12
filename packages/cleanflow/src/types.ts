/**
 * CleanFlow engine types.
 * These define the contract between the DB layer and the pure math.
 */

export interface BidVersionSnapshot {
  bid_version_id: string;
  service_code: string | null;
  schedule: {
    days_per_week: number;
    visits_per_day: number;
    hours_per_shift: number;
    lead_required: boolean;
    supervisor_hours_week: number;
  };
  labor_rates: {
    cleaner_rate: number;
    lead_rate: number;
    supervisor_rate: number;
  };
  burden: {
    employer_tax_pct: number;
    workers_comp_pct: number;
    insurance_pct: number;
    other_pct: number;
  };
  overhead: {
    monthly_overhead_allocated: number;
  };
  supplies: {
    allowance_per_sqft_monthly: number;
    consumables_monthly: number;
  };
  equipment: Array<{ name: string; monthly_depreciation: number }>;
  areas: Array<{
    area_id: string;
    name: string;
    area_type_code: string | null;
    floor_type_code: string | null;
    building_type_code: string | null;
    difficulty_code: 'EASY' | 'STANDARD' | 'DIFFICULT';
    square_footage: number;
    quantity: number;
    fixtures?: Record<string, number>;
    tasks: Array<{
      task_code: string;
      frequency_code: string;
      use_ai?: boolean;
      custom_minutes?: number | null;
    }>;
  }>;
  production_rates: Array<{
    task_code: string;
    floor_type_code: string | null;
    building_type_code: string | null;
    unit_code: 'SQFT_1000' | 'EACH';
    base_minutes: number;
    default_ml_adjustment: number;
    is_active: boolean;
  }>;
  pricing_strategy: {
    method: 'COST_PLUS' | 'TARGET_MARGIN' | 'MARKET_RATE' | 'HYBRID';
    target_margin_pct?: number;
    cost_plus_pct?: number;
    market_price_monthly?: number;
  };
}

export interface WorkloadResult {
  total_minutes_per_visit: number;
  weekly_minutes: number;
  monthly_minutes: number;
  monthly_hours: number;
  hours_per_visit: number;
  cleaners_needed: number;
  lead_needed: boolean;
  area_breakdowns: Array<{
    area_id: string;
    area_name: string;
    minutes_per_visit: number;
    task_breakdowns: Array<{
      task_code: string;
      minutes: number;
      source: 'custom' | 'calculated';
    }>;
  }>;
}

export interface PricingResult {
  pricing_method: string;
  burdened_labor_cost: number;
  supplies_cost: number;
  equipment_cost: number;
  overhead_cost: number;
  total_monthly_cost: number;
  recommended_price: number;
  effective_margin_pct: number;
  explanation: PricingExplanation;
}

export interface PricingExplanation {
  labor_hours_monthly: number;
  cleaner_rate: number;
  burden_multiplier: number;
  burden_components: {
    employer_tax_pct: number;
    workers_comp_pct: number;
    insurance_pct: number;
    other_pct: number;
  };
  supplies_breakdown: {
    allowance: number;
    consumables: number;
  };
  equipment_total: number;
  overhead_allocated: number;
  price_per_sqft: number | null;
  effective_hourly_revenue: number;
}
