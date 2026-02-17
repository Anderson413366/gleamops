import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token) return json({ error: 'Missing token' }, 400);

  const supabase = getServiceClient();
  const { data: countRow, error: countError } = await supabase
    .from('inventory_counts')
    .select(`
      id,
      tenant_id,
      count_code,
      count_date,
      status,
      notes,
      counted_by_name,
      counted_by,
      submitted_at,
      site_id,
      counter:counted_by(full_name),
      site:site_id(name, site_code, address)
    `)
    .eq('public_token', token)
    .is('archived_at', null)
    .maybeSingle();

  if (countError) return json({ error: countError.message }, 500);
  if (!countRow) return json({ error: 'Count form not found.' }, 404);

  const { data: detailRows, error: detailError } = await supabase
    .from('inventory_count_details')
    .select('id, supply_id, expected_qty, actual_qty, notes, created_at')
    .eq('count_id', countRow.id)
    .is('archived_at', null)
    .order('created_at');

  if (detailError) return json({ error: detailError.message }, 500);

  const details = (detailRows ?? []) as Array<{
    id: string;
    supply_id: string;
    expected_qty: number | null;
    actual_qty: number | null;
    notes: string | null;
  }>;

  const supplyIds = Array.from(new Set(details.map((row) => row.supply_id).filter(Boolean)));
  const { data: supplyRows, error: supplyError } = await supabase
    .from('supply_catalog')
    .select('id, code, name, category, unit, preferred_vendor, image_url, unit_cost')
    .in('id', supplyIds);

  if (supplyError) return json({ error: supplyError.message }, 500);

  const supplyById: Record<string, {
    id: string;
    code: string;
    name: string;
    category: string | null;
    unit: string | null;
    preferred_vendor: string | null;
    image_url: string | null;
    unit_cost: number | null;
  }> = {};
  for (const supply of ((supplyRows ?? []) as Array<{
    id: string;
    code: string;
    name: string;
    category: string | null;
    unit: string | null;
    preferred_vendor: string | null;
    image_url: string | null;
    unit_cost: number | null;
  }>)) {
    supplyById[supply.id] = supply;
  }

  let previousBySupplyId: Record<string, { qty: number | null; countDate: string }> = {};
  if (countRow.site_id) {
    const { data: prevCountRow } = await supabase
      .from('inventory_counts')
      .select('id, count_date')
      .eq('site_id', countRow.site_id)
      .is('archived_at', null)
      .neq('id', countRow.id)
      .in('status', ['SUBMITTED', 'COMPLETED'])
      .order('count_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (prevCountRow?.id) {
      const { data: prevDetails } = await supabase
        .from('inventory_count_details')
        .select('supply_id, actual_qty')
        .eq('count_id', prevCountRow.id)
        .is('archived_at', null);

      previousBySupplyId = {};
      for (const row of ((prevDetails ?? []) as Array<{ supply_id: string; actual_qty: number | null }>)) {
        previousBySupplyId[row.supply_id] = { qty: row.actual_qty, countDate: prevCountRow.count_date };
      }
    }
  }

  const countedByName = countRow.counted_by_name
    || ((countRow.counter as { full_name?: string | null } | null)?.full_name ?? null);

  const items = details.map((row) => {
    const supply = supplyById[row.supply_id];
    const previous = previousBySupplyId[row.supply_id];
    return {
      id: row.id,
      supplyId: row.supply_id,
      expectedQty: row.expected_qty,
      actualQty: row.actual_qty,
      notes: row.notes,
      supply: supply ?? null,
      previousCountQty: previous?.qty ?? null,
      previousCountDate: previous?.countDate ?? null,
    };
  });

  return json({
    count: {
      id: countRow.id,
      code: countRow.count_code,
      date: countRow.count_date,
      status: countRow.status,
      notes: countRow.notes,
      countedByName,
      submittedAt: countRow.submitted_at,
      site: countRow.site,
    },
    items,
  });
}
