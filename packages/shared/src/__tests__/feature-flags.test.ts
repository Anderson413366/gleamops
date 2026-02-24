import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getFeatureFlags,
  isFeatureEnabled,
  _resetFlagCache,
  type FeatureDomain,
} from '../constants/feature-flags';

describe('feature-flags', () => {
  beforeEach(() => {
    _resetFlagCache();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    _resetFlagCache();
  });

  describe('getFeatureFlags', () => {
    it('returns all flags disabled by default', () => {
      const flags = getFeatureFlags();
      expect(flags).toEqual({
        schema_parity: false,
        bid_specialization: false,
        proposal_studio_v2: false,
        ops_geofence_auto: false,
        messaging_v1: false,
        mobile_inspections: false,
        qbo_timesheet_sync: false,
        financial_intel_v1: false,
        v2_navigation: false,
        planning_board: false,
      });
    });

    it('reads enabled flags from env vars', () => {
      vi.stubEnv('NEXT_PUBLIC_FF_SCHEMA_PARITY', 'enabled');
      vi.stubEnv('NEXT_PUBLIC_FF_MESSAGING_V1', 'true');
      vi.stubEnv('NEXT_PUBLIC_FF_MOBILE_INSPECTIONS', '1');

      const flags = getFeatureFlags();
      expect(flags.schema_parity).toBe(true);
      expect(flags.messaging_v1).toBe(true);
      expect(flags.mobile_inspections).toBe(true);
      expect(flags.bid_specialization).toBe(false);
      expect(flags.proposal_studio_v2).toBe(false);
      expect(flags.ops_geofence_auto).toBe(false);
      expect(flags.qbo_timesheet_sync).toBe(false);
      expect(flags.financial_intel_v1).toBe(false);
    });

    it('treats "disabled" as false', () => {
      vi.stubEnv('NEXT_PUBLIC_FF_SCHEMA_PARITY', 'disabled');
      const flags = getFeatureFlags();
      expect(flags.schema_parity).toBe(false);
    });

    it('treats empty string as false', () => {
      vi.stubEnv('NEXT_PUBLIC_FF_SCHEMA_PARITY', '');
      const flags = getFeatureFlags();
      expect(flags.schema_parity).toBe(false);
    });

    it('caches on first read', () => {
      vi.stubEnv('NEXT_PUBLIC_FF_SCHEMA_PARITY', 'enabled');
      const flags1 = getFeatureFlags();
      expect(flags1.schema_parity).toBe(true);

      // Change env — should NOT affect cached result
      vi.stubEnv('NEXT_PUBLIC_FF_SCHEMA_PARITY', 'disabled');
      const flags2 = getFeatureFlags();
      expect(flags2.schema_parity).toBe(true);
      expect(flags1).toBe(flags2); // same object reference
    });

    it('reads worker env vars (FF_ prefix)', () => {
      vi.stubEnv('FF_BID_SPECIALIZATION', 'enabled');
      const flags = getFeatureFlags();
      expect(flags.bid_specialization).toBe(true);
    });
  });

  describe('isFeatureEnabled', () => {
    it('returns false for disabled flags', () => {
      expect(isFeatureEnabled('schema_parity')).toBe(false);
    });

    it('returns true for enabled flags', () => {
      vi.stubEnv('NEXT_PUBLIC_FF_OPS_GEOFENCE_AUTO', 'enabled');
      expect(isFeatureEnabled('ops_geofence_auto')).toBe(true);
    });

    it('works for all feature domains', () => {
      const domains: FeatureDomain[] = [
        'schema_parity',
        'bid_specialization',
        'proposal_studio_v2',
        'ops_geofence_auto',
        'messaging_v1',
        'mobile_inspections',
        'qbo_timesheet_sync',
        'financial_intel_v1',
        'v2_navigation',
        'planning_board',
      ];
      for (const domain of domains) {
        // All should be false by default
        expect(isFeatureEnabled(domain)).toBe(false);
      }
    });
  });
});
