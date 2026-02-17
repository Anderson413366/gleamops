/**
 * Scope-Aware Express Load — generates default areas from facility type + sqft.
 *
 * Richer than the original expressLoad(): uses facility-type-specific area
 * breakdowns, size tiers, and cross-references SPACE_CATEGORIES for cleanable
 * item data. Falls back to the original expressLoad() for unmapped types.
 *
 * Pure function, no DB calls.
 */
import type { FacilityTypeCode, SizeTierCode } from '@gleamops/shared';
import { FACILITY_TYPES } from '@gleamops/shared';
import { expressLoad } from './express-load';
import type { ExpressLoadArea } from './express-load';

export interface ScopeExpressLoadInput {
  facility_type_code: FacilityTypeCode;
  total_sqft: number;
  size_tier_code?: SizeTierCode;
  selected_areas?: string[];
  occupancy?: number;
}

/**
 * Generate areas from scope library facility type data.
 * Falls back to original expressLoad() if facility type is not found.
 */
export function scopeAwareExpressLoad(input: ScopeExpressLoadInput): ExpressLoadArea[] {
  const { facility_type_code, total_sqft, selected_areas, occupancy } = input;

  const facility = FACILITY_TYPES.find((f) => f.code === facility_type_code);
  if (!facility) {
    return expressLoad({
      building_type_code: facility_type_code,
      total_sqft,
      occupancy,
    });
  }

  const areasToGenerate = selected_areas
    ? facility.typical_areas.filter((a) => selected_areas.includes(a.name))
    : facility.typical_areas;

  if (areasToGenerate.length === 0) {
    return expressLoad({
      building_type_code: facility.building_type_mapping,
      total_sqft,
      occupancy,
    });
  }

  // Renormalize percentages if a subset of areas was selected
  const totalPct = areasToGenerate.reduce((sum, a) => sum + a.pct, 0);
  const scale = totalPct > 0 ? 100 / totalPct : 1;

  const areas: ExpressLoadArea[] = [];

  for (const tmpl of areasToGenerate) {
    const normalizedPct = tmpl.pct * scale;
    const sqft = Math.round(total_sqft * (normalizedPct / 100));
    if (sqft <= 0) continue;

    // Generate fixtures for restrooms
    let fixtures: Record<string, number> = {};
    if (tmpl.space_category_code === 'RESTROOM' && occupancy) {
      const toilets = Math.max(2, Math.ceil(occupancy / 15));
      const sinks = Math.max(2, Math.ceil(occupancy / 20));
      const urinals = Math.max(1, Math.ceil(occupancy / 30));
      fixtures = { toilets, sinks, urinals };
    }

    // Map space_category_code to area_type_code for BidVersionSnapshot compatibility
    const areaTypeCode = mapSpaceCategoryToAreaType(tmpl.space_category_code);

    areas.push({
      name: tmpl.name,
      area_type_code: areaTypeCode,
      floor_type_code: tmpl.floor_type_default,
      square_footage: sqft,
      quantity: 1,
      fixtures,
    });
  }

  return areas;
}

/**
 * Map scope library space category codes to the existing area_type_code
 * system used by BidVersionSnapshot.
 */
function mapSpaceCategoryToAreaType(spaceCategoryCode: string): string {
  const mapping: Record<string, string> = {
    OFFICE_OPEN: 'OFFICE',
    OFFICE_PRIVATE: 'OFFICE',
    RESTROOM: 'RESTROOM',
    LOBBY_RECEPTION: 'LOBBY',
    HALLWAY_CORRIDOR: 'HALLWAY',
    BREAK_ROOM_KITCHEN: 'BREAK_ROOM',
    CONFERENCE_ROOM: 'CONFERENCE_ROOM',
    WAREHOUSE_PRODUCTION: 'WAREHOUSE',
    CLASSROOM: 'OFFICE',
    MEDICAL_EXAM: 'OFFICE',
  };
  return mapping[spaceCategoryCode] ?? 'CUSTOM';
}
