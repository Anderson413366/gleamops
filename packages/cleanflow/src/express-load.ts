/**
 * Express Load — Generates default areas from building type + sqft + floor mix.
 *
 * Pure function, no DB calls.
 * Used by BidWizard Step 1 to auto-populate areas.
 */

export interface FloorMixEntry {
  floor_type_code: string;
  percentage: number; // 0-100
}

export interface ExpressLoadArea {
  name: string;
  area_type_code: string;
  floor_type_code: string;
  square_footage: number;
  quantity: number;
  fixtures: Record<string, number>;
}

export interface ExpressLoadInput {
  building_type_code: string;
  total_sqft: number;
  floor_mix?: FloorMixEntry[];
  occupancy?: number;
}

// Default area templates per building type (percentages of total sqft)
const BUILDING_TEMPLATES: Record<string, Array<{ name: string; area_type_code: string; pct: number; floor_type_default: string }>> = {
  OFFICE: [
    { name: 'Offices', area_type_code: 'OFFICE', pct: 60, floor_type_default: 'CARPET' },
    { name: 'Restrooms', area_type_code: 'RESTROOM', pct: 8, floor_type_default: 'CERAMIC' },
    { name: 'Break Room', area_type_code: 'BREAK_ROOM', pct: 8, floor_type_default: 'VCT' },
    { name: 'Conference Rooms', area_type_code: 'CONFERENCE_ROOM', pct: 10, floor_type_default: 'CARPET' },
    { name: 'Hallways', area_type_code: 'HALLWAY', pct: 10, floor_type_default: 'VCT' },
    { name: 'Lobby', area_type_code: 'LOBBY', pct: 4, floor_type_default: 'CERAMIC' },
  ],
  MEDICAL_HEALTHCARE: [
    { name: 'Patient Areas', area_type_code: 'OFFICE', pct: 40, floor_type_default: 'VCT' },
    { name: 'Restrooms', area_type_code: 'RESTROOM', pct: 12, floor_type_default: 'CERAMIC' },
    { name: 'Waiting Room', area_type_code: 'RECEPTION', pct: 15, floor_type_default: 'VCT' },
    { name: 'Hallways', area_type_code: 'HALLWAY', pct: 15, floor_type_default: 'VCT' },
    { name: 'Break Room', area_type_code: 'BREAK_ROOM', pct: 8, floor_type_default: 'VCT' },
    { name: 'Lobby', area_type_code: 'LOBBY', pct: 10, floor_type_default: 'CERAMIC' },
  ],
  RETAIL: [
    { name: 'Sales Floor', area_type_code: 'OFFICE', pct: 65, floor_type_default: 'VCT' },
    { name: 'Restrooms', area_type_code: 'RESTROOM', pct: 8, floor_type_default: 'CERAMIC' },
    { name: 'Break Room', area_type_code: 'BREAK_ROOM', pct: 5, floor_type_default: 'VCT' },
    { name: 'Stockroom', area_type_code: 'WAREHOUSE', pct: 15, floor_type_default: 'CONCRETE' },
    { name: 'Entrance', area_type_code: 'LOBBY', pct: 7, floor_type_default: 'CERAMIC' },
  ],
  SCHOOL_EDUCATION: [
    { name: 'Classrooms', area_type_code: 'OFFICE', pct: 50, floor_type_default: 'VCT' },
    { name: 'Restrooms', area_type_code: 'RESTROOM', pct: 10, floor_type_default: 'CERAMIC' },
    { name: 'Hallways', area_type_code: 'HALLWAY', pct: 15, floor_type_default: 'VCT' },
    { name: 'Cafeteria', area_type_code: 'BREAK_ROOM', pct: 10, floor_type_default: 'VCT' },
    { name: 'Lobby', area_type_code: 'LOBBY', pct: 8, floor_type_default: 'CERAMIC' },
    { name: 'Stairwells', area_type_code: 'STAIRWELL', pct: 7, floor_type_default: 'CONCRETE' },
  ],
  INDUSTRIAL_MANUFACTURING: [
    { name: 'Production Floor', area_type_code: 'WAREHOUSE', pct: 55, floor_type_default: 'CONCRETE' },
    { name: 'Offices', area_type_code: 'OFFICE', pct: 15, floor_type_default: 'CARPET' },
    { name: 'Restrooms', area_type_code: 'RESTROOM', pct: 10, floor_type_default: 'CERAMIC' },
    { name: 'Break Room', area_type_code: 'BREAK_ROOM', pct: 8, floor_type_default: 'VCT' },
    { name: 'Hallways', area_type_code: 'HALLWAY', pct: 12, floor_type_default: 'CONCRETE' },
  ],
  GOVERNMENT: [
    { name: 'Offices', area_type_code: 'OFFICE', pct: 50, floor_type_default: 'CARPET' },
    { name: 'Restrooms', area_type_code: 'RESTROOM', pct: 10, floor_type_default: 'CERAMIC' },
    { name: 'Conference Rooms', area_type_code: 'CONFERENCE_ROOM', pct: 12, floor_type_default: 'CARPET' },
    { name: 'Hallways', area_type_code: 'HALLWAY', pct: 12, floor_type_default: 'VCT' },
    { name: 'Lobby', area_type_code: 'LOBBY', pct: 10, floor_type_default: 'CERAMIC' },
    { name: 'Break Room', area_type_code: 'BREAK_ROOM', pct: 6, floor_type_default: 'VCT' },
  ],
  RESTAURANT_FOOD: [
    { name: 'Dining Area', area_type_code: 'OFFICE', pct: 45, floor_type_default: 'CERAMIC' },
    { name: 'Kitchen', area_type_code: 'BREAK_ROOM', pct: 25, floor_type_default: 'CERAMIC' },
    { name: 'Restrooms', area_type_code: 'RESTROOM', pct: 12, floor_type_default: 'CERAMIC' },
    { name: 'Entrance', area_type_code: 'LOBBY', pct: 10, floor_type_default: 'CERAMIC' },
    { name: 'Storage', area_type_code: 'WAREHOUSE', pct: 8, floor_type_default: 'CONCRETE' },
  ],
  GYM_FITNESS: [
    { name: 'Workout Floor', area_type_code: 'OFFICE', pct: 50, floor_type_default: 'CONCRETE' },
    { name: 'Locker Rooms', area_type_code: 'RESTROOM', pct: 20, floor_type_default: 'CERAMIC' },
    { name: 'Reception', area_type_code: 'RECEPTION', pct: 10, floor_type_default: 'VCT' },
    { name: 'Restrooms', area_type_code: 'RESTROOM', pct: 8, floor_type_default: 'CERAMIC' },
    { name: 'Office', area_type_code: 'OFFICE', pct: 7, floor_type_default: 'CARPET' },
    { name: 'Hallways', area_type_code: 'HALLWAY', pct: 5, floor_type_default: 'VCT' },
  ],
};

