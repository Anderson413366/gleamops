/**
 * CleanFlow engine types.
 * These define the contract between the DB layer and the pure math.
 */

// ---------------------------------------------------------------------------
// Bid Type Codes
// ---------------------------------------------------------------------------
export type BidTypeCode =
  | 'JANITORIAL'
  | 'DISINFECTING'
  | 'MAID'
  | 'CARPET'
  | 'WINDOW'
  | 'TILE'
  | 'MOVE_IN_OUT'
  | 'POST_CONSTRUCTION';

// ---------------------------------------------------------------------------
// Bid-type specialization inputs (one per bid type)
// ---------------------------------------------------------------------------
export interface DisinfectingInputs {
  method: 'SPRAY' | 'WIPE' | 'ELECTROSTATIC' | 'FOGGING';
  density: 'LIGHT' | 'STANDARD' | 'HIGH';
  active_cases_nearby: boolean;
  waiver_signed: boolean;
  ppe_included: boolean;
}

export interface MaidInputs {
  bedrooms: number;
  bathrooms: number;
  has_pets: boolean;
  pet_count: number;
  appliance_cleaning: boolean;
  laundry_included: boolean;
  fridge_inside: boolean;
  oven_inside: boolean;
}

export interface CarpetInputs {
  method: 'HOT_WATER_EXTRACTION' | 'ENCAPSULATION' | 'BONNET' | 'DRY_COMPOUND';
  move_furniture: boolean;
  furniture_piece_count: number;
  apply_deodorizer: boolean;
  stain_treatment_spots: number;
  carpet_age_years: number;
}

export interface WindowInputs {
  pane_count_interior: number;
  pane_count_exterior: number;
  includes_screens: boolean;
  includes_tracks: boolean;
  includes_sills: boolean;
  high_access_panes: number;
  stories: number;
}

export interface TileInputs {
  service_type: 'STRIP_WAX' | 'SCRUB_RECOAT' | 'DEEP_CLEAN' | 'SEAL';
  coats_of_wax: number;
  current_wax_condition: 'GOOD' | 'FAIR' | 'POOR' | 'NONE';
  needs_stripping: boolean;
  grout_cleaning: boolean;
}

export interface MoveInOutInputs {
  unit_type: 'APARTMENT' | 'HOUSE' | 'CONDO' | 'TOWNHOUSE';
  bedrooms: number;
  bathrooms: number;
  garage_included: boolean;
  appliance_cleaning: boolean;
  window_cleaning: boolean;
  carpet_cleaning: boolean;
}

export interface PostConstructionInputs {
  phase: 'ROUGH' | 'FINAL' | 'TOUCH_UP';
  debris_level: 'LIGHT' | 'MODERATE' | 'HEAVY';
  includes_window_cleaning: boolean;
  includes_pressure_wash: boolean;
  includes_floor_polish: boolean;
  floors_count: number;
}

export type BidSpecialization =
  | { type: 'JANITORIAL' }
  | { type: 'DISINFECTING'; inputs: DisinfectingInputs }
  | { type: 'MAID'; inputs: MaidInputs }
  | { type: 'CARPET'; inputs: CarpetInputs }
  | { type: 'WINDOW'; inputs: WindowInputs }
  | { type: 'TILE'; inputs: TileInputs }
  | { type: 'MOVE_IN_OUT'; inputs: MoveInOutInputs }
  | { type: 'POST_CONSTRUCTION'; inputs: PostConstructionInputs };

// ---------------------------------------------------------------------------
// Weighted Average Wage — crew member rates + weekly hours
// ---------------------------------------------------------------------------
export interface CrewMember {
  role: string;
  hourly_rate: number;
  weekly_hours: number;
}

export interface WeightedWageResult {
  weighted_avg_rate: number;
  total_weekly_hours: number;
  crew_members: CrewMember[];
}

// ---------------------------------------------------------------------------
// Day Porter add-on
// ---------------------------------------------------------------------------
export interface DayPorterConfig {
  enabled: boolean;
  days_per_week: number;
  hours_per_day: number;
  hourly_rate: number;
}

export interface DayPorterResult {
  monthly_hours: number;
  monthly_cost: number;
}

// ---------------------------------------------------------------------------
// Consumables — item-level occupancy-based
// ---------------------------------------------------------------------------
export interface ConsumableItem {
  name: string;
  category: 'PAPER' | 'SOAP' | 'LINER' | 'CHEMICAL' | 'OTHER';
  unit_cost: number;
  units_per_occupant_per_month: number;
  occupant_count: number;
}

export interface ConsumablesResult {
  items: Array<ConsumableItem & { monthly_cost: number }>;
  total_monthly: number;
}

// ---------------------------------------------------------------------------
// Main snapshot — extended with optional specialization, crew, day porter
// ---------------------------------------------------------------------------
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
  /** Bid-type specialization inputs (optional — defaults to Janitorial behavior) */
  specialization?: BidSpecialization;
  /** Crew members for weighted average wage (optional — falls back to cleaner_rate) */
  crew?: CrewMember[];
  /** Day porter add-on (optional — adds to labor cost if enabled) */
  day_porter?: DayPorterConfig;
  /** Itemized consumables (optional — overrides consumables_monthly if provided) */
  consumable_items?: ConsumableItem[];
}

export interface WorkloadResult {
  total_minutes_per_visit: number;
  weekly_minutes: number;
  monthly_minutes: number;
  monthly_hours: number;
  hours_per_visit: number;
  cleaners_needed: number;
  lead_needed: boolean;
  warnings: string[];
  area_breakdowns: Array<{
    area_id: string;
    area_name: string;
    minutes_per_visit: number;
    task_breakdowns: Array<{
      task_code: string;
      minutes: number;
      frequency_factor: number;
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
  /** Weighted average wage (if crew provided) */
  weighted_avg_wage?: number;
  /** Day porter cost breakdown */
  day_porter?: DayPorterResult;
  /** Consumables item-level breakdown */
  consumables_detail?: ConsumablesResult;
  /** Bid-type specialization adjustments applied */
  specialization_adjustments?: {
    bid_type: BidTypeCode;
    extra_minutes_per_visit: number;
    workload_multiplier: number;
    adjustments: Record<string, number>;
  };
}
