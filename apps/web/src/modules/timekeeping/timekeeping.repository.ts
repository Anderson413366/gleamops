/**
 * Timekeeping data access layer.
 * Extracted from api/timekeeping/pin-checkin/route.ts
 */
import { createClient } from '@supabase/supabase-js';

export function createDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function countActivePins(
  db: ReturnType<typeof createDb>,
  siteId: string,
) {
  return db
    .from('site_pin_codes')
    .select('id', { count: 'exact', head: true })
    .eq('site_id', siteId)
    .eq('is_active', true)
    .is('archived_at', null);
}

export async function verifyPin(
  db: ReturnType<typeof createDb>,
  siteId: string,
  pin: string,
) {
  return db.rpc('fn_verify_site_pin', {
    p_site_id: siteId,
    p_pin: pin,
  });
}

export async function findStaffByCode(
  db: ReturnType<typeof createDb>,
  tenantId: string,
  staffCode: string,
) {
  return db
    .from('staff')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('staff_code', staffCode)
    .is('archived_at', null)
    .maybeSingle();
}

export async function insertTimeEvent(
  db: ReturnType<typeof createDb>,
  row: Record<string, unknown>,
) {
  return db.from('time_events').insert(row).select().single();
}
