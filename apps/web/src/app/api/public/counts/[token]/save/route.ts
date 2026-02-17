import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

interface SavePayload {
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

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token) return json({ error: 'Missing token' }, 400);

  const payload = (await request.json().catch(() => null)) as SavePayload | null;
  if (!payload) return json({ error: 'Invalid request body' }, 400);

  const supabase = getServiceClient();
  const { data: countRow, error: countError } = await supabase
    .from('inventory_counts')
    .select('id, status')
    .eq('public_token', token)
    .is('archived_at', null)
    .maybeSingle();

  if (countError) return json({ error: countError.message }, 500);
  if (!countRow) return json({ error: 'Count form not found.' }, 404);
  if (['SUBMITTED', 'COMPLETED', 'CANCELLED'].includes(String(countRow.status).toUpperCase())) {
    return json({ error: 'This count is already closed.' }, 409);
  }

  const { data: detailRows, error: detailError } = await supabase
    .from('inventory_count_details')
    .select('id')
    .eq('count_id', countRow.id)
    .is('archived_at', null);

  if (detailError) return json({ error: detailError.message }, 500);
  const validIds = new Set(((detailRows ?? []) as Array<{ id: string }>).map((row) => row.id));

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

  const { error: countUpdateError } = await supabase
    .from('inventory_counts')
    .update({
      counted_by_name: payload.countedByName?.trim() || null,
      notes: payload.notes ?? null,
      status: 'DRAFT',
    })
    .eq('id', countRow.id);

  if (countUpdateError) return json({ error: countUpdateError.message }, 500);

  const { data: refreshedDetails, error: refreshError } = await supabase
    .from('inventory_count_details')
    .select('id, actual_qty')
    .eq('count_id', countRow.id)
    .is('archived_at', null);

  if (refreshError) return json({ error: refreshError.message }, 500);

  const total = (refreshedDetails ?? []).length;
  const completed = (refreshedDetails ?? []).filter((row) => (row as { actual_qty: number | null }).actual_qty != null).length;

  return json({
    ok: true,
    progress: {
      completed,
      total,
    },
  });
}