// Default restroom fixtures based on occupancy
function generateRestroomFixtures(occupancy: number): Record<string, number> {
  // General rule: 1 toilet per 15 people, 1 sink per 20, 1 urinal per 30
  const toilets = Math.max(2, Math.ceil(occupancy / 15));
  const sinks = Math.max(2, Math.ceil(occupancy / 20));
  const urinals = Math.max(1, Math.ceil(occupancy / 30));

  return {
    toilets,
    sinks,
    urinals,
  };
}

/**
 * Express Load: generates default areas from building type + total sqft.
 * Returns an array of areas that can be used directly in the BidWizard.
 */
export function expressLoad(input: ExpressLoadInput): ExpressLoadArea[] {
  const { building_type_code, total_sqft, floor_mix, occupancy } = input;

  const template = BUILDING_TEMPLATES[building_type_code];
  if (!template) {
    // Fallback: single area with all sqft
    return [{
      name: 'Main Area',
      area_type_code: 'CUSTOM',
      floor_type_code: floor_mix?.[0]?.floor_type_code ?? 'VCT',
      square_footage: total_sqft,
      quantity: 1,
      fixtures: {},
    }];
  }

  const areas: ExpressLoadArea[] = [];

  for (const tmpl of template) {
    const sqft = Math.round(total_sqft * (tmpl.pct / 100));
    if (sqft <= 0) continue;

    // Use floor_mix override if provided, otherwise use template default
    let floorType = tmpl.floor_type_default;
    if (floor_mix && floor_mix.length > 0) {
      // Find best match: if this area's default floor type is in the mix, use it
      // Otherwise, use the floor type with highest percentage
      const matchingFloor = floor_mix.find((f) => f.floor_type_code === tmpl.floor_type_default);
      if (!matchingFloor) {
        const sorted = [...floor_mix].sort((a, b) => b.percentage - a.percentage);
        floorType = sorted[0]?.floor_type_code ?? tmpl.floor_type_default;
      }
    }

    // Generate fixtures for restrooms
    let fixtures: Record<string, number> = {};
    if (tmpl.area_type_code === 'RESTROOM' && occupancy) {
      fixtures = generateRestroomFixtures(occupancy);
    }

    areas.push({
      name: tmpl.name,
      area_type_code: tmpl.area_type_code,
      floor_type_code: floorType,
      square_footage: sqft,
      quantity: 1,
      fixtures,
    });
  }

  return areas;
}
