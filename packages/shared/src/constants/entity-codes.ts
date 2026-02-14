/**
 * Entity code patterns and validation for GleamOps.
 *
 * Every business entity has a human-readable code (e.g. CLI-0001).
 * This module centralizes the patterns so they can be shared between
 * Zod schemas, UI display, and tests.
 */

export type EntityType =
  | 'client'
  | 'site'
  | 'contact'
  | 'task'
  | 'service'
  | 'prospect'
  | 'opportunity'
  | 'bid'
  | 'proposal'
  | 'job'
  | 'ticket'
  | 'staff'
  | 'file'
  | 'equipment'
  | 'subcontractor'
  | 'position'
  | 'vehicle'
  | 'supply_order'
  | 'inventory_count';

/**
 * Regex patterns for each entity code format.
 * Most follow PREFIX-XXXX (4+ digits). Exceptions noted inline.
 */
export const ENTITY_CODE_PATTERNS: Record<EntityType, RegExp> = {
  client: /^CLI-\d{4,}$/,
  site: /^SIT-\d{4,}$/,
  contact: /^CON-\d{4,}$/,
  task: /^TSK-\d{3,}$/, // 3+ digits
  service: /^SER-\d{4,}$/,
  prospect: /^PRO-\d{4,}$/,
  opportunity: /^OPP-\d{4,}$/,
  bid: /^BID-\d{6}$/, // exactly 6 digits
  proposal: /^PRP-\d{4,}$/,
  job: /^JOB-\d{4,}$/,
  ticket: /^TKT-\d{4,}$/,
  staff: /^STF-\d{4,}$/,
  file: /^FIL-\d{4,}$/,
  equipment: /^EQP-\d{4,}$/,
  subcontractor: /^SUB-\d{4,}$/,
  position: /^POS-\d{4,}$/,
  vehicle: /^VEH-\d{4,}$/,
  supply_order: /^ORD-\d{4,}$/,
  inventory_count: /^CNT-\d{4,}$/,
};

/**
 * Prefix map — entity type to its 3-letter prefix.
 */
export const ENTITY_CODE_PREFIXES: Record<EntityType, string> = {
  client: 'CLI',
  site: 'SIT',
  contact: 'CON',
  task: 'TSK',
  service: 'SER',
  prospect: 'PRO',
  opportunity: 'OPP',
  bid: 'BID',
  proposal: 'PRP',
  job: 'JOB',
  ticket: 'TKT',
  staff: 'STF',
  file: 'FIL',
  equipment: 'EQP',
  subcontractor: 'SUB',
  position: 'POS',
  vehicle: 'VEH',
  supply_order: 'ORD',
  inventory_count: 'CNT',
};

/**
 * Validate an entity code against its expected pattern.
 * Returns `true` if the code matches, `false` otherwise.
 */
export function validateEntityCode(type: EntityType, code: string): boolean {
  const pattern = ENTITY_CODE_PATTERNS[type];
  if (!pattern) return false;
  return pattern.test(code);
}
