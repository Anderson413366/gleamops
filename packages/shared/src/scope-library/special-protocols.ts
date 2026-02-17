/**
 * Special cleaning protocols — 6 protocol definitions covering
 * clean rooms, data centers, dialysis, surgical, lab, and isolation.
 */
import type { SpecialProtocol } from './types';

export const SPECIAL_PROTOCOLS: SpecialProtocol[] = [
  {
    code: 'CLEAN_ROOM_ISO',
    label: 'Clean Room (ISO)',
    description: 'ISO 14644-compliant cleaning for controlled environments with particle count requirements.',
    key_procedures: [
      'Gown, glove, and bootie before entry',
      'Wipe surfaces top-down with approved cleanroom wipes',
      'HEPA-vacuum all floors (no brooms)',
      'Mop with DI water or approved solution',
      'Particle count verification after cleaning',
      'Log entry/exit times and cleaning activities',
    ],
    typical_frequency: 'Daily to 2x daily depending on ISO class',
    regulatory_refs: ['ISSA', 'OSHA'],
  },
  {
    code: 'DATA_CENTER',
    label: 'Data Center',
    description: 'Anti-static cleaning for server rooms and network operations centers.',
    key_procedures: [
      'ESD wrist strap required at all times',
      'HEPA-vacuum raised floor tiles and plenums',
      'Wipe equipment exteriors with anti-static wipes',
      'Clean air intake filters and vents',
      'No liquid cleaners near active equipment',
      'Document rack rows cleaned per session',
    ],
    typical_frequency: 'Weekly to bi-weekly',
    regulatory_refs: ['ISSA'],
  },
  {
    code: 'DIALYSIS',
    label: 'Dialysis Unit',
    description: 'Infection-control cleaning for hemodialysis treatment areas.',
    key_procedures: [
      'EPA List N disinfectant on all patient-contact surfaces',
      'Clean between patient treatments (turnover)',
      'Terminal clean at end of day',
      'Bloodborne pathogen cleanup per OSHA standard',
      'Sharps container check and replacement',
      'Weekly deep-clean of water treatment area',
    ],
    typical_frequency: 'Between each patient + daily terminal',
    regulatory_refs: ['CDC', 'OSHA', 'CMS'],
  },
  {
    code: 'SURGICAL',
    label: 'Surgical Suite',
    description: 'AORN-compliant cleaning for operating rooms and sterile processing.',
    key_procedures: [
      'Between-case wipe-down of all horizontal surfaces',
      'Terminal clean: walls (shoulder height down), ceiling vents, all equipment',
      'Wet-vacuum floors with approved surgical disinfectant',
      'Verify no visible bioburden under OR lights',
      'Monthly deep clean including overhead tracks and booms',
      'Document cleaning completion for infection control log',
    ],
    typical_frequency: 'Between cases + daily terminal + monthly deep',
    regulatory_refs: ['AORN', 'JOINT_COMMISSION', 'CDC'],
  },
  {
    code: 'LAB',
    label: 'Laboratory',
    description: 'Cleaning protocol for clinical, research, or teaching laboratories.',
    key_procedures: [
      'Clear benchtops of non-essential items before cleaning',
      'Use lab-approved disinfectant on bench surfaces',
      'Avoid disturbing labeled specimens or experiments',
      'Sharps and biohazard waste handled per OSHA',
      'Fume hood exterior wipe-down (interior by lab staff)',
      'Floor scrub with chemical-resistant mop heads',
    ],
    typical_frequency: 'Daily + weekly deep clean',
    regulatory_refs: ['OSHA', 'CDC', 'EPA'],
  },
  {
    code: 'ISOLATION',
    label: 'Isolation Room',
    description: 'Enhanced infection-control cleaning for airborne and contact isolation rooms.',
    key_procedures: [
      'Don full PPE before entry (gown, gloves, N95/PAPR)',
      'Use EPA-registered hospital disinfectant per pathogen',
      'Clean high-touch surfaces minimum 2x daily',
      'Dedicated equipment — no sharing between rooms',
      'Bag and seal all waste inside the room before transport',
      'Terminal clean upon patient discharge with UV-C if available',
    ],
    typical_frequency: 'Minimum 2x daily + terminal on discharge',
    regulatory_refs: ['CDC', 'JOINT_COMMISSION', 'OSHA'],
  },
];
