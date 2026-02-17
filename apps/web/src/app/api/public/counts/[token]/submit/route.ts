import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

interface SubmitPayload {
  countedByName?: string | null;
  notes?: string | null;
  items?: Array<{
    id: string;
    quantity: number | string | null;
    notes?: string | null;
  }>;
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function toNullableNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function nextDueDate(fromDate: string, frequency: string | null): string {
  const base = new Date(`${fromDate}T00:00:00`);
  const freq = (frequency ?? 'MONTHLY').toUpperCase();
  switch (freq) {
    case 'WEEKLY':
      base.setDate(base.getDate() + 7);
      break;
    case 'BIWEEKLY':
      base.setDate(base.getDate() + 14);
      break;
    case 'QUARTERLY':
      base.setMonth(base.getMonth() + 3);
      break;
    case 'MONTHLY':
    default:
      base.setMonth(base.getMonth() + 1);
      break;
  }
  return base.toISOString().slice(0, 10);
}

function buildAlert(nextDue: string): string {
  const now = new Date();
  const due = new Date(`${nextDue}T00:00:00`);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays < 0) return 'OVERDUE';
  if (diffDays <= 7) return 'DUE_SOON';
  return 'ON_TRACK';
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token) return json({ error: 'Missing token' }, 400);

  const payload = (await request.json().catch(() => null)) as SubmitPayload | null;
  if (!payload) return json({ error: 'Invalid request body' }, 400);

  const supabase = getServiceClient();
  const { data: tokenCountRow, error: tokenCountError } = await supabase
    .from('inventory_counts')
    .select('id, site_id, count_date, status, tenant_id')
    .eq('public_token', token)
    .is('archived_at', null)
    .maybeSingle();
  let countRow = tokenCountRow as { id: string; site_id: string | null; count_date: string; status: string; tenant_id: string } | null;
  let countError = tokenCountError as { message: string } | null;

  if (countError?.message?.toLowerCase().includes('public_token')) {
    const { data: fallbackRow, error: fallbackError } = await supabase
      .from('inventory_counts')
      .select('id, site_id, count_date, status, tenant_id')
      .eq('count_code', token)
      .is('archived_at', null)
      .maybeSingle();
    countRow = fallbackRow as { id: string; site_id: string | null; count_date: string; status: string; tenant_id: string } | null;
    countError = fallbackError as { message: string } | null;
  }

  if (countError) return json({ error: countError.message }, 500);
  if (!countRow) return json({ error: 'Count form not found.' }, 404);
  if (['SUBMITTED', 'COMPLETED', 'CANCELLED'].includes(String(countRow.status).toUpperCase())) {
    return json({ error: 'This count is already closed.' }, 409);
  }

  const { data: detailRows, error: detailError } = await supabase
    .from('inventory_count_details')
    .select('id, actual_qty')
    .eq('count_id', countRow.id)
    .is('archived_at', null);

  if (detailError) return json({ error: detailError.message }, 500);
  const detailList = (detailRows ?? []) as Array<{ id: string; actual_qty: number | null }>;
  const validIds = new Set(detailList.map((row) => row.id));

  const updates = (payload.items ?? [])
    .filter((item) => validIds.has(item.id))
    .map((item) => supabase
      .from('inventory_count_details')
      .update({
        actual_qty: toNullableNumber(item.quantity),
        notes: item.notes ?? null,
      })
      .eq('id', item.id)
      .eq('count_id', countRow.id)
      .is('archived_at', null)
    );

  if (updates.length > 0) {
    const updateResults = await Promise.all(updates);
    const failed = updateResults.find((result) => result.error);
    if (failed?.error) return json({ error: failed.error.message }, 500);
  }

  const { data: finalRows, error: finalError } = await supabase
    .from('inventory_count_details')
    .select('id, actual_qty')
    .eq('count_id', countRow.id)
    .is('archived_at', null);

  if (finalError) return json({ error: finalError.message }, 500);

  const missing = ((finalRows ?? []) as Array<{ id: string; actual_qty: number | null }>).filter((row) => row.actual_qty == null);
  if (missing.length > 0) {
    return json({
      error: 'All quantity fields are required.',
      missingItemIds: missing.map((row) => row.id),
    }, 422);
  }

  const nowIso = new Date().toISOString();
  let finalStatus: 'SUBMITTED' | 'COMPLETED' = 'SUBMITTED';
  let { error: countUpdateError } = await supabase
    .from('inventory_counts')
    .update({
      counted_by_name: payload.countedByName?.trim() || null,
      notes: payload.notes ?? null,
      status: finalStatus,
      submitted_at: nowIso,
    })
    .eq('id', countRow.id);

  if (
    countUpdateError?.message?.toLowerCase().includes('counted_by_name')
    || countUpdateError?.message?.toLowerCase().includes('submitted_at')
  ) {
    ({ error: countUpdateError } = await supabase
      .from('inventory_counts')
      .update({
        notes: payload.notes ?? null,
        status: finalStatus,
      })
      .eq('id', countRow.id));
  }

  if (
    countUpdateError?.message?.toLowerCase().includes('chk_inventory_counts_status')
    || countUpdateError?.message?.toLowerCase().includes('violates check constraint')
  ) {
    finalStatus = 'COMPLETED';
    ({ error: countUpdateError } = await supabase
      .from('inventory_counts')
      .update({
        notes: payload.notes ?? null,
        status: finalStatus,
      })
      .eq('id', countRow.id));
  }

  if (countUpdateError) return json({ error: countUpdateError.message }, 500);

  if (countRow.site_id) {
    const { data: siteRow } = await supabase
      .from('sites')
      .select('inventory_frequency')
      .eq('id', countRow.site_id)
      .is('archived_at', null)
      .maybeSingle();

    const frequency = (siteRow as { inventory_frequency?: string | null } | null)?.inventory_frequency ?? 'MONTHLY';
    const nextDue = nextDueDate(countRow.count_date, frequency);
    const statusAlert = buildAlert(nextDue);

    const { error: siteUpdateError } = await supabase
      .from('sites')
      .update({
        last_count_date: countRow.count_date,
        next_count_due: nextDue,
        count_status_alert: statusAlert,
      })
      .eq('id', countRow.site_id)
      .is('archived_at', null);

    // Backward compatibility before schedule columns exist.
    if (siteUpdateError
      && !siteUpdateError.message.toLowerCase().includes('last_count_date')
      && !siteUpdateError.message.toLowerCase().includes('next_count_due')
      && !siteUpdateError.message.toLowerCase().includes('count_status_alert')
    ) {
      return json({ error: siteUpdateError.message }, 500);
    }
  }

  return json({
    ok: true,
    submittedAt: nowIso,
    status: finalStatus,
  });
}
