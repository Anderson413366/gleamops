/**
 * Sites service.
 * Business logic for site PIN creation.
 * Extracted verbatim from api/sites/[id]/pin/route.ts
 */
import { createProblemDetails, SYS_002 } from '@gleamops/shared';
import {
  createDb,
  findSite,
  createPinViaRpc,
  createPinFallback,
} from './sites.repository';

type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: ReturnType<typeof createProblemDetails> };

export async function createSitePin(
  tenantId: string,
  siteId: string,
  body: {
    pin: string;
    label?: string;
    is_active?: boolean;
    expires_at?: string | null;
  },
  apiPath: string,
): Promise<ServiceResult<{ success: true }>> {
  try {
    const db = createDb();

    // Verify site exists and belongs to tenant
    const { data: site, error: siteErr } = await findSite(db, tenantId, siteId);
    if (siteErr || !site) {
      return { success: false, error: createProblemDetails('VALIDATION', 'Site not found', 404, `No active site with id ${siteId}`, apiPath) };
    }

    const label = body.label ?? 'Main';
    const isActive = body.is_active ?? true;
    const expiresAt = body.expires_at ?? null;

    // Use pgcrypto crypt() + gen_salt() via RPC
    const { error: insertErr } = await createPinViaRpc(db, tenantId, siteId, body.pin, label, isActive, expiresAt);

    // If the RPC function doesn't exist, fall back to direct insert
    if (insertErr?.message?.includes('function') || insertErr?.code === '42883') {
      const { error: sqlErr } = await createPinFallback(db, tenantId, siteId, body.pin, label, isActive, expiresAt);
      if (sqlErr) {
        return { success: false, error: SYS_002(sqlErr.message, apiPath) };
      }
    } else if (insertErr) {
      return { success: false, error: SYS_002(insertErr.message, apiPath) };
    }

    return { success: true, data: { success: true } };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: SYS_002(message, apiPath) };
  }
}
