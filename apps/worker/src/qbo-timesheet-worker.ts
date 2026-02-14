/**
 * QuickBooks Timesheet Sync Worker
 *
 * Polls approved timesheets pending QBO sync via poll_qbo_pending_timesheets() RPC.
 * For each:
 *   1. Re-verify status is SYNCING (idempotency guard)
 *   2. Check if qbo_sync_id already set (skip if duplicate)
 *   3. Fetch staff info (employee name for QBO)
 *   4. Fetch time entries for the timesheet week
 *   5. Build QBO TimeActivity payload
 *   6. POST to QBO API (or simulate in dev)
 *   7. Mark SYNCED with qbo_sync_id + qbo_synced_at
 *   On error: mark FAILED with qbo_sync_error
 *
 * Idempotent: if qbo_sync_id already set, skip. If QBO returns duplicate, treat as success.
 * Retry: FAILED timesheets are re-polled up to 5 attempts (managed by the RPC).
 *
 * Config env vars:
 *   QBO_CLIENT_ID, QBO_CLIENT_SECRET, QBO_REFRESH_TOKEN, QBO_REALM_ID
 *   If not set: runs in simulated mode (logs instead of calling QBO)
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const POLL_INTERVAL_MS = 30_000; // 30s between poll cycles
const BATCH_SIZE = 5;            // max rows per cycle

// ---------------------------------------------------------------------------
// Supabase service-role client (bypasses RLS)
// ---------------------------------------------------------------------------
function getClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TimesheetRow {
  id: string;
  tenant_id: string;
  staff_id: string;
  week_start: string;
  status: string;
  total_hours: number | null;
  qbo_sync_status: string;
  qbo_sync_id: string | null;
  qbo_sync_error: string | null;
  qbo_sync_attempts: number;
}

interface StaffInfo {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
}

interface QboTimeActivityPayload {
  EmployeeRef: { value: string; name: string };
  TxnDate: string;
  Hours: number;
  Minutes: number;
  Description: string;
}

// ---------------------------------------------------------------------------
// Poll queue: uses poll_qbo_pending_timesheets() RPC (FOR UPDATE SKIP LOCKED)
//
// The RPC atomically:
//   1. Selects up to p_batch_size APPROVED timesheets with PENDING or retryable FAILED status
//   2. Locks them (SKIP LOCKED)
//   3. Transitions them to SYNCING, increments qbo_sync_attempts
//   4. Returns the rows
// ---------------------------------------------------------------------------
async function pollQueue(db: SupabaseClient): Promise<TimesheetRow[]> {
  const { data, error } = await db.rpc('poll_qbo_pending_timesheets', {
    p_batch_size: BATCH_SIZE,
  });

  if (error) {
    console.error('[qbo-worker] poll_qbo_pending_timesheets RPC error:', error.message);
    return [];
  }

  return (data ?? []) as TimesheetRow[];
}

// ---------------------------------------------------------------------------
// Process a single timesheet sync
// ---------------------------------------------------------------------------
async function processTimesheet(db: SupabaseClient, ts: TimesheetRow): Promise<void> {
  try {
    // ---- Idempotency guard: re-check status is SYNCING ----
    // Protects against duplicate pickup on worker restart / RPC replay
    const { data: current } = await db
      .from('timesheets')
      .select('qbo_sync_status, qbo_sync_id')
      .eq('id', ts.id)
      .single();

    if (!current || current.qbo_sync_status !== 'SYNCING') {
      console.warn(`[qbo-worker] timesheet ${ts.id} sync_status is ${current?.qbo_sync_status ?? 'missing'}, skipping`);
      return;
    }

    // ---- Check if already synced (qbo_sync_id set) — treat as success ----
    if (current.qbo_sync_id) {
      console.warn(`[qbo-worker] timesheet ${ts.id} already has qbo_sync_id ${current.qbo_sync_id}, marking SYNCED`);
      await markSynced(db, ts.id, current.qbo_sync_id);
      return;
    }

    // ---- Fetch staff info for employee name ----
    const { data: staff } = await db
      .from('staff')
      .select('id, first_name, last_name, email')
      .eq('id', ts.staff_id)
      .single();

    if (!staff) {
      console.error(`[qbo-worker] staff ${ts.staff_id} not found, failing timesheet ${ts.id}`);
      await markFailed(db, ts.id, 'STAFF_NOT_FOUND');
      return;
    }

    const staffInfo = staff as StaffInfo;
    const employeeName = `${staffInfo.first_name} ${staffInfo.last_name}`;

    // ---- Compute total hours from timesheet ----
    // Use total_hours from the timesheet row directly; fall back to summing time entries
    let totalHours = ts.total_hours ?? 0;

    if (totalHours === 0) {
      // Attempt to sum from time_entries for the staff + week range
      const weekEnd = new Date(ts.week_start);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const { data: entries } = await db
        .from('time_entries')
        .select('hours')
        .eq('staff_id', ts.staff_id)
        .gte('work_date', ts.week_start)
        .lt('work_date', weekEnd.toISOString().split('T')[0]);

      if (entries && entries.length > 0) {
        totalHours = entries.reduce((sum: number, e: any) => sum + (e.hours ?? 0), 0);
      }
    }

    // ---- Build QBO TimeActivity payload ----
    const wholeHours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - wholeHours) * 60);

    const payload: QboTimeActivityPayload = {
      EmployeeRef: {
        value: ts.staff_id,
        name: employeeName,
      },
      TxnDate: ts.week_start,
      Hours: wholeHours,
      Minutes: minutes,
      Description: `Weekly timesheet for ${employeeName} — week of ${ts.week_start}`,
    };

    // ---- Send to QBO API (or simulate in dev) ----
    let qboSyncId: string;
    const qboClientId = process.env.QBO_CLIENT_ID;

    if (qboClientId) {
      // Production: make actual QBO API call
      qboSyncId = await postToQbo(payload, ts.tenant_id);
    } else {
      // Development: simulate sync
      qboSyncId = `sim_qbo_${ts.id}_${Date.now()}`;
      console.log(`[qbo-worker] simulated QBO sync for timesheet ${ts.id} — ${employeeName}, ${totalHours}h → ${qboSyncId}`);
    }

    // ---- Mark SYNCED ----
    await markSynced(db, ts.id, qboSyncId);

    console.log(`[qbo-worker] synced timesheet ${ts.id} — ${employeeName}, ${totalHours}h (qbo_sync_id: ${qboSyncId})`);
  } catch (err: any) {
    const errorMessage = err?.message ?? String(err);

    // If QBO returns a duplicate error, treat as success
    if (errorMessage.includes('Duplicate') || errorMessage.includes('duplicate')) {
      console.warn(`[qbo-worker] QBO duplicate detected for timesheet ${ts.id}, treating as success`);
      const duplicateId = `dup_${ts.id}_${Date.now()}`;
      await markSynced(db, ts.id, duplicateId);
      return;
    }

    console.error(`[qbo-worker] timesheet ${ts.id} sync failed:`, errorMessage);
    await markFailed(db, ts.id, errorMessage);
  }
}

// ---------------------------------------------------------------------------
// QBO API call (placeholder — real implementation would use OAuth2 + REST)
// ---------------------------------------------------------------------------
async function postToQbo(payload: QboTimeActivityPayload, _tenantId: string): Promise<string> {
  const realmId = process.env.QBO_REALM_ID;
  const refreshToken = process.env.QBO_REFRESH_TOKEN;
  const clientId = process.env.QBO_CLIENT_ID;
  const clientSecret = process.env.QBO_CLIENT_SECRET;

  if (!realmId || !refreshToken || !clientId || !clientSecret) {
    throw new Error('Missing QBO credentials (QBO_REALM_ID, QBO_REFRESH_TOKEN, QBO_CLIENT_ID, QBO_CLIENT_SECRET)');
  }

  // Step 1: Exchange refresh token for access token
  const tokenResponse = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!tokenResponse.ok) {
    const body = await tokenResponse.text();
    throw new Error(`QBO token refresh failed (${tokenResponse.status}): ${body}`);
  }

  const tokenData = await tokenResponse.json() as { access_token: string };
  const accessToken = tokenData.access_token;

  // Step 2: Create TimeActivity
  const qboPayload = {
    NameOf: 'Employee',
    EmployeeRef: payload.EmployeeRef,
    TxnDate: payload.TxnDate,
    Hours: payload.Hours,
    Minutes: payload.Minutes,
    Description: payload.Description,
  };

  const apiResponse = await fetch(
    `https://quickbooks.api.intuit.com/v3/company/${realmId}/timeactivity?minorversion=65`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(qboPayload),
    },
  );

  if (!apiResponse.ok) {
    const body = await apiResponse.text();
    throw new Error(`QBO TimeActivity create failed (${apiResponse.status}): ${body}`);
  }

  const result = await apiResponse.json() as { TimeActivity?: { Id?: string } };
  const timeActivityId = result?.TimeActivity?.Id;

  if (!timeActivityId) {
    throw new Error('QBO TimeActivity response missing Id');
  }

  return timeActivityId;
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------
async function markSynced(db: SupabaseClient, timesheetId: string, qboSyncId: string): Promise<void> {
  await db
    .from('timesheets')
    .update({
      qbo_sync_status: 'SYNCED',
      qbo_sync_id: qboSyncId,
      qbo_synced_at: new Date().toISOString(),
      qbo_sync_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', timesheetId);
}

async function markFailed(db: SupabaseClient, timesheetId: string, reason: string): Promise<void> {
  await db
    .from('timesheets')
    .update({
      qbo_sync_status: 'FAILED',
      qbo_sync_error: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', timesheetId);
  console.error(`[qbo-worker] marked timesheet ${timesheetId} FAILED: ${reason}`);
}

// ---------------------------------------------------------------------------
// Main poll loop — uses setTimeout chain (not setInterval) to prevent
// overlapping cycles when processing takes longer than the interval.
// ---------------------------------------------------------------------------
let running = true;

export async function startQboTimesheetWorker(): Promise<void> {
  const db = getClient();
  console.log('[qbo-worker] QuickBooks timesheet sync worker started');
  console.log(`[qbo-worker] poll interval: ${POLL_INTERVAL_MS}ms, batch size: ${BATCH_SIZE}`);

  async function tick(): Promise<void> {
    if (!running) return;

    try {
      const batch = await pollQueue(db);
      if (batch.length > 0) {
        console.log(`[qbo-worker] processing ${batch.length} pending timesheet(s)`);
        // Process sequentially to keep ordering predictable
        for (const ts of batch) {
          if (!running) break;
          await processTimesheet(db, ts);
        }
      }
    } catch (err: any) {
      console.error('[qbo-worker] poll cycle error:', err?.message ?? err);
    }

    if (running) {
      setTimeout(tick, POLL_INTERVAL_MS);
    }
  }

  // Start the first tick
  await tick();
}

export function stopQboTimesheetWorker(): void {
  running = false;
  console.log('[qbo-worker] QBO timesheet worker stopping...');
}
