/**
 * Scope difficulty modifier codes — stackable multipliers applied
 * on top of the base EASY/STANDARD/DIFFICULT multiplier.
 */
import type { ScopeDifficultyModifier } from './types';

export const SCOPE_DIFFICULTY_MODIFIERS: ScopeDifficultyModifier[] = [
  {
    code: 'HT',
    label: 'High Traffic',
    description: 'Areas with above-average foot traffic requiring more frequent touch-ups.',
    factor: 1.2,
  },
  {
    code: 'ELEC',
    label: 'Sensitive Electronics',
    description: 'Server rooms, data centers, or labs with ESD-sensitive equipment.',
    factor: 1.2,
  },
  {
    code: 'ACC',
    label: 'Restricted Access',
    description: 'Security clearance, badge-in areas, or limited cleaning windows.',
    factor: 1.2,
  },
  {
    code: 'CLUT',
    label: 'High Clutter',
    description: 'Densely furnished areas requiring extra time to clean around obstacles.',
    factor: 1.2,
  },
  {
    code: 'SPEC',
    label: 'Specialty Surface',
    description: 'Marble, terrazzo, epoxy, or other surfaces requiring special products/methods.',
    factor: 1.5,
  },
  {
    code: 'PROTO',
    label: 'Protocol Required',
    description: 'Areas requiring documented cleaning protocols (healthcare, clean rooms, etc.).',
    factor: 1.5,
  },
];
