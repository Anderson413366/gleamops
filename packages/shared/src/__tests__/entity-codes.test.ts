import { describe, it, expect } from 'vitest';
import {
  ENTITY_CODE_PATTERNS,
  ENTITY_CODE_PREFIXES,
  validateEntityCode,
  type EntityType,
} from '../constants/entity-codes';

describe('entity-codes', () => {
  const ALL_ENTITY_TYPES: EntityType[] = [
    'client',
    'site',
    'contact',
    'task',
    'service',
    'prospect',
    'opportunity',
    'bid',
    'proposal',
    'job',
    'ticket',
    'staff',
    'file',
    'equipment',
    'subcontractor',
    'position',
    'vehicle',
    'supply_order',
    'inventory_count',
  ];

  describe('ENTITY_CODE_PATTERNS', () => {
    it('has a pattern for all 19 entity types', () => {
      expect(Object.keys(ENTITY_CODE_PATTERNS)).toHaveLength(19);
      for (const type of ALL_ENTITY_TYPES) {
        expect(ENTITY_CODE_PATTERNS[type]).toBeInstanceOf(RegExp);
      }
    });
  });

  describe('ENTITY_CODE_PREFIXES', () => {
    it('has a prefix for all 19 entity types', () => {
      expect(Object.keys(ENTITY_CODE_PREFIXES)).toHaveLength(19);
      for (const type of ALL_ENTITY_TYPES) {
        expect(typeof ENTITY_CODE_PREFIXES[type]).toBe('string');
        expect(ENTITY_CODE_PREFIXES[type]).toHaveLength(3);
      }
    });

    it('maps known prefixes correctly', () => {
      expect(ENTITY_CODE_PREFIXES.client).toBe('CLI');
      expect(ENTITY_CODE_PREFIXES.site).toBe('SIT');
      expect(ENTITY_CODE_PREFIXES.staff).toBe('STF');
      expect(ENTITY_CODE_PREFIXES.bid).toBe('BID');
      expect(ENTITY_CODE_PREFIXES.equipment).toBe('EQP');
      expect(ENTITY_CODE_PREFIXES.vehicle).toBe('VEH');
    });
  });

  describe('validateEntityCode', () => {
    // Standard 4+ digit entities
    const standardEntities: EntityType[] = [
      'client', 'site', 'contact', 'service', 'prospect', 'opportunity',
      'proposal', 'job', 'ticket', 'staff', 'file', 'equipment',
      'subcontractor', 'position', 'vehicle', 'supply_order', 'inventory_count',
    ];

    it.each(standardEntities)('validates %s codes (4+ digits)', (type) => {
      const prefix = ENTITY_CODE_PREFIXES[type];

      // Valid
      expect(validateEntityCode(type, `${prefix}-0001`)).toBe(true);
      expect(validateEntityCode(type, `${prefix}-9999`)).toBe(true);
      expect(validateEntityCode(type, `${prefix}-00001`)).toBe(true); // 5 digits OK

      // Invalid
      expect(validateEntityCode(type, `${prefix}-001`)).toBe(false); // too few digits
      expect(validateEntityCode(type, `${prefix}-`)).toBe(false);
      expect(validateEntityCode(type, `XXX-0001`)).toBe(false); // wrong prefix
      expect(validateEntityCode(type, '')).toBe(false);
      expect(validateEntityCode(type, `${prefix}0001`)).toBe(false); // missing dash
    });

    it('validates task codes (3+ digits)', () => {
      expect(validateEntityCode('task', 'TSK-001')).toBe(true);
      expect(validateEntityCode('task', 'TSK-0001')).toBe(true);
      expect(validateEntityCode('task', 'TSK-01')).toBe(false); // too few
      expect(validateEntityCode('task', 'TSK-')).toBe(false);
    });

    it('validates bid codes (exactly 6 digits)', () => {
      expect(validateEntityCode('bid', 'BID-000001')).toBe(true);
      expect(validateEntityCode('bid', 'BID-999999')).toBe(true);
      expect(validateEntityCode('bid', 'BID-0001')).toBe(false); // too few
      expect(validateEntityCode('bid', 'BID-0000001')).toBe(false); // too many
    });

    it('is case-sensitive on prefix', () => {
      expect(validateEntityCode('client', 'CLI-0001')).toBe(true);
      expect(validateEntityCode('client', 'cli-0001')).toBe(false);
      expect(validateEntityCode('client', 'Cli-0001')).toBe(false);
    });
  });
});
