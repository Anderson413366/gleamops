/**
 * Timekeeping service.
 * PIN verification and time event creation.
 * Extracted verbatim from api/timekeeping/pin-checkin/route.ts
 */
import { createProblemDetails, TIME_001, TIME_002, SYS_002 } from '@gleamops/shared';
import {
  createDb,
  countActivePins,
  verifyPin,
  findStaffByCode,
  insertTimeEvent,
} from './timekeeping.repository';

const INSTANCE = '/api/timekeeping/pin-checkin';

interface PinCheckinInput {
  siteId: string;
  pin: string;
  staffCode: string;
  eventType: string;
  lat?: number;
  lng?: number;
  accuracyMeters?: number;
}

type ServiceResult =
  | { success: true; data: Record<string, unknown> }
  | { success: false; error: ReturnType<typeof createProblemDetails> };

export async function processPinCheckin(
  tenantId: string,
  input: PinCheckinInput,
): Promise<ServiceResult> {
  const { siteId, pin, staffCode, eventType, lat, lng, accuracyMeters } = input;
  const db = createDb();

  try {
    // Check if any PINs exist for this site
    const { data: pinCount } = await countActivePins(db, siteId);
    if (!pinCount || (pinCount as unknown as number) === 0) {
      const { count } = await countActivePins(db, siteId);
      if (!count || count === 0) {
        return { success: false, error: TIME_002(INSTANCE) };
      }
    }

    // Verify PIN using server-side hash comparison
    const { data: pinValid, error: pinErr } = await verifyPin(db, siteId, pin);
    if (pinErr) {
      return { success: false, error: SYS_002(pinErr.message, INSTANCE) };
    }
    if (!pinValid) {
      return { success: false, error: TIME_001(INSTANCE) };
    }

    // Resolve staff_code → staff.id
    const { data: staffRow, error: staffErr } = await findStaffByCode(db, tenantId, staffCode);
    if (staffErr || !staffRow) {
      return {
        success: false,
        error: createProblemDetails('VALIDATION', 'Staff not found', 404, `No active staff with code ${staffCode}`, INSTANCE),
      };
    }

    // Insert time_event
    const { data: timeEvent, error: insertErr } = await insertTimeEvent(db, {
      tenant_id: tenantId,
      staff_id: staffRow.id,
      site_id: siteId,
      event_type: eventType,
      recorded_at: new Date().toISOString(),
      lat: lat ?? null,
      lng: lng ?? null,
      accuracy_meters: accuracyMeters ?? null,
      pin_used: true,
    });

    if (insertErr) {
      return { success: false, error: SYS_002(insertErr.message, INSTANCE) };
    }

    return { success: true, data: { success: true, timeEvent } };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: SYS_002(message, INSTANCE) };
  }
}
