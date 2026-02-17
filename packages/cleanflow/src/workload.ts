/**
 * Workload calculation — minutes → hours → cleaners needed.
 * Milestone E stub: implements the full algorithm from docs/09_CLEANFLOW_ENGINE.md.
 *
 * Frequency-aware: each task's weekly contribution is weighted by its
 * frequency_code (e.g. DAILY = 5x/week, WEEKLY = 1x/week).
 *
 * Guardrails: per-area per-visit minutes are clamped to [15, 480].
 */
import type { BidVersionSnapshot, WorkloadResult } from './types';
import { findProductionRate } from './production-rates';
import { calculateSpecialization } from './specialization';
import { DIFFICULTY_MULTIPLIERS, WEEKS_PER_MONTH, FREQUENCY_VISITS_PER_WEEK, SCOPE_DIFFICULTY_MODIFIERS } from '@gleamops/shared';

/** Min/max minutes per visit per area */
const MIN_AREA_MINUTES = 15;
const MAX_AREA_MINUTES = 480;

export function calculateWorkload(snapshot: BidVersionSnapshot): WorkloadResult {
  const areaBreakdowns: WorkloadResult['area_breakdowns'] = [];
  const warnings: string[] = [];
  let totalMinutesPerVisit = 0;
  let totalWeeklyMinutes = 0;

  for (const area of snapshot.areas) {
    const taskBreakdowns: WorkloadResult['area_breakdowns'][number]['task_breakdowns'] = [];
    let areaMinutesPerVisit = 0;
    let areaWeeklyMinutes = 0;

    for (const task of area.tasks) {
      let minutesPerVisit: number;
      let source: 'custom' | 'calculated';

      if (task.custom_minutes != null) {
        minutesPerVisit = task.custom_minutes * area.quantity;
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
          minutesPerVisit = (area.square_footage / 1000) * rate.base_minutes;
        } else {
          // EACH — use fixtures count
          const count = area.fixtures?.[task.task_code] ?? 0;
          minutesPerVisit = count * rate.base_minutes;
        }

        // Apply difficulty multiplier
        const difficulty = DIFFICULTY_MULTIPLIERS[area.difficulty_code] ?? 1.0;
        minutesPerVisit *= difficulty;

        // Apply stacking scope difficulty modifiers (HT, ELEC, ACC, etc.)
        if (area.modifier_codes && area.modifier_codes.length > 0) {
          for (const code of area.modifier_codes) {
            const mod = SCOPE_DIFFICULTY_MODIFIERS.find((m) => m.code === code);
            if (mod) {
              minutesPerVisit *= mod.factor;
            }
          }
        }

        // Apply AI adjustment if enabled
        if (task.use_ai) {
          minutesPerVisit *= (1 + rate.default_ml_adjustment);
        }

        // Apply quantity
        minutesPerVisit *= area.quantity;
        source = 'calculated';
      }

      // Frequency factor: how many times per week this task runs
      const frequencyFactor = FREQUENCY_VISITS_PER_WEEK[task.frequency_code] ?? 0;
      const taskWeeklyMinutes = minutesPerVisit * frequencyFactor;

      taskBreakdowns.push({
        task_code: task.task_code,
        minutes: minutesPerVisit,
        frequency_factor: frequencyFactor,
        source,
      });

      areaMinutesPerVisit += minutesPerVisit;
      areaWeeklyMinutes += taskWeeklyMinutes;
    }

    // Guardrails: clamp area minutes per visit
    let clampedMinutesPerVisit = areaMinutesPerVisit;
    if (areaMinutesPerVisit > 0 && areaMinutesPerVisit < MIN_AREA_MINUTES) {
      warnings.push(`"${area.name}" clamped from ${areaMinutesPerVisit.toFixed(1)} to minimum ${MIN_AREA_MINUTES} min/visit`);
      clampedMinutesPerVisit = MIN_AREA_MINUTES;
      // Scale weekly minutes proportionally
      if (areaMinutesPerVisit > 0) {
        areaWeeklyMinutes *= (MIN_AREA_MINUTES / areaMinutesPerVisit);
      }
    } else if (areaMinutesPerVisit > MAX_AREA_MINUTES) {
      warnings.push(`"${area.name}" clamped from ${areaMinutesPerVisit.toFixed(0)} to maximum ${MAX_AREA_MINUTES} min/visit`);
      clampedMinutesPerVisit = MAX_AREA_MINUTES;
      areaWeeklyMinutes *= (MAX_AREA_MINUTES / areaMinutesPerVisit);
    }

    areaBreakdowns.push({
      area_id: area.area_id,
      area_name: area.name,
      minutes_per_visit: clampedMinutesPerVisit,
      task_breakdowns: taskBreakdowns,
    });

    totalMinutesPerVisit += clampedMinutesPerVisit;
    totalWeeklyMinutes += areaWeeklyMinutes;
  }

  // Apply bid-type specialization adjustments (extra minutes per visit)
  let specExtraMinutes = 0;
  if (snapshot.specialization && snapshot.specialization.type !== 'JANITORIAL') {
    const totalSqft = snapshot.areas.reduce((s, a) => s + a.square_footage * a.quantity, 0);
    const specResult = calculateSpecialization(snapshot.specialization, totalSqft);
    specExtraMinutes = specResult.extra_minutes_per_visit;
    totalMinutesPerVisit += specExtraMinutes;
    // Add spec minutes to weekly (using schedule days_per_week as frequency)
    totalWeeklyMinutes += specExtraMinutes * snapshot.schedule.days_per_week;

    if (specResult.workload_multiplier !== 1.0) {
      totalMinutesPerVisit *= specResult.workload_multiplier;
      totalWeeklyMinutes *= specResult.workload_multiplier;
    }

    if (specExtraMinutes > 0) {
      warnings.push(`${snapshot.specialization.type} specialization adds ${specExtraMinutes.toFixed(0)} min/visit`);
    }
  }

  const monthlyMinutes = totalWeeklyMinutes * WEEKS_PER_MONTH;
  const monthlyHours = monthlyMinutes / 60;
  const hoursPerVisit = totalMinutesPerVisit / 60;

  const { schedule } = snapshot;
  const cleanersNeeded = Math.ceil(hoursPerVisit / schedule.hours_per_shift);
  const leadNeeded = schedule.lead_required || cleanersNeeded >= 3;

  return {
    total_minutes_per_visit: totalMinutesPerVisit,
    weekly_minutes: totalWeeklyMinutes,
    monthly_minutes: monthlyMinutes,
    monthly_hours: monthlyHours,
    hours_per_visit: hoursPerVisit,
    cleaners_needed: cleanersNeeded,
    lead_needed: leadNeeded,
    warnings,
    area_breakdowns: areaBreakdowns,
  };
}
