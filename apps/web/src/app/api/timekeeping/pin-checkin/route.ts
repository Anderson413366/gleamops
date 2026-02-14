import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  createProblemDetails,
  TIME_001,
  TIME_002,
  SYS_002,
  pinCheckinSchema,
} from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { validateBody } from '@/lib/api/validate-request';

const CONTENT_TYPE_PROBLEM = 'application/problem+json';
const INSTANCE = '/api/timekeeping/pin-checkin';

function problemResponse(pd: ReturnType<typeof createProblemDetails>) {
  return NextResponse.json(pd, {
    status: pd.status,
    headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
  });
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * POST /api/timekeeping/pin-checkin
 *
 * Body validated by pinCheckinSchema (Zod):
 *   siteId: string (UUID),
 *   pin: string (4-6 digits),
 *   staffCode: string (e.g. "STF-1003"),
 *   eventType: "CHECK_IN" | "CHECK_OUT" | "BREAK_START" | "BREAK_END",
 *   lat?: number,
 *   lng?: number,
 *   accuracyMeters?: number,
 *
 * Flow:
 * 1. Validate auth (Bearer token) via extractAuth()
 * 2. Validate body via validateBody() + pinCheckinSchema
 * 3. Verify PIN via fn_verify_site_pin RPC
 * 4. Resolve staff_code → staff.id
 * 5. Insert time_event with pin_used = true
 * 6. The geofence trigger auto-fires on the insert
 */
export async function POST(request: NextRequest) {
  try {
    // ----- Auth -----
    const auth = await extractAuth(request, INSTANCE);
    if (isAuthError(auth)) return auth;
    const { tenantId } = auth;

    // ----- Body -----
    const validation = await validateBody(request, pinCheckinSchema, INSTANCE);
    if (validation.error) return validation.error;
    const { siteId, pin, staffCode, eventType, lat, lng, accuracyMeters } = validation.data;

    // ----- Verify PIN via RPC -----
    const service = getServiceClient();

    // Check if any PINs exist for this site
    const { data: pinCount } = await service
      .from('site_pin_codes')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .eq('is_active', true)
      .is('archived_at', null);

    if (!pinCount || (pinCount as unknown as number) === 0) {
      // Check count more reliably
      const { count } = await service
        .from('site_pin_codes')
        .select('id', { count: 'exact', head: true })
        .eq('site_id', siteId)
        .eq('is_active', true)
        .is('archived_at', null);

      if (!count || count === 0) {
        return problemResponse(TIME_002(INSTANCE));
      }
    }

    // Verify PIN using server-side hash comparison
    const { data: pinValid, error: pinErr } = await service.rpc('fn_verify_site_pin', {
      p_site_id: siteId,
      p_pin: pin,
    });

    if (pinErr) {
      return problemResponse(SYS_002(pinErr.message, INSTANCE));
    }

    if (!pinValid) {
      return problemResponse(TIME_001(INSTANCE));
    }

    // ----- Resolve staff_code → staff.id -----
    const { data: staffRow, error: staffErr } = await service
      .from('staff')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('staff_code', staffCode)
      .is('archived_at', null)
      .maybeSingle();

    if (staffErr || !staffRow) {
      return problemResponse(
        createProblemDetails('VALIDATION', 'Staff not found', 404, `No active staff with code ${staffCode}`, INSTANCE),
      );
    }

    // ----- Insert time_event -----
    const { data: timeEvent, error: insertErr } = await service
      .from('time_events')
      .insert({
        tenant_id: tenantId,
        staff_id: staffRow.id,
        site_id: siteId,
        event_type: eventType,
        recorded_at: new Date().toISOString(),
        lat: lat ?? null,
        lng: lng ?? null,
        accuracy_meters: accuracyMeters ?? null,
        pin_used: true,
      })
      .select()
      .single();

    if (insertErr) {
      return problemResponse(SYS_002(insertErr.message, INSTANCE));
    }

    return NextResponse.json({
      success: true,
      timeEvent,
    }, { status: 201 });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return problemResponse(SYS_002(message, INSTANCE));
  }
}
