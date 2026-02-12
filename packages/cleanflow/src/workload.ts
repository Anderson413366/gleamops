/**
 * Workload calculation — minutes → hours → cleaners needed.
 * Milestone E stub: implements the full algorithm from docs/09_CLEANFLOW_ENGINE.md.
 */
import type { BidVersionSnapshot, WorkloadResult } from './types';
import { findProductionRate } from './production-rates';
import { DIFFICULTY_MULTIPLIERS, WEEKS_PER_MONTH } from '@gleamops/shared';

export function calculateWorkload(snapshot: BidVersionSnapshot): WorkloadResult {
  const areaBreakdowns: WorkloadResult['area_breakdowns'] = [];
  let totalMinutesPerVisit = 0;

  for (const area of snapshot.areas) {
    const taskBreakdowns: WorkloadResult['area_breakdowns'][number]['task_breakdowns'] = [];
    let areaMinutes = 0;

    for (const task of area.tasks) {
      let minutes: number;
      let source: 'custom' | 'calculated';

      if (task.custom_minutes != null) {
        minutes = task.custom_minutes * area.quantity;
        source = 'custom';
      } else {
        const rate = findProductionRate(
          task.task_code,
          area.floor_type_code,
          area.building_type_code,
          snapshot.production_rates
        );

        if (!rate) {
          throw new Error(`BID_003: No production rate found for task ${task.task_code}`);
        }

        if (rate.unit_code === 'SQFT_1000') {
          minutes = (area.square_footage / 1000) * rate.base_minutes;
        } else {
          // EACH — use fixtures count
          const count = area.fixtures?.[task.task_code] ?? 0;
          minutes = count * rate.base_minutes;
        }

        // Apply difficulty multiplier
        const difficulty = DIFFICULTY_MULTIPLIERS[area.difficulty_code] ?? 1.0;
        minutes *= difficulty;

        // Apply AI adjustment if enabled
        if (task.use_ai) {
          minutes *= (1 + rate.default_ml_adjustment);
        }

        // Apply quantity
        minutes *= area.quantity;
        source = 'calculated';
      }

      taskBreakdowns.push({ task_code: task.task_code, minutes, source });
      areaMinutes += minutes;
    }

    areaBreakdowns.push({
      area_id: area.area_id,
      area_name: area.name,
      minutes_per_visit: areaMinutes,
      task_breakdowns: taskBreakdowns,
    });

    totalMinutesPerVisit += areaMinutes;
  }

  const { schedule } = snapshot;
  const weeklyMinutes = totalMinutesPerVisit * schedule.days_per_week * (schedule.visits_per_day || 1);
  const monthlyMinutes = weeklyMinutes * WEEKS_PER_MONTH;
  const monthlyHours = monthlyMinutes / 60;
  const hoursPerVisit = totalMinutesPerVisit / 60;

  const cleanersNeeded = Math.ceil(hoursPerVisit / schedule.hours_per_shift);
  const leadNeeded = schedule.lead_required || cleanersNeeded >= 3;

  return {
    total_minutes_per_visit: totalMinutesPerVisit,
    weekly_minutes: weeklyMinutes,
    monthly_minutes: monthlyMinutes,
    monthly_hours: monthlyHours,
    hours_per_visit: hoursPerVisit,
    cleaners_needed: cleanersNeeded,
    lead_needed: leadNeeded,
    area_breakdowns: areaBreakdowns,
  };
}
