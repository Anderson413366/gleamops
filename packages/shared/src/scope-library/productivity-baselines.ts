/**
 * Productivity baselines — sqft/hr ranges by space type.
 * Used as reference data in the Scope Library browser and
 * for sanity-checking bid workload calculations.
 */
import type { ProductivityBaseline } from './types';

export const PRODUCTIVITY_BASELINES: ProductivityBaseline[] = [
  {
    space_type: 'General Office',
    min_sqft_per_hour: 2500,
    max_sqft_per_hour: 4000,
    notes: 'Open plan with standard vacuuming, dusting, and trash pull.',
  },
  {
    space_type: 'Private Office',
    min_sqft_per_hour: 2000,
    max_sqft_per_hour: 3000,
    notes: 'More furniture to navigate; door-to-door time adds up.',
  },
  {
    space_type: 'Restroom',
    min_sqft_per_hour: 800,
    max_sqft_per_hour: 1500,
    notes: 'Fixture-intensive. Rate depends on fixture count and restock needs.',
  },
  {
    space_type: 'Healthcare (General)',
    min_sqft_per_hour: 1100,
    max_sqft_per_hour: 1800,
    notes: 'Includes terminal-level disinfection on high-touch surfaces.',
  },
  {
    space_type: 'Surgical Suite',
    min_sqft_per_hour: 400,
    max_sqft_per_hour: 1000,
    notes: 'Protocol-driven with documented turnover procedures.',
  },
  {
    space_type: 'Classroom',
    min_sqft_per_hour: 2500,
    max_sqft_per_hour: 3500,
    notes: 'Desks, whiteboards, floor care. Higher in summer when empty.',
  },
  {
    space_type: 'Hallway / Corridor',
    min_sqft_per_hour: 4000,
    max_sqft_per_hour: 6000,
    notes: 'Mostly floor care. Speed depends on floor type and obstacles.',
  },
  {
    space_type: 'Lobby / Reception',
    min_sqft_per_hour: 2000,
    max_sqft_per_hour: 3500,
    notes: 'Glass, hard floors, furniture, and high-visibility standards.',
  },
  {
    space_type: 'Industrial / Warehouse',
    min_sqft_per_hour: 10000,
    max_sqft_per_hour: 20000,
    notes: 'Ride-on scrubber rates. Manual areas much lower.',
  },
  {
    space_type: 'Break Room / Kitchen',
    min_sqft_per_hour: 1200,
    max_sqft_per_hour: 2000,
    notes: 'Appliances, counters, sinks, and floor degreasing.',
  },
  {
    space_type: 'Conference Room',
    min_sqft_per_hour: 2500,
    max_sqft_per_hour: 3500,
    notes: 'Table wipe, vacuum, trash. AV equipment adds time.',
  },
  {
    space_type: 'Retail Sales Floor',
    min_sqft_per_hour: 3000,
    max_sqft_per_hour: 5000,
    notes: 'Racks and displays reduce effective rate.',
  },
];
