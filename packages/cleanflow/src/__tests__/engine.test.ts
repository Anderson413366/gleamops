import { describe, it, expect } from 'vitest';
import { calculateBid } from '../engine';
import type { BidVersionSnapshot } from '../types';

/** Minimal valid snapshot for testing the engine entrypoint. */
function makeSnapshot(overrides?: Partial<BidVersionSnapshot>): BidVersionSnapshot {
  return {
    bid_version_id: 'bv-001',
    service_code: 'SVC-001',
    schedule: {
      days_per_week: 5,
      visits_per_day: 1,
      hours_per_shift: 8,
      lead_required: false,
      supervisor_hours_week: 0,
    },
    labor_rates: {
      cleaner_rate: 18,
      lead_rate: 22,
      supervisor_rate: 30,
    },
    burden: {
      employer_tax_pct: 8,
      workers_comp_pct: 4,
      insurance_pct: 3,
      other_pct: 0,
    },
    overhead: {
      monthly_overhead_allocated: 200,
    },
    supplies: {
      allowance_per_sqft_monthly: 0.02,
      consumables_monthly: 50,
    },
    equipment: [
      { name: 'Vacuum', monthly_depreciation: 25 },
    ],
    areas: [
      {
        area_id: 'a1',
        name: 'Main Office',
        area_type_code: 'OFFICE',
        floor_type_code: 'CARPET',
        building_type_code: 'OFFICE',
        difficulty_code: 'STANDARD',
        square_footage: 5000,
        quantity: 1,
        tasks: [
          { task_code: 'VACUUM', frequency_code: 'DAILY' },
          { task_code: 'TRASH', frequency_code: 'DAILY' },
        ],
      },
    ],
    production_rates: [
      {
        task_code: 'VACUUM',
        floor_type_code: 'CARPET',
        building_type_code: null,
        unit_code: 'SQFT_1000',
        base_minutes: 12,
        default_ml_adjustment: 0,
        is_active: true,
      },
      {
        task_code: 'TRASH',
        floor_type_code: null,
        building_type_code: null,
        unit_code: 'SQFT_1000',
        base_minutes: 5,
        default_ml_adjustment: 0,
        is_active: true,
      },
    ],
    pricing_strategy: {
      method: 'COST_PLUS',
      cost_plus_pct: 30,
    },
    ...overrides,
  };
}

describe('calculateBid (engine entrypoint)', () => {
  it('returns workload + pricing for a valid snapshot', () => {
    const snapshot = makeSnapshot();
    const result = calculateBid(snapshot);

    // Both outputs present
    expect(result.workload).toBeDefined();
    expect(result.pricing).toBeDefined();

    // Workload has expected shape
    expect(result.workload.total_minutes_per_visit).toBeGreaterThan(0);
    expect(result.workload.monthly_hours).toBeGreaterThan(0);
    expect(result.workload.cleaners_needed).toBeGreaterThanOrEqual(1);
    expect(result.workload.area_breakdowns).toHaveLength(1);
    expect(result.workload.area_breakdowns[0].area_name).toBe('Main Office');

    // Pricing has expected shape
    expect(result.pricing.pricing_method).toBe('COST_PLUS');
    expect(result.pricing.total_monthly_cost).toBeGreaterThan(0);
    expect(result.pricing.recommended_price).toBeGreaterThan(result.pricing.total_monthly_cost);
    expect(result.pricing.effective_margin_pct).toBeGreaterThan(0);
  });

  it('throws BID_001 when snapshot has no areas', () => {
    const snapshot = makeSnapshot({ areas: [] });
    expect(() => calculateBid(snapshot)).toThrow('At least one area must be defined');
    try {
      calculateBid(snapshot);
    } catch (err: any) {
      expect(err.code).toBe('BID_001');
    }
  });

  it('handles multi-area snapshots', () => {
    const snapshot = makeSnapshot({
      areas: [
        {
          area_id: 'a1',
          name: 'Lobby',
          area_type_code: 'LOBBY',
          floor_type_code: 'CERAMIC',
          building_type_code: 'OFFICE',
          difficulty_code: 'EASY',
          square_footage: 2000,
          quantity: 1,
          tasks: [
            { task_code: 'VACUUM', frequency_code: 'DAILY' },
          ],
        },
        {
          area_id: 'a2',
          name: 'Restrooms',
          area_type_code: 'RESTROOM',
          floor_type_code: 'CERAMIC',
          building_type_code: 'OFFICE',
          difficulty_code: 'DIFFICULT',
          square_footage: 500,
          quantity: 2,
          tasks: [
            { task_code: 'TRASH', frequency_code: 'DAILY' },
          ],
        },
      ],
      production_rates: [
        {
          task_code: 'VACUUM',
          floor_type_code: 'CERAMIC',
          building_type_code: null,
          unit_code: 'SQFT_1000',
          base_minutes: 10,
          default_ml_adjustment: 0,
          is_active: true,
        },
        {
          task_code: 'TRASH',
          floor_type_code: null,
          building_type_code: null,
          unit_code: 'SQFT_1000',
          base_minutes: 5,
          default_ml_adjustment: 0,
          is_active: true,
        },
      ],
    });

    const result = calculateBid(snapshot);
    expect(result.workload.area_breakdowns).toHaveLength(2);
    expect(result.workload.area_breakdowns[0].area_name).toBe('Lobby');
    expect(result.workload.area_breakdowns[1].area_name).toBe('Restrooms');
  });

  it('propagates specialization through the pipeline', () => {
    const snapshot = makeSnapshot({
      specialization: {
        type: 'DISINFECTING',
        inputs: {
          method: 'ELECTROSTATIC',
          density: 'HIGH',
          active_cases_nearby: true,
          waiver_signed: true,
          ppe_included: true,
        },
      },
    });

    const result = calculateBid(snapshot);
    // Disinfecting should add extra minutes/costs
    expect(result.workload.total_minutes_per_visit).toBeGreaterThan(0);
    expect(result.pricing.recommended_price).toBeGreaterThan(0);
  });

  it('uses COST_PLUS pricing correctly (price > cost by markup %)', () => {
    const snapshot = makeSnapshot({
      pricing_strategy: { method: 'COST_PLUS', cost_plus_pct: 25 },
    });

    const result = calculateBid(snapshot);
    // Cost plus 25%: price = cost × 1.25
    const expectedPrice = result.pricing.total_monthly_cost * 1.25;
    expect(result.pricing.recommended_price).toBeCloseTo(expectedPrice, 0);
  });

  it('uses TARGET_MARGIN pricing correctly', () => {
    const snapshot = makeSnapshot({
      pricing_strategy: { method: 'TARGET_MARGIN', target_margin_pct: 30 },
    });

    const result = calculateBid(snapshot);
    // Target margin 30%: price = cost / (1 - 0.30) = cost / 0.70
    const expectedPrice = result.pricing.total_monthly_cost / 0.70;
    expect(result.pricing.recommended_price).toBeCloseTo(expectedPrice, 0);
  });
});
