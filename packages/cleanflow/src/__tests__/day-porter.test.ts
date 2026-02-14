import { describe, it, expect } from 'vitest';
import { calculateDayPorter } from '../day-porter';
import type { DayPorterConfig } from '../types';
import { WEEKS_PER_MONTH } from '@gleamops/shared';

describe('calculateDayPorter', () => {
  it('returns zero when disabled', () => {
    const config: DayPorterConfig = {
      enabled: false,
      days_per_week: 5,
      hours_per_day: 8,
      hourly_rate: 16,
    };
    const result = calculateDayPorter(config);
    expect(result.monthly_hours).toBe(0);
    expect(result.monthly_cost).toBe(0);
  });

  it('returns zero when days_per_week is 0', () => {
    const config: DayPorterConfig = {
      enabled: true,
      days_per_week: 0,
      hours_per_day: 8,
      hourly_rate: 16,
    };
    const result = calculateDayPorter(config);
    expect(result.monthly_hours).toBe(0);
    expect(result.monthly_cost).toBe(0);
  });

  it('returns zero when hours_per_day is 0', () => {
    const config: DayPorterConfig = {
      enabled: true,
      days_per_week: 5,
      hours_per_day: 0,
      hourly_rate: 16,
    };
    const result = calculateDayPorter(config);
    expect(result.monthly_hours).toBe(0);
    expect(result.monthly_cost).toBe(0);
  });

  it('calculates 5 days × 8 hours × 4.33 weeks', () => {
    const config: DayPorterConfig = {
      enabled: true,
      days_per_week: 5,
      hours_per_day: 8,
      hourly_rate: 16,
    };
    const result = calculateDayPorter(config);

    const expectedHours = 5 * 8 * WEEKS_PER_MONTH; // 173.2
    const expectedCost = expectedHours * 16; // 2771.2

    expect(result.monthly_hours).toBeCloseTo(expectedHours, 1);
    expect(result.monthly_cost).toBeCloseTo(expectedCost, 1);
  });

  it('handles part-time schedule (3 days × 4 hours)', () => {
    const config: DayPorterConfig = {
      enabled: true,
      days_per_week: 3,
      hours_per_day: 4,
      hourly_rate: 20,
    };
    const result = calculateDayPorter(config);

    const expectedHours = 3 * 4 * WEEKS_PER_MONTH; // 51.96
    const expectedCost = expectedHours * 20; // 1039.2

    expect(result.monthly_hours).toBeCloseTo(expectedHours, 1);
    expect(result.monthly_cost).toBeCloseTo(expectedCost, 1);
  });

  it('rounds to 2 decimal places', () => {
    const config: DayPorterConfig = {
      enabled: true,
      days_per_week: 3,
      hours_per_day: 7,
      hourly_rate: 17.50,
    };
    const result = calculateDayPorter(config);

    // Verify rounding to 2 decimals
    const hoursStr = result.monthly_hours.toString();
    const costStr = result.monthly_cost.toString();
    const hoursDecimals = hoursStr.includes('.') ? hoursStr.split('.')[1].length : 0;
    const costDecimals = costStr.includes('.') ? costStr.split('.')[1].length : 0;
    expect(hoursDecimals).toBeLessThanOrEqual(2);
    expect(costDecimals).toBeLessThanOrEqual(2);
  });
});
