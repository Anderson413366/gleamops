import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * GET /api/public/proposals/[token]
 *
 * Public endpoint — no auth required.
 * Returns proposal details for the client-facing portal.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  const db = getServiceClient();

  // Look up send record by public_token
  const { data: sendRecord, error: sendErr } = await db
    .from('sales_proposal_sends')
    .select(`
      id,
      public_token,
      recipient_email,
      recipient_name,
      status,
      proposal:proposal_id(
        id,
        proposal_code,
        status,
        pricing_option_count,
        notes,
        tenant_id,
        bid_version_id,
        bid:bid_id(
          id,
          bid_code,
          total_sqft,
          bid_monthly_price,
          client:client_id(id, name, client_code),
          service:service_id(id, name)
        )
      )
    `)
    .eq('public_token', token)
    .single();

  if (sendErr || !sendRecord) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  }

  const proposal = sendRecord.proposal as unknown as Record<string, unknown> | null;
  if (!proposal) {
    return NextResponse.json({ error: 'Proposal data unavailable' }, { status: 404 });
  }

  // Mark as viewed if currently SENT or DELIVERED
  if (sendRecord.status === 'SENT' || sendRecord.status === 'DELIVERED') {
    await db
      .from('sales_proposal_sends')
      .update({ status: 'OPENED' })
      .eq('id', sendRecord.id);
  }

  // Fetch pricing results for the bid version
  const bidVersionId = proposal.bid_version_id as string | null;
  let pricing = null;
  let workload = null;
  if (bidVersionId) {
    const [pRes, wRes] = await Promise.all([
      db.from('sales_bid_pricing_results').select('*').eq('bid_version_id', bidVersionId).single(),
      db.from('sales_bid_workload_results').select('*').eq('bid_version_id', bidVersionId).single(),
    ]);
    pricing = pRes.data;
    workload = wRes.data;
  }

  // Fetch areas for scope of work
  let areas: unknown[] = [];
  if (bidVersionId) {
    const { data } = await db
      .from('sales_bid_areas')
      .select('name, square_footage, quantity, building_type_code')
      .eq('bid_version_id', bidVersionId)
      .is('archived_at', null)
      .order('name');
    areas = data ?? [];
  }

  // Fetch tenant branding
  const tenantId = proposal.tenant_id as string;
  const { data: tenant } = await db
    .from('tenants')
    .select('id, name, logo_url, primary_color')
    .eq('id', tenantId)
    .single();

  return NextResponse.json({
    send: {
      id: sendRecord.id,
      status: sendRecord.status,
      recipient_name: sendRecord.recipient_name,
      recipient_email: sendRecord.recipient_email,
    },
    proposal: {
      id: proposal.id,
      proposal_code: proposal.proposal_code,
      status: proposal.status,
      notes: proposal.notes,
      pricing_option_count: proposal.pricing_option_count,
    },
    bid: proposal.bid,
    pricing,
    workload,
    areas,
    company: tenant ? {
      name: tenant.name,
      logo_url: tenant.logo_url,
      primary_color: tenant.primary_color,
    } : null,
  });
}
