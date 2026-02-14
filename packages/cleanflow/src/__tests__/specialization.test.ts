import { describe, it, expect } from 'vitest';
import { calculateSpecialization } from '../specialization';
import type {
  BidSpecialization,
  DisinfectingInputs,
  MaidInputs,
  CarpetInputs,
  WindowInputs,
  TileInputs,
  MoveInOutInputs,
  PostConstructionInputs,
} from '../types';

describe('calculateSpecialization', () => {
  describe('JANITORIAL', () => {
    it('returns zero adjustments', () => {
      const result = calculateSpecialization({ type: 'JANITORIAL' }, 10000);
      expect(result.extra_minutes_per_visit).toBe(0);
      expect(result.workload_multiplier).toBe(1.0);
      expect(Object.keys(result.adjustments)).toHaveLength(0);
    });
  });

  describe('DISINFECTING', () => {
    const baseInputs: DisinfectingInputs = {
      method: 'SPRAY',
      density: 'STANDARD',
      active_cases_nearby: false,
      waiver_signed: false,
      ppe_included: false,
    };

    it('calculates base spray method at standard density', () => {
      const spec: BidSpecialization = { type: 'DISINFECTING', inputs: baseInputs };
      const result = calculateSpecialization(spec, 10000);
      // 10000/1000 * 15 * 1.0 (SPRAY) * 1.0 (STANDARD) = 150
      expect(result.extra_minutes_per_visit).toBe(150);
    });

    it('ELECTROSTATIC method = 0.7x multiplier', () => {
      const spec: BidSpecialization = {
        type: 'DISINFECTING',
        inputs: { ...baseInputs, method: 'ELECTROSTATIC' },
      };
      const result = calculateSpecialization(spec, 10000);
      // 10000/1000 * 15 * 0.7 * 1.0 = 105
      expect(result.extra_minutes_per_visit).toBe(105);
      expect(result.adjustments.method_factor).toBe(0.7);
    });

    it('WIPE method = 1.4x multiplier', () => {
      const spec: BidSpecialization = {
        type: 'DISINFECTING',
        inputs: { ...baseInputs, method: 'WIPE' },
      };
      const result = calculateSpecialization(spec, 10000);
      // 10000/1000 * 15 * 1.4 * 1.0 = 210
      expect(result.extra_minutes_per_visit).toBe(210);
    });

    it('HIGH density = 1.3x multiplier', () => {
      const spec: BidSpecialization = {
        type: 'DISINFECTING',
        inputs: { ...baseInputs, density: 'HIGH' },
      };
      const result = calculateSpecialization(spec, 10000);
      // 10000/1000 * 15 * 1.0 * 1.3 = 195
      expect(result.extra_minutes_per_visit).toBe(195);
    });

    it('active_cases_nearby adds 20% surcharge', () => {
      const spec: BidSpecialization = {
        type: 'DISINFECTING',
        inputs: { ...baseInputs, active_cases_nearby: true },
      };
      const result = calculateSpecialization(spec, 10000);
      // 150 * 1.2 = 180
      expect(result.extra_minutes_per_visit).toBe(180);
      expect(result.adjustments.active_cases_surcharge).toBe(1.2);
    });

    it('ppe_included adds 10 minutes', () => {
      const spec: BidSpecialization = {
        type: 'DISINFECTING',
        inputs: { ...baseInputs, ppe_included: true },
      };
      const result = calculateSpecialization(spec, 10000);
      // 150 + 10 = 160
      expect(result.extra_minutes_per_visit).toBe(160);
      expect(result.adjustments.ppe_setup_min).toBe(10);
    });
  });

  describe('MAID', () => {
    const baseInputs: MaidInputs = {
      bedrooms: 3,
      bathrooms: 2,
      has_pets: false,
      pet_count: 0,
      appliance_cleaning: false,
      laundry_included: false,
      fridge_inside: false,
      oven_inside: false,
    };

    it('calculates base bedroom/bathroom minutes', () => {
      const spec: BidSpecialization = { type: 'MAID', inputs: baseInputs };
      const result = calculateSpecialization(spec, 0);
      // 3 * 30 + 2 * 25 = 90 + 50 = 140
      expect(result.extra_minutes_per_visit).toBe(140);
      expect(result.adjustments.bedroom_min).toBe(90);
      expect(result.adjustments.bathroom_min).toBe(50);
    });

    it('adds pet cleanup time', () => {
      const spec: BidSpecialization = {
        type: 'MAID',
        inputs: { ...baseInputs, has_pets: true, pet_count: 2 },
      };
      const result = calculateSpecialization(spec, 0);
      // 140 + min(2, 5) * 10 = 140 + 20 = 160
      expect(result.extra_minutes_per_visit).toBe(160);
    });

    it('caps pet count at 5', () => {
      const spec: BidSpecialization = {
        type: 'MAID',
        inputs: { ...baseInputs, has_pets: true, pet_count: 10 },
      };
      const result = calculateSpecialization(spec, 0);
      // 140 + 5 * 10 = 190
      expect(result.extra_minutes_per_visit).toBe(190);
    });

    it('adds appliance cleaning time', () => {
      const spec: BidSpecialization = {
        type: 'MAID',
        inputs: { ...baseInputs, appliance_cleaning: true, fridge_inside: true, oven_inside: true },
      };
      const result = calculateSpecialization(spec, 0);
      // 140 + 20 (fridge) + 25 (oven) = 185
      expect(result.extra_minutes_per_visit).toBe(185);
    });

    it('adds laundry time', () => {
      const spec: BidSpecialization = {
        type: 'MAID',
        inputs: { ...baseInputs, laundry_included: true },
      };
      const result = calculateSpecialization(spec, 0);
      // 140 + 30 = 170
      expect(result.extra_minutes_per_visit).toBe(170);
    });
  });

  describe('CARPET', () => {
    const baseInputs: CarpetInputs = {
      method: 'HOT_WATER_EXTRACTION',
      move_furniture: false,
      furniture_piece_count: 0,
      apply_deodorizer: false,
      stain_treatment_spots: 0,
      carpet_age_years: 5,
    };

    it('calculates base carpet cleaning time', () => {
      const spec: BidSpecialization = { type: 'CARPET', inputs: baseInputs };
      const result = calculateSpecialization(spec, 10000);
      // 10000/1000 * 20 * 1.0 (HWE) = 200
      expect(result.extra_minutes_per_visit).toBe(200);
    });

    it('ENCAPSULATION method = 0.7x', () => {
      const spec: BidSpecialization = {
        type: 'CARPET',
        inputs: { ...baseInputs, method: 'ENCAPSULATION' },
      };
      const result = calculateSpecialization(spec, 10000);
      // 200 * 0.7 = 140
      expect(result.extra_minutes_per_visit).toBe(140);
    });

    it('adds furniture moving time', () => {
      const spec: BidSpecialization = {
        type: 'CARPET',
        inputs: { ...baseInputs, move_furniture: true, furniture_piece_count: 10 },
      };
      const result = calculateSpecialization(spec, 10000);
      // 200 + 10 * 3 = 230
      expect(result.extra_minutes_per_visit).toBe(230);
    });

    it('applies aged carpet factor for > 10 years', () => {
      const spec: BidSpecialization = {
        type: 'CARPET',
        inputs: { ...baseInputs, carpet_age_years: 15 },
      };
      const result = calculateSpecialization(spec, 10000);
      // 200 * 1.15 = 230
      expect(result.extra_minutes_per_visit).toBeCloseTo(230, 0);
      expect(result.adjustments.aged_carpet_factor).toBe(1.15);
    });

    it('adds stain treatment spots', () => {
      const spec: BidSpecialization = {
        type: 'CARPET',
        inputs: { ...baseInputs, stain_treatment_spots: 5 },
      };
      const result = calculateSpecialization(spec, 10000);
      // 200 + 5 * 5 = 225
      expect(result.extra_minutes_per_visit).toBe(225);
    });
  });

  describe('WINDOW', () => {
    const baseInputs: WindowInputs = {
      pane_count_interior: 20,
      pane_count_exterior: 10,
      includes_screens: false,
      includes_tracks: false,
      includes_sills: false,
      high_access_panes: 0,
      stories: 1,
    };

    it('calculates pane count: interior 4min, exterior 6min', () => {
      const spec: BidSpecialization = { type: 'WINDOW', inputs: baseInputs };
      const result = calculateSpecialization(spec, 0);
      // 20*4 + 10*6 = 80 + 60 = 140
      expect(result.extra_minutes_per_visit).toBe(140);
    });

    it('adds high access panes at 10 min each', () => {
      const spec: BidSpecialization = {
        type: 'WINDOW',
        inputs: { ...baseInputs, high_access_panes: 5 },
      };
      const result = calculateSpecialization(spec, 0);
      // 140 + 5 * 10 = 190
      expect(result.extra_minutes_per_visit).toBe(190);
    });

    it('applies multi-story surcharge for > 2 stories', () => {
      const spec: BidSpecialization = {
        type: 'WINDOW',
        inputs: { ...baseInputs, stories: 4 },
      };
      const result = calculateSpecialization(spec, 0);
      // 140 * (1 + (4-2)*0.1) = 140 * 1.2 = 168
      expect(result.extra_minutes_per_visit).toBeCloseTo(168, 0);
    });

    it('adds screen/track/sill cleaning', () => {
      const spec: BidSpecialization = {
        type: 'WINDOW',
        inputs: {
          ...baseInputs,
          includes_screens: true,
          includes_tracks: true,
          includes_sills: true,
        },
      };
      const result = calculateSpecialization(spec, 0);
      // screens: 30 * 1.5 = 45
      // tracks: 30 * 1 = 30
      // sills: 30 * 0.5 = 15
      // total: 140 + 45 + 30 + 15 = 230
      expect(result.extra_minutes_per_visit).toBe(230);
    });
  });

  describe('TILE', () => {
    const baseInputs: TileInputs = {
      service_type: 'SCRUB_RECOAT',
      coats_of_wax: 0,
      current_wax_condition: 'FAIR',
      needs_stripping: false,
      grout_cleaning: false,
    };

    it('calculates base tile cleaning', () => {
      const spec: BidSpecialization = { type: 'TILE', inputs: baseInputs };
      const result = calculateSpecialization(spec, 10000);
      // 10000/1000 * 25 * 1.0 (SCRUB_RECOAT) * 1.0 (FAIR) = 250
      expect(result.extra_minutes_per_visit).toBe(250);
    });

    it('STRIP_WAX = 1.5x service type', () => {
      const spec: BidSpecialization = {
        type: 'TILE',
        inputs: { ...baseInputs, service_type: 'STRIP_WAX' },
      };
      const result = calculateSpecialization(spec, 10000);
      // 250 * 1.5 = 375
      expect(result.extra_minutes_per_visit).toBe(375);
    });

    it('POOR condition = 1.3x', () => {
      const spec: BidSpecialization = {
        type: 'TILE',
        inputs: { ...baseInputs, current_wax_condition: 'POOR' },
      };
      const result = calculateSpecialization(spec, 10000);
      // 250 * 1.3 = 325
      expect(result.extra_minutes_per_visit).toBe(325);
    });

    it('adds stripping surcharge 1.4x', () => {
      const spec: BidSpecialization = {
        type: 'TILE',
        inputs: { ...baseInputs, needs_stripping: true },
      };
      const result = calculateSpecialization(spec, 10000);
      // 250 * 1.4 = 350
      expect(result.extra_minutes_per_visit).toBe(350);
    });
  });

  describe('MOVE_IN_OUT', () => {
    const baseInputs: MoveInOutInputs = {
      unit_type: 'APARTMENT',
      bedrooms: 2,
      bathrooms: 1,
      garage_included: false,
      appliance_cleaning: false,
      window_cleaning: false,
      carpet_cleaning: false,
    };

    it('calculates base rooms + kitchen/living', () => {
      const spec: BidSpecialization = { type: 'MOVE_IN_OUT', inputs: baseInputs };
      const result = calculateSpecialization(spec, 0);
      // 2*45 + 1*35 + 60 = 90 + 35 + 60 = 185
      expect(result.extra_minutes_per_visit).toBe(185);
    });

    it('adds all optional services', () => {
      const spec: BidSpecialization = {
        type: 'MOVE_IN_OUT',
        inputs: {
          ...baseInputs,
          garage_included: true,
          appliance_cleaning: true,
          window_cleaning: true,
          carpet_cleaning: true,
        },
      };
      const result = calculateSpecialization(spec, 0);
      // 185 + 30 + 40 + 25 + 35 = 315
      expect(result.extra_minutes_per_visit).toBe(315);
    });
  });

  describe('POST_CONSTRUCTION', () => {
    const baseInputs: PostConstructionInputs = {
      phase: 'FINAL',
      debris_level: 'MODERATE',
      includes_window_cleaning: false,
      includes_pressure_wash: false,
      includes_floor_polish: false,
      floors_count: 1,
    };

    it('calculates base post-construction', () => {
      const spec: BidSpecialization = { type: 'POST_CONSTRUCTION', inputs: baseInputs };
      const result = calculateSpecialization(spec, 10000);
      // 10000/1000 * 30 * 1.0 (FINAL) * 1.0 (MODERATE) = 300
      expect(result.extra_minutes_per_visit).toBe(300);
    });

    it('ROUGH phase = 1.8x', () => {
      const spec: BidSpecialization = {
        type: 'POST_CONSTRUCTION',
        inputs: { ...baseInputs, phase: 'ROUGH' },
      };
      const result = calculateSpecialization(spec, 10000);
      // 300 * 1.8 = 540
      expect(result.extra_minutes_per_visit).toBe(540);
      expect(result.adjustments.phase_factor).toBe(1.8);
    });

    it('HEAVY debris = 1.5x', () => {
      const spec: BidSpecialization = {
        type: 'POST_CONSTRUCTION',
        inputs: { ...baseInputs, debris_level: 'HEAVY' },
      };
      const result = calculateSpecialization(spec, 10000);
      // 300 * 1.5 = 450
      expect(result.extra_minutes_per_visit).toBe(450);
      expect(result.adjustments.debris_factor).toBe(1.5);
    });

    it('TOUCH_UP phase = 0.5x', () => {
      const spec: BidSpecialization = {
        type: 'POST_CONSTRUCTION',
        inputs: { ...baseInputs, phase: 'TOUCH_UP' },
      };
      const result = calculateSpecialization(spec, 10000);
      // 300 * 0.5 = 150
      expect(result.extra_minutes_per_visit).toBe(150);
    });

    it('multi-floor surcharge', () => {
      const spec: BidSpecialization = {
        type: 'POST_CONSTRUCTION',
        inputs: { ...baseInputs, floors_count: 3 },
      };
      const result = calculateSpecialization(spec, 10000);
      // 300 * (1 + (3-1)*0.15) = 300 * 1.3 = 390
      expect(result.extra_minutes_per_visit).toBeCloseTo(390, 0);
      expect(result.adjustments.multi_floor_factor).toBe(1.3);
    });

    it('adds optional cleaning services', () => {
      const spec: BidSpecialization = {
        type: 'POST_CONSTRUCTION',
        inputs: {
          ...baseInputs,
          includes_window_cleaning: true,
          includes_pressure_wash: true,
          includes_floor_polish: true,
        },
      };
      const result = calculateSpecialization(spec, 10000);
      // 300 + 10*5 + 10*8 + 10*10 = 300 + 50 + 80 + 100 = 530
      expect(result.extra_minutes_per_visit).toBe(530);
    });
  });

  describe('all 8 bid types return valid structures', () => {
    const allSpecs: BidSpecialization[] = [
      { type: 'JANITORIAL' },
      { type: 'DISINFECTING', inputs: { method: 'SPRAY', density: 'STANDARD', active_cases_nearby: false, waiver_signed: false, ppe_included: false } },
      { type: 'MAID', inputs: { bedrooms: 2, bathrooms: 1, has_pets: false, pet_count: 0, appliance_cleaning: false, laundry_included: false, fridge_inside: false, oven_inside: false } },
      { type: 'CARPET', inputs: { method: 'HOT_WATER_EXTRACTION', move_furniture: false, furniture_piece_count: 0, apply_deodorizer: false, stain_treatment_spots: 0, carpet_age_years: 3 } },
      { type: 'WINDOW', inputs: { pane_count_interior: 10, pane_count_exterior: 5, includes_screens: false, includes_tracks: false, includes_sills: false, high_access_panes: 0, stories: 1 } },
      { type: 'TILE', inputs: { service_type: 'SCRUB_RECOAT', coats_of_wax: 0, current_wax_condition: 'FAIR', needs_stripping: false, grout_cleaning: false } },
      { type: 'MOVE_IN_OUT', inputs: { unit_type: 'APARTMENT', bedrooms: 2, bathrooms: 1, garage_included: false, appliance_cleaning: false, window_cleaning: false, carpet_cleaning: false } },
      { type: 'POST_CONSTRUCTION', inputs: { phase: 'FINAL', debris_level: 'MODERATE', includes_window_cleaning: false, includes_pressure_wash: false, includes_floor_polish: false, floors_count: 1 } },
    ];

    for (const spec of allSpecs) {
      it(`${spec.type} returns valid structure`, () => {
        const result = calculateSpecialization(spec, 5000);
        expect(typeof result.extra_minutes_per_visit).toBe('number');
        expect(typeof result.workload_multiplier).toBe('number');
        expect(typeof result.adjustments).toBe('object');
        expect(result.extra_minutes_per_visit).toBeGreaterThanOrEqual(0);
        expect(result.workload_multiplier).toBeGreaterThan(0);
      });
    }
  });
});
