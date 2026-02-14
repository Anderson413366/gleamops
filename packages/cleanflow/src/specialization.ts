/**
 * Bid-type specialization calculators.
 *
 * Each bid type applies multipliers/additions to the base workload.
 * Returns adjustments as { label → extra_minutes_per_visit }.
 */
import type {
  BidSpecialization,
  DisinfectingInputs,
  MaidInputs,
  CarpetInputs,
  WindowInputs,
  TileInputs,
  MoveInOutInputs,
  PostConstructionInputs,
} from './types';

export interface SpecializationAdjustment {
  /** Total extra minutes per visit from specialization */
  extra_minutes_per_visit: number;
  /** Workload multiplier on base area minutes (1.0 = no change) */
  workload_multiplier: number;
  /** Itemized adjustments for audit trail */
  adjustments: Record<string, number>;
}

/**
 * Calculate specialization-driven workload adjustments.
 * @param spec - The bid specialization inputs
 * @param baseSqft - Total square footage of the bid
 * @returns Adjustments to apply on top of base workload
 */
export function calculateSpecialization(
  spec: BidSpecialization,
  baseSqft: number
): SpecializationAdjustment {
  switch (spec.type) {
    case 'JANITORIAL':
      return { extra_minutes_per_visit: 0, workload_multiplier: 1.0, adjustments: {} };
    case 'DISINFECTING':
      return calcDisinfecting(spec.inputs, baseSqft);
    case 'MAID':
      return calcMaid(spec.inputs);
    case 'CARPET':
      return calcCarpet(spec.inputs, baseSqft);
    case 'WINDOW':
      return calcWindow(spec.inputs);
    case 'TILE':
      return calcTile(spec.inputs, baseSqft);
    case 'MOVE_IN_OUT':
      return calcMoveInOut(spec.inputs);
    case 'POST_CONSTRUCTION':
      return calcPostConstruction(spec.inputs, baseSqft);
  }
}

// ---------------------------------------------------------------------------
// Disinfecting
// ---------------------------------------------------------------------------
const DISINFECT_METHOD_MULTIPLIER: Record<DisinfectingInputs['method'], number> = {
  SPRAY: 1.0,
  WIPE: 1.4,
  ELECTROSTATIC: 0.7,
  FOGGING: 0.5,
};

const DISINFECT_DENSITY_MULTIPLIER: Record<DisinfectingInputs['density'], number> = {
  LIGHT: 0.8,
  STANDARD: 1.0,
  HIGH: 1.3,
};

function calcDisinfecting(inputs: DisinfectingInputs, sqft: number): SpecializationAdjustment {
  const baseMinsPerKSqft = 15; // 15 min per 1000 sqft base
  let minutes = (sqft / 1000) * baseMinsPerKSqft;
  minutes *= DISINFECT_METHOD_MULTIPLIER[inputs.method];
  minutes *= DISINFECT_DENSITY_MULTIPLIER[inputs.density];

  const adjustments: Record<string, number> = {
    method_factor: DISINFECT_METHOD_MULTIPLIER[inputs.method],
    density_factor: DISINFECT_DENSITY_MULTIPLIER[inputs.density],
  };

  if (inputs.active_cases_nearby) {
    minutes *= 1.2;
    adjustments.active_cases_surcharge = 1.2;
  }
  if (inputs.ppe_included) {
    minutes += 10; // 10 min donning/doffing PPE
    adjustments.ppe_setup_min = 10;
  }

  return { extra_minutes_per_visit: minutes, workload_multiplier: 1.0, adjustments };
}

// ---------------------------------------------------------------------------
// Maid (Residential)
// ---------------------------------------------------------------------------
function calcMaid(inputs: MaidInputs): SpecializationAdjustment {
  const adjustments: Record<string, number> = {};

  // Base: 30 min per bedroom, 25 min per bathroom
  let minutes = inputs.bedrooms * 30 + inputs.bathrooms * 25;
  adjustments.bedroom_min = inputs.bedrooms * 30;
  adjustments.bathroom_min = inputs.bathrooms * 25;

  if (inputs.has_pets) {
    const petAddon = Math.min(inputs.pet_count, 5) * 10;
    minutes += petAddon;
    adjustments.pet_cleanup_min = petAddon;
  }
  if (inputs.appliance_cleaning) {
    let appMin = 0;
    if (inputs.fridge_inside) { appMin += 20; adjustments.fridge_min = 20; }
    if (inputs.oven_inside) { appMin += 25; adjustments.oven_min = 25; }
    minutes += appMin;
  }
  if (inputs.laundry_included) {
    minutes += 30;
    adjustments.laundry_min = 30;
  }

  return { extra_minutes_per_visit: minutes, workload_multiplier: 1.0, adjustments };
}

