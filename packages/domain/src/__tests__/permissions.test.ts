import { describe, it, expect } from 'vitest';
import { canAccess, rolePermissions } from '../permissions';
import type { UserRole } from '@gleamops/shared';

describe('canAccess (RBAC permissions)', () => {
  // ---------------------------------------------------------------------------
  // OWNER_ADMIN — has all permissions
  // ---------------------------------------------------------------------------
  describe('OWNER_ADMIN', () => {
    it('has all permissions', () => {
      const allPermissions = rolePermissions['OWNER_ADMIN'];
      for (const perm of allPermissions) {
        expect(canAccess('OWNER_ADMIN', perm)).toBe(true);
      }
    });

    it('has settings:write', () => {
      expect(canAccess('OWNER_ADMIN', 'settings:write')).toBe(true);
    });

    it('has bid:convert', () => {
      expect(canAccess('OWNER_ADMIN', 'bid:convert')).toBe(true);
    });

    it('has timekeeping:approve', () => {
      expect(canAccess('OWNER_ADMIN', 'timekeeping:approve')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // MANAGER — almost everything, no settings:write
  // ---------------------------------------------------------------------------
  describe('MANAGER', () => {
    it('has pipeline read and write', () => {
      expect(canAccess('MANAGER', 'pipeline:read')).toBe(true);
      expect(canAccess('MANAGER', 'pipeline:write')).toBe(true);
    });

    it('has bid:calculate and proposal:send', () => {
      expect(canAccess('MANAGER', 'bid:calculate')).toBe(true);
      expect(canAccess('MANAGER', 'proposal:send')).toBe(true);
    });

    it('has settings:read but NOT settings:write', () => {
      expect(canAccess('MANAGER', 'settings:read')).toBe(true);
      expect(canAccess('MANAGER', 'settings:write')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // CLEANER — minimal permissions
  // ---------------------------------------------------------------------------
  describe('CLEANER', () => {
    it('has schedule:read', () => {
      expect(canAccess('CLEANER', 'schedule:read')).toBe(true);
    });

    it('has timekeeping:read and timekeeping:write', () => {
      expect(canAccess('CLEANER', 'timekeeping:read')).toBe(true);
      expect(canAccess('CLEANER', 'timekeeping:write')).toBe(true);
    });

    it('does NOT have pipeline:read', () => {
      expect(canAccess('CLEANER', 'pipeline:read')).toBe(false);
    });

    it('does NOT have pipeline:write', () => {
      expect(canAccess('CLEANER', 'pipeline:write')).toBe(false);
    });

    it('does NOT have customers:write', () => {
      expect(canAccess('CLEANER', 'customers:write')).toBe(false);
    });

    it('does NOT have bid:calculate', () => {
      expect(canAccess('CLEANER', 'bid:calculate')).toBe(false);
    });

    it('does NOT have settings:read or settings:write', () => {
      expect(canAccess('CLEANER', 'settings:read')).toBe(false);
      expect(canAccess('CLEANER', 'settings:write')).toBe(false);
    });

    it('does NOT have timekeeping:approve', () => {
      expect(canAccess('CLEANER', 'timekeeping:approve')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // SALES — pipeline + customers + bid/proposal but not convert
  // ---------------------------------------------------------------------------
  describe('SALES', () => {
    it('has bid:calculate', () => {
      expect(canAccess('SALES', 'bid:calculate')).toBe(true);
    });

    it('has proposal:send', () => {
      expect(canAccess('SALES', 'proposal:send')).toBe(true);
    });

    it('does NOT have bid:convert', () => {
      expect(canAccess('SALES', 'bid:convert')).toBe(false);
    });

    it('has pipeline:read and pipeline:write', () => {
      expect(canAccess('SALES', 'pipeline:read')).toBe(true);
      expect(canAccess('SALES', 'pipeline:write')).toBe(true);
    });

    it('does NOT have schedule:read', () => {
      expect(canAccess('SALES', 'schedule:read')).toBe(false);
    });

    it('does NOT have timekeeping:read', () => {
      expect(canAccess('SALES', 'timekeeping:read')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // SUPERVISOR
  // ---------------------------------------------------------------------------
  describe('SUPERVISOR', () => {
    it('has schedule:read and schedule:write', () => {
      expect(canAccess('SUPERVISOR', 'schedule:read')).toBe(true);
      expect(canAccess('SUPERVISOR', 'schedule:write')).toBe(true);
    });

    it('has inspections:read and inspections:write', () => {
      expect(canAccess('SUPERVISOR', 'inspections:read')).toBe(true);
      expect(canAccess('SUPERVISOR', 'inspections:write')).toBe(true);
    });

    it('has timekeeping:approve', () => {
      expect(canAccess('SUPERVISOR', 'timekeeping:approve')).toBe(true);
    });

    it('does NOT have pipeline:write', () => {
      expect(canAccess('SUPERVISOR', 'pipeline:write')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // INSPECTOR
  // ---------------------------------------------------------------------------
  describe('INSPECTOR', () => {
    it('has inspections:read and inspections:write', () => {
      expect(canAccess('INSPECTOR', 'inspections:read')).toBe(true);
      expect(canAccess('INSPECTOR', 'inspections:write')).toBe(true);
    });

    it('has customers:read but NOT customers:write', () => {
      expect(canAccess('INSPECTOR', 'customers:read')).toBe(true);
      expect(canAccess('INSPECTOR', 'customers:write')).toBe(false);
    });

    it('does NOT have pipeline:read', () => {
      expect(canAccess('INSPECTOR', 'pipeline:read')).toBe(false);
    });
  });
});
