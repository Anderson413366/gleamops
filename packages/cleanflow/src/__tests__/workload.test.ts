import { describe, it, expect } from 'vitest';
import { calculateWorkload } from '../workload';
import type { BidVersionSnapshot } from '../types';
import { WEEKS_PER_MONTH } from '@gleamops/shared';

// ---------------------------------------------------------------------------
// Helpers — build a minimal valid snapshot
// ---------------------------------------------------------------------------
function makeSnapshot(overrides: Partial<BidVersionSnapshot> = {}): BidVersionSnapshot {
  return {
    bid_version_id: 'test-bid-1',
    service_code: null,
    schedule: {
      days_per_week: 5,
      visits_per_day: 1,
      hours_per_shift: 4,
      lead_required: false,
      supervisor_hours_week: 0,
    },
    labor_rates: { cleaner_rate: 18, lead_rate: 22, supervisor_rate: 28 },
    burden: { employer_tax_pct: 8, workers_comp_pct: 5, insurance_pct: 3, other_pct: 2 },
    overhead: { monthly_overhead_allocated: 200 },
    supplies: { allowance_per_sqft_monthly: 0.01, consumables_monthly: 50 },
    equipment: [],
    areas: [],
    production_rates: [],
    pricing_strategy: { method: 'COST_PLUS', cost_plus_pct: 20 },
    ...overrides,
  };
}

function makeArea(overrides: Partial<BidVersionSnapshot['areas'][number]> = {}) {
  return {
    area_id: 'area-1',
    name: 'Main Office',
    area_type_code: 'OFFICE',
    floor_type_code: 'CARPET',
    building_type_code: 'OFFICE',
    difficulty_code: 'STANDARD' as const,
    square_footage: 5000,
    quantity: 1,
    tasks: [],
    ...overrides,
  };
}

