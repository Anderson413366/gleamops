/**
 * Scope & Pricing Library — barrel export.
 */

// Types
export type {
  FacilityTypeCode,
  SizeTierCode,
  SizeTier,
  FacilityTypeArea,
  FacilityType,
  SpaceCategoryCode,
  RegulatoryTagCode,
  CleanableItem,
  SpaceCategory,
  ScopeDifficultyCode,
  ScopeDifficultyModifier,
  ProductivityBaseline,
  SpecialProtocol,
  RegulatoryTag,
} from './types';

// Data
export { FACILITY_TYPES } from './facility-types';
export { SPACE_CATEGORIES } from './spaces';
export { SCOPE_DIFFICULTY_MODIFIERS } from './difficulty-modifiers';
export { PRODUCTIVITY_BASELINES } from './productivity-baselines';
export { SPECIAL_PROTOCOLS } from './special-protocols';
export { REGULATORY_TAGS } from './regulatory-tags';
export { BUILDING_TASKS } from './building-tasks';
export type { BuildingTask } from './building-tasks';
