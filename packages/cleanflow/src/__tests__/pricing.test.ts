import { describe, it, expect } from 'vitest';
import { calculatePricing } from '../pricing';
import type { BidVersionSnapshot, WorkloadResult } from '../types';
import { WEEKS_PER_MONTH } from '@gleamops/shared';

// ---------------------------------------------------------------------------
// Helpers
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
      supervisor_hours_week: 4,
    },
    labor_rates: { cleaner_rate: 18, lead_rate: 22, supervisor_rate: 28 },
    burden: { employer_tax_pct: 8, workers_comp_pct: 5, insurance_pct: 3, other_pct: 2 },
    overhead: { monthly_overhead_allocated: 200 },
    supplies: { allowance_per_sqft_monthly: 0.01, consumables_monthly: 50 },
    equipment: [],
    areas: [
      {
        area_id: 'a1',
        name: 'Main',
        area_type_code: 'OFFICE',
        floor_type_code: 'CARPET',
        building_type_code: 'OFFICE',
        difficulty_code: 'STANDARD',
        square_footage: 5000,
        quantity: 1,
        tasks: [],
      },
    ],
    production_rates: [],
    pricing_strategy: { method: 'COST_PLUS', cost_plus_pct: 20 },
    ...overrides,
  };
}

function makeWorkload(overrides: Partial<WorkloadResult> = {}): WorkloadResult {
  return {
    total_minutes_per_visit: 120,
    weekly_minutes: 600,
    monthly_minutes: 600 * WEEKS_PER_MONTH,
    monthly_hours: (600 * WEEKS_PER_MONTH) / 60,
    hours_per_visit: 2,
    cleaners_needed: 1,
    lead_needed: false,
    warnings: [],
    area_breakdowns: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('calculatePricing', () => {
  describe('burden calculation', () => {
    it('applies burden multiplier: raw labor × (1 + sum(burden_pcts) / 100)', () => {
      const snapshot = makeSnapshot({
        burden: { employer_tax_pct: 8, workers_comp_pct: 5, insurance_pct: 3, other_pct: 4 },
      });
      const workload = makeWorkload({ monthly_hours: 100, lead_needed: false });

      const result = calculatePricing(snapshot, workload);
      // burden = 1 + (8+5+3+4)/100 = 1.20
      // labor = 100 * 18 = 1800
      // burdened = 1800 * 1.20 = 2160
      expect(result.explanation.burden_multiplier).toBe(1.20);
      expect(result.burdened_labor_cost).toBeCloseTo(2160, 0);
    });
  });

  describe('COST_PLUS method', () => {
    it('applies cost_plus_pct to total cost', () => {
      const snapshot = makeSnapshot({
        pricing_strategy: { method: 'COST_PLUS', cost_plus_pct: 25 },
        equipment: [],
        overhead: { monthly_overhead_allocated: 0 },
        supplies: { allowance_per_sqft_monthly: 0, consumables_monthly: 0 },
        burden: { employer_tax_pct: 0, workers_comp_pct: 0, insurance_pct: 0, other_pct: 0 },
      });
      const workload = makeWorkload({ monthly_hours: 100, lead_needed: false });

      const result = calculatePricing(snapshot, workload);
      // labor = 100 * 18 = 1800 (no burden = 1.0)
      // total cost = 1800
      // recommended = 1800 * 1.25 = 2250
      expect(result.total_monthly_cost).toBe(1800);
      expect(result.recommended_price).toBeCloseTo(2250, 0);
    });

    it('defaults cost_plus_pct to 20 if not provided', () => {
      const snapshot = makeSnapshot({
        pricing_strategy: { method: 'COST_PLUS' },
        equipment: [],
        overhead: { monthly_overhead_allocated: 0 },
        supplies: { allowance_per_sqft_monthly: 0, consumables_monthly: 0 },
        burden: { employer_tax_pct: 0, workers_comp_pct: 0, insurance_pct: 0, other_pct: 0 },
      });
      const workload = makeWorkload({ monthly_hours: 100, lead_needed: false });

      const result = calculatePricing(snapshot, workload);
      // recommended = 1800 * 1.20 = 2160
      expect(result.recommended_price).toBeCloseTo(2160, 0);
    });
  });

  describe('TARGET_MARGIN method', () => {
    it('calculates price as cost / (1 - margin%)', () => {
      const snapshot = makeSnapshot({
        pricing_strategy: { method: 'TARGET_MARGIN', target_margin_pct: 25 },
        equipment: [],
        overhead: { monthly_overhead_allocated: 0 },
        supplies: { allowance_per_sqft_monthly: 0, consumables_monthly: 0 },
        burden: { employer_tax_pct: 0, workers_comp_pct: 0, insurance_pct: 0, other_pct: 0 },
      });
      const workload = makeWorkload({ monthly_hours: 100, lead_needed: false });

      const result = calculatePricing(snapshot, workload);
      // cost = 1800, price = 1800 / (1 - 0.25) = 2400
      expect(result.recommended_price).toBeCloseTo(2400, 0);
    });
  });

  describe('MARKET_RATE method', () => {
    it('uses market_price_monthly directly', () => {
      const snapshot = makeSnapshot({
        pricing_strategy: { method: 'MARKET_RATE', market_price_monthly: 3000 },
      });
      const workload = makeWorkload({ monthly_hours: 100, lead_needed: false });

      const result = calculatePricing(snapshot, workload);
      expect(result.recommended_price).toBe(3000);
    });

    it('falls back to total cost if market_price_monthly not provided', () => {
      const snapshot = makeSnapshot({
        pricing_strategy: { method: 'MARKET_RATE' },
        equipment: [],
        overhead: { monthly_overhead_allocated: 0 },
        supplies: { allowance_per_sqft_monthly: 0, consumables_monthly: 0 },
        burden: { employer_tax_pct: 0, workers_comp_pct: 0, insurance_pct: 0, other_pct: 0 },
      });
      const workload = makeWorkload({ monthly_hours: 100, lead_needed: false });

      const result = calculatePricing(snapshot, workload);
      expect(result.recommended_price).toBe(result.total_monthly_cost);
    });
  });

  describe('HYBRID method', () => {
    it('clamps target margin within 10% of market price', () => {
      const snapshot = makeSnapshot({
        pricing_strategy: {
          method: 'HYBRID',
          target_margin_pct: 25,
          market_price_monthly: 3000,
        },
        equipment: [],
        overhead: { monthly_overhead_allocated: 0 },
        supplies: { allowance_per_sqft_monthly: 0, consumables_monthly: 0 },
        burden: { employer_tax_pct: 0, workers_comp_pct: 0, insurance_pct: 0, other_pct: 0 },
      });
      const workload = makeWorkload({ monthly_hours: 100, lead_needed: false });

      const result = calculatePricing(snapshot, workload);
      // target = 1800 / 0.75 = 2400
      // market = 3000, bounds = [2700, 3300]
      // 2400 < 2700 → clamped to 2700
      expect(result.recommended_price).toBeCloseTo(2700, 0);
    });

    it('passes through when target is within market range', () => {
      const snapshot = makeSnapshot({
        pricing_strategy: {
          method: 'HYBRID',
          target_margin_pct: 25,
          market_price_monthly: 2400,
        },
        equipment: [],
        overhead: { monthly_overhead_allocated: 0 },
        supplies: { allowance_per_sqft_monthly: 0, consumables_monthly: 0 },
        burden: { employer_tax_pct: 0, workers_comp_pct: 0, insurance_pct: 0, other_pct: 0 },
      });
      const workload = makeWorkload({ monthly_hours: 100, lead_needed: false });

      const result = calculatePricing(snapshot, workload);
      // target = 1800 / 0.75 = 2400
      // market = 2400, bounds = [2160, 2640]
      // 2400 is within bounds → 2400
      expect(result.recommended_price).toBeCloseTo(2400, 0);
    });
  });

  describe('supplies calculation', () => {
    it('computes sqft × allowance + consumables_monthly', () => {
      const snapshot = makeSnapshot({
        areas: [{
          area_id: 'a1', name: 'Main', area_type_code: 'OFFICE',
          floor_type_code: 'CARPET', building_type_code: 'OFFICE',
          difficulty_code: 'STANDARD', square_footage: 10000, quantity: 1, tasks: [],
        }],
        supplies: { allowance_per_sqft_monthly: 0.02, consumables_monthly: 100 },
      });
      const workload = makeWorkload();

      const result = calculatePricing(snapshot, workload);
      // 10000 * 0.02 + 100 = 300
      expect(result.supplies_cost).toBeCloseTo(300, 0);
    });
  });

  describe('equipment depreciation', () => {
    it('sums monthly_depreciation from all equipment', () => {
      const snapshot = makeSnapshot({
        equipment: [
          { name: 'Floor Machine', monthly_depreciation: 50 },
          { name: 'Vacuum', monthly_depreciation: 25 },
          { name: 'Carpet Extractor', monthly_depreciation: 75 },
        ],
      });
      const workload = makeWorkload();

      const result = calculatePricing(snapshot, workload);
      expect(result.equipment_cost).toBe(150);
    });
  });

  describe('effective margin and price per sqft', () => {
    it('calculates effective_margin_pct correctly', () => {
      const snapshot = makeSnapshot({
        pricing_strategy: { method: 'COST_PLUS', cost_plus_pct: 25 },
        equipment: [],
        overhead: { monthly_overhead_allocated: 0 },
        supplies: { allowance_per_sqft_monthly: 0, consumables_monthly: 0 },
        burden: { employer_tax_pct: 0, workers_comp_pct: 0, insurance_pct: 0, other_pct: 0 },
      });
      const workload = makeWorkload({ monthly_hours: 100, lead_needed: false });

      const result = calculatePricing(snapshot, workload);
      // cost = 1800, price = 2250
      // margin = (2250 - 1800) / 2250 * 100 = 20%
      expect(result.effective_margin_pct).toBeCloseTo(20, 0);
    });

    it('calculates price_per_sqft', () => {
      const snapshot = makeSnapshot({
        areas: [{
          area_id: 'a1', name: 'Main', area_type_code: 'OFFICE',
          floor_type_code: 'CARPET', building_type_code: 'OFFICE',
          difficulty_code: 'STANDARD', square_footage: 5000, quantity: 1, tasks: [],
        }],
        pricing_strategy: { method: 'MARKET_RATE', market_price_monthly: 2500 },
      });
      const workload = makeWorkload();

      const result = calculatePricing(snapshot, workload);
      // price_per_sqft = 2500 / 5000 = 0.50
      expect(result.explanation.price_per_sqft).toBeCloseTo(0.5, 2);
    });

    it('returns null price_per_sqft when total sqft is 0', () => {
      const snapshot = makeSnapshot({
        areas: [{
          area_id: 'a1', name: 'Main', area_type_code: 'OFFICE',
          floor_type_code: 'CARPET', building_type_code: 'OFFICE',
          difficulty_code: 'STANDARD', square_footage: 0, quantity: 1, tasks: [],
        }],
      });
      const workload = makeWorkload();

      const result = calculatePricing(snapshot, workload);
      expect(result.explanation.price_per_sqft).toBeNull();
    });
  });

  describe('supervisor labor', () => {
    it('adds supervisor cost when lead_needed', () => {
      const snapshot = makeSnapshot({
        schedule: {
          days_per_week: 5,
          visits_per_day: 1,
          hours_per_shift: 4,
          lead_required: false,
          supervisor_hours_week: 10,
        },
        labor_rates: { cleaner_rate: 18, lead_rate: 22, supervisor_rate: 30 },
        burden: { employer_tax_pct: 0, workers_comp_pct: 0, insurance_pct: 0, other_pct: 0 },
        equipment: [],
        overhead: { monthly_overhead_allocated: 0 },
        supplies: { allowance_per_sqft_monthly: 0, consumables_monthly: 0 },
      });
      const workload = makeWorkload({ monthly_hours: 100, lead_needed: true });

      const result = calculatePricing(snapshot, workload);
      // cleaner labor = 100 * 18 = 1800
      // supervisor = 10 * 4.33 * 30 = 1299
      // total burdened = (1800 + 1299) * 1.0 = 3099
      expect(result.burdened_labor_cost).toBeCloseTo(1800 + 10 * WEEKS_PER_MONTH * 30, 0);
    });
  });
});