// ---------------------------------------------------------------------------
// Carpet
// ---------------------------------------------------------------------------
const CARPET_METHOD_MULTIPLIER: Record<CarpetInputs['method'], number> = {
  HOT_WATER_EXTRACTION: 1.0,
  ENCAPSULATION: 0.7,
  BONNET: 0.6,
  DRY_COMPOUND: 0.8,
};

function calcCarpet(inputs: CarpetInputs, sqft: number): SpecializationAdjustment {
  const adjustments: Record<string, number> = {};

  // Base: 20 min per 1000 sqft
  let minutes = (sqft / 1000) * 20;
  minutes *= CARPET_METHOD_MULTIPLIER[inputs.method];
  adjustments.method_factor = CARPET_METHOD_MULTIPLIER[inputs.method];

  if (inputs.move_furniture) {
    const furnitureMin = inputs.furniture_piece_count * 3;
    minutes += furnitureMin;
    adjustments.furniture_move_min = furnitureMin;
  }
  if (inputs.apply_deodorizer) {
    minutes += (sqft / 1000) * 3;
    adjustments.deodorizer_min = (sqft / 1000) * 3;
  }
  if (inputs.stain_treatment_spots > 0) {
    const spotMin = inputs.stain_treatment_spots * 5;
    minutes += spotMin;
    adjustments.stain_treatment_min = spotMin;
  }
  // Older carpet takes longer
  if (inputs.carpet_age_years > 10) {
    minutes *= 1.15;
    adjustments.aged_carpet_factor = 1.15;
  }

  return { extra_minutes_per_visit: minutes, workload_multiplier: 1.0, adjustments };
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------
function calcWindow(inputs: WindowInputs): SpecializationAdjustment {
  const adjustments: Record<string, number> = {};

  // Base: 4 min per interior pane, 6 min per exterior pane
  let minutes = inputs.pane_count_interior * 4 + inputs.pane_count_exterior * 6;
  adjustments.interior_pane_min = inputs.pane_count_interior * 4;
  adjustments.exterior_pane_min = inputs.pane_count_exterior * 6;

  if (inputs.includes_screens) {
    const screenMin = (inputs.pane_count_interior + inputs.pane_count_exterior) * 1.5;
    minutes += screenMin;
    adjustments.screen_cleaning_min = screenMin;
  }
  if (inputs.includes_tracks) {
    const trackMin = (inputs.pane_count_interior + inputs.pane_count_exterior) * 1;
    minutes += trackMin;
    adjustments.track_cleaning_min = trackMin;
  }
  if (inputs.includes_sills) {
    const sillMin = (inputs.pane_count_interior + inputs.pane_count_exterior) * 0.5;
    minutes += sillMin;
    adjustments.sill_cleaning_min = sillMin;
  }
  if (inputs.high_access_panes > 0) {
    const highMin = inputs.high_access_panes * 10;
    minutes += highMin;
    adjustments.high_access_min = highMin;
  }
  // Multi-story surcharge
  if (inputs.stories > 2) {
    const storyFactor = 1 + (inputs.stories - 2) * 0.1;
    minutes *= storyFactor;
    adjustments.multi_story_factor = storyFactor;
  }

  return { extra_minutes_per_visit: minutes, workload_multiplier: 1.0, adjustments };
}

// ---------------------------------------------------------------------------
// Tile
// ---------------------------------------------------------------------------
const TILE_SERVICE_MULTIPLIER: Record<TileInputs['service_type'], number> = {
  STRIP_WAX: 1.5,
  SCRUB_RECOAT: 1.0,
  DEEP_CLEAN: 0.8,
  SEAL: 1.2,
};

const TILE_CONDITION_MULTIPLIER: Record<TileInputs['current_wax_condition'], number> = {
  GOOD: 0.8,
  FAIR: 1.0,
  POOR: 1.3,
  NONE: 1.5,
};

function calcTile(inputs: TileInputs, sqft: number): SpecializationAdjustment {
  const adjustments: Record<string, number> = {};

  // Base: 25 min per 1000 sqft
  let minutes = (sqft / 1000) * 25;
  minutes *= TILE_SERVICE_MULTIPLIER[inputs.service_type];
  minutes *= TILE_CONDITION_MULTIPLIER[inputs.current_wax_condition];
  adjustments.service_type_factor = TILE_SERVICE_MULTIPLIER[inputs.service_type];
  adjustments.condition_factor = TILE_CONDITION_MULTIPLIER[inputs.current_wax_condition];

  if (inputs.coats_of_wax > 0) {
    const coatMin = inputs.coats_of_wax * (sqft / 1000) * 8;
    minutes += coatMin;
    adjustments.wax_coats_min = coatMin;
  }
  if (inputs.needs_stripping) {
    minutes *= 1.4;
    adjustments.stripping_factor = 1.4;
  }
  if (inputs.grout_cleaning) {
    minutes += (sqft / 1000) * 12;
    adjustments.grout_cleaning_min = (sqft / 1000) * 12;
  }

  return { extra_minutes_per_visit: minutes, workload_multiplier: 1.0, adjustments };
}

// ---------------------------------------------------------------------------
// Move In/Out
// ---------------------------------------------------------------------------
function calcMoveInOut(inputs: MoveInOutInputs): SpecializationAdjustment {
  const adjustments: Record<string, number> = {};

  // Base: 45 min per bedroom, 35 min per bathroom
  let minutes = inputs.bedrooms * 45 + inputs.bathrooms * 35;
  adjustments.bedroom_min = inputs.bedrooms * 45;
  adjustments.bathroom_min = inputs.bathrooms * 35;

  // Kitchen/living base
  minutes += 60;
  adjustments.kitchen_living_min = 60;

  if (inputs.garage_included) {
    minutes += 30;
    adjustments.garage_min = 30;
  }
  if (inputs.appliance_cleaning) {
    minutes += 40;
    adjustments.appliance_min = 40;
  }
  if (inputs.window_cleaning) {
    minutes += 25;
    adjustments.window_addon_min = 25;
  }
  if (inputs.carpet_cleaning) {
    minutes += 35;
    adjustments.carpet_addon_min = 35;
  }

  return { extra_minutes_per_visit: minutes, workload_multiplier: 1.0, adjustments };
}

// ---------------------------------------------------------------------------
// Post Construction
// ---------------------------------------------------------------------------
const POST_CONSTRUCTION_PHASE_MULTIPLIER: Record<PostConstructionInputs['phase'], number> = {
  ROUGH: 1.8,
  FINAL: 1.0,
  TOUCH_UP: 0.5,
};

const DEBRIS_MULTIPLIER: Record<PostConstructionInputs['debris_level'], number> = {
  LIGHT: 0.8,
  MODERATE: 1.0,
  HEAVY: 1.5,
};

function calcPostConstruction(inputs: PostConstructionInputs, sqft: number): SpecializationAdjustment {
  const adjustments: Record<string, number> = {};

  // Base: 30 min per 1000 sqft
  let minutes = (sqft / 1000) * 30;
  minutes *= POST_CONSTRUCTION_PHASE_MULTIPLIER[inputs.phase];
  minutes *= DEBRIS_MULTIPLIER[inputs.debris_level];
  adjustments.phase_factor = POST_CONSTRUCTION_PHASE_MULTIPLIER[inputs.phase];
  adjustments.debris_factor = DEBRIS_MULTIPLIER[inputs.debris_level];

  if (inputs.includes_window_cleaning) {
    minutes += (sqft / 1000) * 5;
    adjustments.window_addon_min = (sqft / 1000) * 5;
  }
  if (inputs.includes_pressure_wash) {
    minutes += (sqft / 1000) * 8;
    adjustments.pressure_wash_min = (sqft / 1000) * 8;
  }
  if (inputs.includes_floor_polish) {
    minutes += (sqft / 1000) * 10;
    adjustments.floor_polish_min = (sqft / 1000) * 10;
  }
  // Multi-floor
  if (inputs.floors_count > 1) {
    minutes *= 1 + (inputs.floors_count - 1) * 0.15;
    adjustments.multi_floor_factor = 1 + (inputs.floors_count - 1) * 0.15;
  }

  return { extra_minutes_per_visit: minutes, workload_multiplier: 1.0, adjustments };
}
