import { describe, it, expect } from 'vitest';
import { expressLoad } from '../express-load';
import type { ExpressLoadInput } from '../express-load';

describe('expressLoad', () => {
  it('OFFICE building produces expected area template', () => {
    const input: ExpressLoadInput = {
      building_type_code: 'OFFICE',
      total_sqft: 10000,
    };

    const areas = expressLoad(input);

    // OFFICE template has 6 areas
    expect(areas.length).toBe(6);

    // Verify area names
    const names = areas.map((a) => a.name);
    expect(names).toContain('Offices');
    expect(names).toContain('Restrooms');
    expect(names).toContain('Break Room');
    expect(names).toContain('Conference Rooms');
    expect(names).toContain('Hallways');
    expect(names).toContain('Lobby');

    // Verify sqft sums to total (within rounding tolerance)
    const totalSqft = areas.reduce((sum, a) => sum + a.square_footage, 0);
    expect(totalSqft).toBe(10000);

    // Offices = 60% of 10000 = 6000
    const offices = areas.find((a) => a.name === 'Offices')!;
    expect(offices.square_footage).toBe(6000);
    expect(offices.floor_type_code).toBe('CARPET');
  });

  it('unknown building type falls back to single area', () => {
    const input: ExpressLoadInput = {
      building_type_code: 'UNKNOWN_TYPE',
      total_sqft: 5000,
    };

    const areas = expressLoad(input);
    expect(areas).toHaveLength(1);
    expect(areas[0].name).toBe('Main Area');
    expect(areas[0].area_type_code).toBe('CUSTOM');
    expect(areas[0].square_footage).toBe(5000);
  });

  it('fallback uses floor_mix first entry if provided', () => {
    const input: ExpressLoadInput = {
      building_type_code: 'UNKNOWN_TYPE',
      total_sqft: 5000,
      floor_mix: [{ floor_type_code: 'HARDWOOD', percentage: 100 }],
    };

    const areas = expressLoad(input);
    expect(areas[0].floor_type_code).toBe('HARDWOOD');
  });

  it('fallback defaults to VCT when no floor_mix', () => {
    const input: ExpressLoadInput = {
      building_type_code: 'UNKNOWN_TYPE',
      total_sqft: 5000,
    };

    const areas = expressLoad(input);
    expect(areas[0].floor_type_code).toBe('VCT');
  });

  it('MEDICAL_HEALTHCARE building produces 6 areas', () => {
    const areas = expressLoad({
      building_type_code: 'MEDICAL_HEALTHCARE',
      total_sqft: 20000,
    });

    expect(areas.length).toBe(6);
    const names = areas.map((a) => a.name);
    expect(names).toContain('Patient Areas');
    expect(names).toContain('Waiting Room');
  });

  it('RETAIL building produces 5 areas', () => {
    const areas = expressLoad({
      building_type_code: 'RETAIL',
      total_sqft: 15000,
    });

    expect(areas.length).toBe(5);
    const salesFloor = areas.find((a) => a.name === 'Sales Floor')!;
    expect(salesFloor.square_footage).toBe(9750); // 65%
    expect(salesFloor.floor_type_code).toBe('VCT');
  });

  it('generates restroom fixtures based on occupancy', () => {
    const areas = expressLoad({
      building_type_code: 'OFFICE',
      total_sqft: 10000,
      occupancy: 100,
    });

    const restrooms = areas.find((a) => a.name === 'Restrooms')!;
    expect(restrooms.fixtures).toBeDefined();
    // 100 occupants: ceil(100/15)=7 toilets, ceil(100/20)=5 sinks, ceil(100/30)=4 urinals
    expect(restrooms.fixtures.toilets).toBe(7);
    expect(restrooms.fixtures.sinks).toBe(5);
    expect(restrooms.fixtures.urinals).toBe(4);
  });

  it('generates minimum 2 toilets/sinks for small occupancy', () => {
    const areas = expressLoad({
      building_type_code: 'OFFICE',
      total_sqft: 5000,
      occupancy: 10,
    });

    const restrooms = areas.find((a) => a.name === 'Restrooms')!;
    expect(restrooms.fixtures.toilets).toBe(2); // min 2
    expect(restrooms.fixtures.sinks).toBe(2);   // min 2
    expect(restrooms.fixtures.urinals).toBe(1);  // min 1
  });

  it('floor_mix override replaces defaults when match not found', () => {
    const areas = expressLoad({
      building_type_code: 'OFFICE',
      total_sqft: 10000,
      floor_mix: [
        { floor_type_code: 'HARDWOOD', percentage: 80 },
        { floor_type_code: 'MARBLE', percentage: 20 },
      ],
    });

    // Areas with default floor types NOT in the mix should use highest-pct floor
    const breakRoom = areas.find((a) => a.name === 'Break Room')!;
    // Break Room default is VCT, not in mix → use HARDWOOD (80%)
    expect(breakRoom.floor_type_code).toBe('HARDWOOD');

    // Restrooms default is CERAMIC, not in mix → use HARDWOOD (80%)
    const restrooms = areas.find((a) => a.name === 'Restrooms')!;
    expect(restrooms.floor_type_code).toBe('HARDWOOD');
  });

  it('floor_mix preserves defaults when match found', () => {
    const areas = expressLoad({
      building_type_code: 'OFFICE',
      total_sqft: 10000,
      floor_mix: [
        { floor_type_code: 'CARPET', percentage: 70 },
        { floor_type_code: 'CERAMIC', percentage: 30 },
      ],
    });

    // Offices default is CARPET, which IS in the mix → keep CARPET
    const offices = areas.find((a) => a.name === 'Offices')!;
    expect(offices.floor_type_code).toBe('CARPET');

    // Lobby default is CERAMIC, which IS in the mix → keep CERAMIC
    const lobby = areas.find((a) => a.name === 'Lobby')!;
    expect(lobby.floor_type_code).toBe('CERAMIC');
  });

  it('all building types produce valid areas', () => {
    const types = [
      'OFFICE', 'MEDICAL_HEALTHCARE', 'RETAIL', 'SCHOOL_EDUCATION',
      'INDUSTRIAL_MANUFACTURING', 'GOVERNMENT', 'RESTAURANT_FOOD', 'GYM_FITNESS',
    ];

    for (const type of types) {
      const areas = expressLoad({ building_type_code: type, total_sqft: 10000 });
      expect(areas.length).toBeGreaterThan(0);
      for (const area of areas) {
        expect(area.square_footage).toBeGreaterThan(0);
        expect(area.name.length).toBeGreaterThan(0);
        expect(area.quantity).toBe(1);
      }
    }
  });
});
