/**
 * Day Porter add-on calculator.
 *
 * Computes the monthly labor cost for a day porter presence.
 * This is additive to the base cleaning bid.
 */
import type { DayPorterConfig, DayPorterResult } from './types';
import { WEEKS_PER_MONTH } from '@gleamops/shared';

/**
 * Calculate day porter monthly hours and cost.
 *
 * @param config - Day porter configuration
 * @returns Monthly hours and cost
 */
export function calculateDayPorter(config: DayPorterConfig): DayPorterResult {
  if (!config.enabled || config.days_per_week <= 0 || config.hours_per_day <= 0) {
    return { monthly_hours: 0, monthly_cost: 0 };
  }

  const weeklyHours = config.days_per_week * config.hours_per_day;
  const monthlyHours = weeklyHours * WEEKS_PER_MONTH;
  const monthlyCost = monthlyHours * config.hourly_rate;

  return {
    monthly_hours: Math.round(monthlyHours * 100) / 100,
    monthly_cost: Math.round(monthlyCost * 100) / 100,
  };
}