function makeRate(overrides: Partial<BidVersionSnapshot['production_rates'][number]> = {}) {
  return {
    task_code: 'VACUUM',
    floor_type_code: null,
    building_type_code: null,
    unit_code: 'SQFT_1000' as const,
    base_minutes: 20,
    default_ml_adjustment: 0,
    is_active: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('calculateWorkload', () => {
  it('returns zero values for empty areas', () => {
    const result = calculateWorkload(makeSnapshot({ areas: [] }));
    expect(result.total_minutes_per_visit).toBe(0);
    expect(result.monthly_hours).toBe(0);
    expect(result.cleaners_needed).toBe(0);
    expect(result.area_breakdowns).toHaveLength(0);
  });

  it('calculates basic JANITORIAL area (SQFT_1000 unit)', () => {
    const snapshot = makeSnapshot({
      areas: [
        makeArea({
          square_footage: 5000,
          tasks: [{ task_code: 'VACUUM', frequency_code: 'DAILY', custom_minutes: null }],
        }),
      ],
      production_rates: [makeRate({ task_code: 'VACUUM', base_minutes: 20, unit_code: 'SQFT_1000' })],
    });

    const result = calculateWorkload(snapshot);
    // 5000 sqft / 1000 = 5 units × 20 min = 100 min/visit
    expect(result.total_minutes_per_visit).toBe(100);
    // DAILY = 5x/week → 100 * 5 = 500 weekly min
    expect(result.weekly_minutes).toBe(500);
    // Monthly = 500 * 4.33
    expect(result.monthly_minutes).toBeCloseTo(500 * WEEKS_PER_MONTH, 1);
  });

  it('applies difficulty multiplier EASY = 0.85', () => {
    const snapshot = makeSnapshot({
      areas: [
        makeArea({
          difficulty_code: 'EASY',
          square_footage: 10000,
          tasks: [{ task_code: 'VACUUM', frequency_code: 'DAILY', custom_minutes: null }],
        }),
      ],
      production_rates: [makeRate({ task_code: 'VACUUM', base_minutes: 20 })],
    });

    const result = calculateWorkload(snapshot);
    // 10000/1000 * 20 = 200, × 0.85 = 170
    expect(result.total_minutes_per_visit).toBe(170);
  });

  it('applies difficulty multiplier DIFFICULT = 1.25', () => {
    const snapshot = makeSnapshot({
      areas: [
        makeArea({
          difficulty_code: 'DIFFICULT',
          square_footage: 10000,
          tasks: [{ task_code: 'VACUUM', frequency_code: 'WEEKLY', custom_minutes: null }],
        }),
      ],
      production_rates: [makeRate({ task_code: 'VACUUM', base_minutes: 20 })],
    });

    const result = calculateWorkload(snapshot);
    // 10000/1000 * 20 = 200, × 1.25 = 250
    expect(result.total_minutes_per_visit).toBe(250);
    // WEEKLY = 1x/week → 250 * 1 = 250 weekly min
    expect(result.weekly_minutes).toBe(250);
  });

  it('respects frequency weighting (WEEKLY vs DAILY)', () => {
    const snapshot = makeSnapshot({
      areas: [
        makeArea({
          square_footage: 1000,
          tasks: [
            { task_code: 'VACUUM', frequency_code: 'DAILY', custom_minutes: null },
            { task_code: 'MOP', frequency_code: 'WEEKLY', custom_minutes: null },
          ],
        }),
      ],
      production_rates: [
        makeRate({ task_code: 'VACUUM', base_minutes: 20 }),
        makeRate({ task_code: 'MOP', base_minutes: 10 }),
      ],
    });

    const result = calculateWorkload(snapshot);
    // VACUUM: 1000/1000 * 20 = 20 min/visit
    // MOP: 1000/1000 * 10 = 10 min/visit
    // total per visit = 30
    expect(result.total_minutes_per_visit).toBe(30);
    // Weekly: VACUUM 20*5 = 100, MOP 10*1 = 10 → 110
    expect(result.weekly_minutes).toBe(110);
  });

  it('uses MONTHLY frequency (0.23x/week)', () => {
    const snapshot = makeSnapshot({
      areas: [
        makeArea({
          square_footage: 10000,
          tasks: [{ task_code: 'STRIP_WAX', frequency_code: 'MONTHLY', custom_minutes: null }],
        }),
      ],
      production_rates: [makeRate({ task_code: 'STRIP_WAX', base_minutes: 40 })],
    });

    const result = calculateWorkload(snapshot);
    // 10000/1000 * 40 = 400 min/visit
    expect(result.total_minutes_per_visit).toBe(400);
    // MONTHLY = 0.23x/week → 400 * 0.23 = 92
    expect(result.weekly_minutes).toBeCloseTo(92, 0);
  });

  it('clamps area minutes to minimum 15', () => {
    const snapshot = makeSnapshot({
      areas: [
        makeArea({
          square_footage: 100,
          tasks: [{ task_code: 'DUST', frequency_code: 'DAILY', custom_minutes: null }],
        }),
      ],
      production_rates: [makeRate({ task_code: 'DUST', base_minutes: 5 })],
    });

    const result = calculateWorkload(snapshot);
    // 100/1000 * 5 = 0.5 → clamped to 15
    expect(result.total_minutes_per_visit).toBe(15);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some(w => w.includes('clamped'))).toBe(true);
  });

  it('clamps area minutes to maximum 480', () => {
    const snapshot = makeSnapshot({
      areas: [
        makeArea({
          square_footage: 100000,
          tasks: [{ task_code: 'VACUUM', frequency_code: 'DAILY', custom_minutes: null }],
        }),
      ],
      production_rates: [makeRate({ task_code: 'VACUUM', base_minutes: 20 })],
    });

    const result = calculateWorkload(snapshot);
    // 100000/1000 * 20 = 2000 → clamped to 480
    expect(result.total_minutes_per_visit).toBe(480);
    expect(result.warnings.some(w => w.includes('maximum'))).toBe(true);
  });

  it('custom_minutes bypasses production rate lookup', () => {
    const snapshot = makeSnapshot({
      areas: [
        makeArea({
          square_footage: 5000,
          tasks: [{ task_code: 'SPECIAL', frequency_code: 'DAILY', custom_minutes: 45 }],
        }),
      ],
      production_rates: [], // no rates needed
    });

    const result = calculateWorkload(snapshot);
    // custom_minutes = 45 × quantity(1) = 45
    expect(result.total_minutes_per_visit).toBe(45);
    expect(result.area_breakdowns[0].task_breakdowns[0].source).toBe('custom');
  });

  it('calculates cleaners_needed = ceil(hoursPerVisit / hoursPerShift)', () => {
    const snapshot = makeSnapshot({
      schedule: {
        days_per_week: 5,
        visits_per_day: 1,
        hours_per_shift: 4,
        lead_required: false,
        supervisor_hours_week: 0,
      },
      areas: [
        makeArea({
          square_footage: 30000,
          tasks: [{ task_code: 'VACUUM', frequency_code: 'DAILY', custom_minutes: null }],
        }),
      ],
      production_rates: [makeRate({ task_code: 'VACUUM', base_minutes: 20 })],
    });

    const result = calculateWorkload(snapshot);
    // 30000/1000 * 20 = 600 → clamped to 480 min = 8 hours
    // cleaners = ceil(8 / 4) = 2
    expect(result.cleaners_needed).toBe(2);
  });

  it('sets lead_needed when cleaners_needed >= 3', () => {
    const snapshot = makeSnapshot({
      schedule: {
        days_per_week: 5,
        visits_per_day: 1,
        hours_per_shift: 2,
        lead_required: false,
        supervisor_hours_week: 0,
      },
      areas: [
        makeArea({
          square_footage: 20000,
          tasks: [{ task_code: 'VACUUM', frequency_code: 'DAILY', custom_minutes: null }],
        }),
      ],
      production_rates: [makeRate({ task_code: 'VACUUM', base_minutes: 20 })],
    });

    const result = calculateWorkload(snapshot);
    // 20000/1000 * 20 = 400 min = 6.67 hours
    // cleaners = ceil(6.67 / 2) = 4 → lead_needed = true
    expect(result.cleaners_needed).toBe(4);
    expect(result.lead_needed).toBe(true);
  });

  it('sets lead_needed when schedule.lead_required is true', () => {
    const snapshot = makeSnapshot({
      schedule: {
        days_per_week: 5,
        visits_per_day: 1,
        hours_per_shift: 8,
        lead_required: true,
        supervisor_hours_week: 4,
      },
      areas: [
        makeArea({
          square_footage: 2000,
          tasks: [{ task_code: 'VACUUM', frequency_code: 'DAILY', custom_minutes: null }],
        }),
      ],
      production_rates: [makeRate({ task_code: 'VACUUM', base_minutes: 20 })],
    });

    const result = calculateWorkload(snapshot);
    // Even with 1 cleaner, lead_required in schedule → lead_needed
    expect(result.lead_needed).toBe(true);
  });

  it('applies area quantity multiplier', () => {
    const snapshot = makeSnapshot({
      areas: [
        makeArea({
          square_footage: 1000,
          quantity: 3,
          tasks: [{ task_code: 'VACUUM', frequency_code: 'DAILY', custom_minutes: null }],
        }),
      ],
      production_rates: [makeRate({ task_code: 'VACUUM', base_minutes: 20 })],
    });

    const result = calculateWorkload(snapshot);
    // 1000/1000 * 20 * quantity(3) = 60
    expect(result.total_minutes_per_visit).toBe(60);
  });

  it('throws BID_003 when no production rate found', () => {
    const snapshot = makeSnapshot({
      areas: [
        makeArea({
          tasks: [{ task_code: 'NONEXISTENT', frequency_code: 'DAILY', custom_minutes: null }],
        }),
      ],
      production_rates: [], // empty
    });

    expect(() => calculateWorkload(snapshot)).toThrow('BID_003');
  });
});
