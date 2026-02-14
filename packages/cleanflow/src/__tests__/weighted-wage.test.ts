import { describe, it, expect } from 'vitest';
import { calculateWeightedWage } from '../weighted-wage';
import type { CrewMember } from '../types';

describe('calculateWeightedWage', () => {
  it('returns 0 for empty crew', () => {
    const result = calculateWeightedWage([]);
    expect(result.weighted_avg_rate).toBe(0);
    expect(result.total_weekly_hours).toBe(0);
    expect(result.crew_members).toHaveLength(0);
  });

  it('returns the single member rate for crew of one', () => {
    const crew: CrewMember[] = [
      { role: 'cleaner', hourly_rate: 18, weekly_hours: 40 },
    ];
    const result = calculateWeightedWage(crew);
    expect(result.weighted_avg_rate).toBe(18);
    expect(result.total_weekly_hours).toBe(40);
  });

  it('calculates weighted average of 3 members with different rates/hours', () => {
    const crew: CrewMember[] = [
      { role: 'cleaner', hourly_rate: 15, weekly_hours: 40 },
      { role: 'cleaner', hourly_rate: 18, weekly_hours: 30 },
      { role: 'lead', hourly_rate: 22, weekly_hours: 10 },
    ];

    const result = calculateWeightedWage(crew);
    // Weighted = (15*40 + 18*30 + 22*10) / (40+30+10)
    //          = (600 + 540 + 220) / 80
    //          = 1360 / 80 = 17.0
    expect(result.weighted_avg_rate).toBe(17);
    expect(result.total_weekly_hours).toBe(80);
    expect(result.crew_members).toHaveLength(3);
  });

  it('rounds to 2 decimal places', () => {
    const crew: CrewMember[] = [
      { role: 'cleaner', hourly_rate: 15, weekly_hours: 20 },
      { role: 'cleaner', hourly_rate: 18, weekly_hours: 10 },
    ];

    const result = calculateWeightedWage(crew);
    // (15*20 + 18*10) / 30 = (300 + 180) / 30 = 16.0
    expect(result.weighted_avg_rate).toBe(16);
    // Test with rates that produce decimals
    const crew2: CrewMember[] = [
      { role: 'cleaner', hourly_rate: 15.75, weekly_hours: 20 },
      { role: 'cleaner', hourly_rate: 18.25, weekly_hours: 10 },
    ];
    const result2 = calculateWeightedWage(crew2);
    // (15.75*20 + 18.25*10) / 30 = (315 + 182.5) / 30 = 16.5833...
    expect(result2.weighted_avg_rate).toBe(16.58);
  });

  it('handles members with 0 weekly hours', () => {
    const crew: CrewMember[] = [
      { role: 'cleaner', hourly_rate: 18, weekly_hours: 0 },
    ];
    const result = calculateWeightedWage(crew);
    expect(result.weighted_avg_rate).toBe(0);
    expect(result.total_weekly_hours).toBe(0);
  });
});
