import type { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

interface AuditContext {
  reason?: string | null;
  requestPath?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceId?: string | null;
  geoLat?: number | null;
  geoLong?: number | null;
}

interface WriteAuditMutationInput {
  db: SupabaseClient;
  tenantId: string;
  actorUserId: string;
  entityType: string;
  entityId?: string | null;
  entityCode?: string | null;
  action: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  context?: AuditContext;
}

function parseMaybeNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function extractAuditContext(request: NextRequest, reason?: string): AuditContext {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const firstIp = forwardedFor?.split(',')[0]?.trim() ?? null;

  return {
    reason: reason ?? null,
    requestPath: request.nextUrl.pathname,
    ipAddress: firstIp,
    userAgent: request.headers.get('user-agent'),
    deviceId: request.headers.get('x-device-id'),
    geoLat: parseMaybeNumber(request.headers.get('x-geo-lat')),
    geoLong: parseMaybeNumber(request.headers.get('x-geo-long')),
  };
}

export async function writeAuditMutation(input: WriteAuditMutationInput): Promise<void> {
  const {
    db,
    tenantId,
    actorUserId,
    entityType,
    entityId,
    entityCode,
    action,
    before,
    after,
    context,
  } = input;

  try {
    await db.rpc('write_audit_event', {
      p_tenant_id: tenantId,
      p_entity_type: entityType,
      p_entity_id: entityId ?? null,
      p_entity_code: entityCode ?? null,
      p_action: action,
      p_before: before ?? null,
      p_after: after ?? null,
      p_actor_user_id: actorUserId,
      p_reason: context?.reason ?? null,
      p_request_path: context?.requestPath ?? null,
      p_ip_address: context?.ipAddress ?? null,
      p_user_agent: context?.userAgent ?? null,
      p_device_id: context?.deviceId ?? null,
      p_geo_lat: context?.geoLat ?? null,
      p_geo_long: context?.geoLong ?? null,
    });
  } catch {
    // Audit writes must not block the primary mutation path.
  }
}
