/**
 * Scope & Pricing Library — Type definitions.
 *
 * These interfaces model industry-standard cleaning scope data:
 * facility types, space categories, cleanable items, difficulty modifiers,
 * productivity baselines, special protocols, and regulatory references.
 */

// ---------------------------------------------------------------------------
// Facility Types
// ---------------------------------------------------------------------------
export type FacilityTypeCode =
  | 'CORPORATE_OFFICE'
  | 'MEDICAL_CLINIC'
  | 'OUTPATIENT_SURGICAL'
  | 'SCHOOL_K12'
  | 'UNIVERSITY'
  | 'INDUSTRIAL_WAREHOUSE'
  | 'RETAIL_STORE'
  | 'RESTAURANT'
  | 'GYM_FITNESS'
  | 'GOVERNMENT';

export type SizeTierCode = 'SMALL' | 'MEDIUM' | 'LARGE';

export interface SizeTier {
  code: SizeTierCode;
  label: string;
  min_sqft: number;
  max_sqft: number;
  midpoint_sqft: number;
}

export interface FacilityTypeArea {
  name: string;
  space_category_code: SpaceCategoryCode;
  pct: number;
  floor_type_default: string;
}

export interface FacilityType {
  code: FacilityTypeCode;
  label: string;
  description: string;
  building_type_mapping: string;
  size_tiers: SizeTier[];
  typical_areas: FacilityTypeArea[];
  key_considerations: string[];
}

// ---------------------------------------------------------------------------
// Space Categories & Cleanable Items
// ---------------------------------------------------------------------------
export type SpaceCategoryCode =
  | 'OFFICE_OPEN'
  | 'OFFICE_PRIVATE'
  | 'RESTROOM'
  | 'LOBBY_RECEPTION'
  | 'HALLWAY_CORRIDOR'
  | 'BREAK_ROOM_KITCHEN'
  | 'CONFERENCE_ROOM'
  | 'WAREHOUSE_PRODUCTION'
  | 'CLASSROOM'
  | 'MEDICAL_EXAM';

export type RegulatoryTagCode =
  | 'CDC'
  | 'AORN'
  | 'ISSA'
  | 'FGI'
  | 'OSHA'
  | 'EPA'
  | 'JOINT_COMMISSION'
  | 'CMS';

export interface CleanableItem {
  name: string;
  typical_materials: string[];
  notes: string;
  regulatory_tags: RegulatoryTagCode[];
}

export interface SpaceCategory {
  code: SpaceCategoryCode;
  label: string;
  description: string;
  cleanable_items: CleanableItem[];
}

// ---------------------------------------------------------------------------
// Difficulty Modifiers (stacking codes beyond EASY/STANDARD/DIFFICULT)
// ---------------------------------------------------------------------------
export type ScopeDifficultyCode = 'HT' | 'ELEC' | 'ACC' | 'CLUT' | 'SPEC' | 'PROTO';

export interface ScopeDifficultyModifier {
  code: ScopeDifficultyCode;
  label: string;
  description: string;
  factor: number;
}

// ---------------------------------------------------------------------------
// Productivity Baselines
// ---------------------------------------------------------------------------
export interface ProductivityBaseline {
  space_type: string;
  min_sqft_per_hour: number;
  max_sqft_per_hour: number;
  notes: string;
}

// ---------------------------------------------------------------------------
// Special Protocols
// ---------------------------------------------------------------------------
export interface SpecialProtocol {
  code: string;
  label: string;
  description: string;
  key_procedures: string[];
  typical_frequency: string;
  regulatory_refs: RegulatoryTagCode[];
}

// ---------------------------------------------------------------------------
// Regulatory Tags
// ---------------------------------------------------------------------------
export interface RegulatoryTag {
  code: RegulatoryTagCode;
  label: string;
  description: string;
}
