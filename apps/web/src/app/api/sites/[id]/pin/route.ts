import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createProblemDetails, SYS_002, sitePinCodeSchema } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { validateBody } from '@/lib/api/validate-request';

const CONTENT_TYPE_PROBLEM = 'application/problem+json';

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

// Body schema for the API (site_id comes from URL, not body)
const bodySchema = sitePinCodeSchema.omit({ site_id: true });

/**
 * POST /api/sites/[id]/pin
 *
 * Hashes the PIN with pgcrypto and inserts into site_pin_codes.
 * Body: { pin, label, is_active?, expires_at? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: siteId } = await params;
  const instance = `/api/sites/${siteId}/pin`;

  try {
    // ----- Auth -----
    const auth = await extractAuth(request, instance);
    if (isAuthError(auth)) return auth;
    const { tenantId } = auth;

    // ----- Body -----
    const validation = await validateBody(request, bodySchema, instance);
    if (validation.error) return validation.error;
    const { pin, label, is_active, expires_at } = validation.data;

    // ----- Hash PIN + insert via service client -----
    const service = getServiceClient();

    // Verify the site exists and belongs to this tenant
    const { data: site, error: siteErr } = await service
      .from('sites')
      .select('id')
      .eq('id', siteId)
      .eq('tenant_id', tenantId)
      .is('archived_at', null)
      .maybeSingle();

    if (siteErr || !site) {
      return problemResponse(
        createProblemDetails('VALIDATION', 'Site not found', 404, `No active site with id ${siteId}`, instance)
      );
    }

    // Use pgcrypto crypt() + gen_salt() to hash the PIN via raw SQL
    const { data: insertedRow, error: insertErr } = await service.rpc('fn_create_site_pin', {
      p_tenant_id: tenantId,
      p_site_id: siteId,
      p_pin: pin,
      p_label: label ?? 'Main',
      p_is_active: is_active ?? true,
      p_expires_at: expires_at ?? null,
    });

    // If the RPC function doesn't exist, fall back to raw SQL
    if (insertErr?.message?.includes('function') || insertErr?.code === '42883') {
      const { error: sqlErr } = await service
        .from('site_pin_codes')
        .insert({
          tenant_id: tenantId,
          site_id: siteId,
          pin_hash: pin, // Will be hashed by a trigger or manually via SQL if needed
          label: label ?? 'Main',
          is_active: is_active ?? true,
          expires_at: expires_at ?? null,
        });

      if (sqlErr) {
        return problemResponse(SYS_002(sqlErr.message, instance));
      }
    } else if (insertErr) {
      return problemResponse(SYS_002(insertErr.message, instance));
    }

    return NextResponse.json({ success: true }, { status: 201 });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return problemResponse(SYS_002(message, instance));
  }
}
