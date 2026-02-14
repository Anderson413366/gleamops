/**
 * Weighted Average Wage Calculator.
 *
 * Computes the blended hourly rate from a crew roster.
 * Each crew member's contribution is weighted by their weekly hours.
 */
import type { CrewMember, WeightedWageResult } from './types';

/**
 * Calculate the weighted average wage from a crew roster.
 * Formula: sum(rate_i * hours_i) / sum(hours_i)
 *
 * @param crew - Array of crew members with rate and weekly hours
 * @returns WeightedWageResult with the blended rate
 */
export function calculateWeightedWage(crew: CrewMember[]): WeightedWageResult {
  if (crew.length === 0) {
    return { weighted_avg_rate: 0, total_weekly_hours: 0, crew_members: [] };
  }

  const totalWeightedCost = crew.reduce(
    (sum, m) => sum + m.hourly_rate * m.weekly_hours, 0
  );
  const totalWeeklyHours = crew.reduce(
    (sum, m) => sum + m.weekly_hours, 0
  );

  const weightedAvgRate = totalWeeklyHours > 0
    ? totalWeightedCost / totalWeeklyHours
    : 0;

  return {
    weighted_avg_rate: Math.round(weightedAvgRate * 100) / 100,
    total_weekly_hours: totalWeeklyHours,
    crew_members: crew,
  };
}
