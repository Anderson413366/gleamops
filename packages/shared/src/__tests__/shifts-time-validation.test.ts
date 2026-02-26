import { describe, expect, it } from 'vitest';
import {
  offerCoverageSchema,
  payrollExportPreviewSchema,
  reportCalloutSchema,
  captureTravelSegmentSchema,
} from '../validation/shifts-time';

describe('Shifts & Time validation schemas', () => {
  it('accepts valid callout payload', () => {
    const parsed = reportCalloutSchema.safeParse({
      affected_staff_id: '00000000-0000-0000-0000-000000000001',
      reason: 'SICK',
      route_id: null,
      route_stop_id: null,
      work_ticket_id: null,
      site_id: null,
      resolution_note: 'Fever',
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects invalid callout reason', () => {
    const parsed = reportCalloutSchema.safeParse({
      affected_staff_id: '00000000-0000-0000-0000-000000000001',
      reason: 'LATE',
    });

    expect(parsed.success).toBe(false);
  });

  it('defaults coverage offer expiry when omitted', () => {
    const parsed = offerCoverageSchema.parse({
      callout_event_id: '00000000-0000-0000-0000-000000000001',
      candidate_staff_id: '00000000-0000-0000-0000-000000000002',
    });

    expect(parsed.expires_in_minutes).toBe(30);
  });

  it('rejects payroll period when end precedes start', () => {
    const parsed = payrollExportPreviewSchema.safeParse({
      mapping_id: '00000000-0000-0000-0000-000000000001',
      period_start: '2026-03-15',
      period_end: '2026-03-01',
    });

    expect(parsed.success).toBe(false);
  });

  it('accepts travel capture payload with timezone datetime', () => {
    const parsed = captureTravelSegmentSchema.safeParse({
      route_id: '00000000-0000-0000-0000-000000000001',
      from_stop_id: '00000000-0000-0000-0000-000000000002',
      to_stop_id: '00000000-0000-0000-0000-000000000003',
      travel_end_at: '2026-02-26T19:00:00+00:00',
    });

    expect(parsed.success).toBe(true);
  });
});
