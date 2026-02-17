/**
 * Building-wide tasks — facility-level tasks not tied to a specific area.
 * Examples: exterior grounds, parking lot, stairwells, elevator cabs.
 */

export interface BuildingTask {
  code: string;
  label: string;
  description: string;
  default_minutes: number;
  default_frequency: string;
}

export const BUILDING_TASKS: BuildingTask[] = [
  {
    code: 'EXTERIOR_GROUNDS',
    label: 'Exterior Grounds',
    description: 'Litter pickup, walkway sweeping, entry area maintenance',
    default_minutes: 30,
    default_frequency: 'DAILY',
  },
  {
    code: 'PARKING_LOT',
    label: 'Parking Lot',
    description: 'Sweeping, debris removal, cart corral cleaning',
    default_minutes: 45,
    default_frequency: 'WEEKLY',
  },
  {
    code: 'DUMPSTER_PAD',
    label: 'Dumpster Pad',
    description: 'Pad cleaning, area sanitization',
    default_minutes: 15,
    default_frequency: 'WEEKLY',
  },
  {
    code: 'LOADING_DOCK',
    label: 'Loading Dock',
    description: 'Sweeping, debris removal (if not in warehouse area)',
    default_minutes: 20,
    default_frequency: 'WEEKLY',
  },
  {
    code: 'EXTERIOR_WINDOWS',
    label: 'Exterior Windows',
    description: 'Ground-floor exterior glass cleaning',
    default_minutes: 60,
    default_frequency: 'MONTHLY',
  },
  {
    code: 'STAIRWELL',
    label: 'Stairwell',
    description: 'Full stairwell cleaning (all floors)',
    default_minutes: 30,
    default_frequency: 'WEEKLY',
  },
  {
    code: 'ELEVATOR_CAB',
    label: 'Elevator Cab',
    description: 'Cab interior cleaning, track vacuuming',
    default_minutes: 15,
    default_frequency: 'DAILY',
  },
  {
    code: 'ROOF_ACCESS',
    label: 'Roof Access Area',
    description: 'Roof access area cleaning (if applicable)',
    default_minutes: 20,
    default_frequency: 'MONTHLY',
  },
];
