/**
 * API authentication guard.
 * Extracts user + tenant from Supabase JWT in the Authorization header.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { createProblemDetails } from '@gleamops/shared';

const CONTENT_TYPE_PROBLEM = 'application/problem+json';

function problemResponse(pd: ReturnType<typeof createProblemDetails>) {
  return NextResponse.json(pd, {
    status: pd.status,
    headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
  });
}

export interface AuthContext {
  userId: string;
  tenantId: string;
  roles: string[];
}

type TenantRoleResolution = {
  tenantId: string | null;
  role: string | null;
};

function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function decodeJwtClaims(token: string): Record<string, unknown> {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return {};
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`;
    const json =
      typeof atob === 'function'
        ? atob(padded)
        : Buffer.from(padded, 'base64').toString('utf8');
    const parsed = JSON.parse(json);
    return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function readStringClaim(claims: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = claims[key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return '';
}

function readRoleClaims(claims: Record<string, unknown>): string[] {
  const candidates: unknown[] = [claims.roles, claims.role, claims.role_code, claims.user_role, claims.user_roles];
  const collected: string[] = [];

  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed) collected.push(trimmed);
      continue;
    }

    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        if (typeof item === 'string') {
          const trimmed = item.trim();
          if (trimmed) collected.push(trimmed);
        }
      }
    }
  }

  return collected;
}

async function resolveTenantAndRole(userId: string, email: string | null | undefined): Promise<TenantRoleResolution> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) return { tenantId: null, role: null };

  const db = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (userId) {
    const membership = await db
      .from('tenant_memberships')
      .select('tenant_id, role_code, created_at')
      .eq('user_id', userId)
      .is('archived_at', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (membership.data?.tenant_id) {
      return {
        tenantId: String(membership.data.tenant_id),
        role: typeof membership.data.role_code === 'string' ? membership.data.role_code : null,
      };
    }

    const byStaffUserId = await db
      .from('staff')
      .select('tenant_id, role')
      .eq('user_id', userId)
      .is('archived_at', null)
      .limit(1)
      .maybeSingle();

    if (byStaffUserId.data?.tenant_id) {
      return {
        tenantId: String(byStaffUserId.data.tenant_id),
        role: typeof byStaffUserId.data.role === 'string' ? byStaffUserId.data.role : null,
      };
    }
  }

  if (email) {
    const byEmail = await db
      .from('staff')
      .select('tenant_id, role')
      .eq('email', email)
      .is('archived_at', null)
      .limit(1)
      .maybeSingle();

    if (byEmail.data?.tenant_id) {
      return {
        tenantId: String(byEmail.data.tenant_id),
        role: typeof byEmail.data.role === 'string' ? byEmail.data.role : null,
      };
    }
  }

  return { tenantId: null, role: null };
}

/**
 * Extract and validate authentication from the request.
 *
 * @returns `AuthContext` on success, `NextResponse` (401 ProblemDetails) on failure
 */
export async function extractAuth(
  req: NextRequest,
  instance: string
): Promise<AuthContext | NextResponse> {
  const authHeader = req.headers.get('authorization');
  const bearerToken = extractBearerToken(authHeader);
  let claims = bearerToken ? decodeJwtClaims(bearerToken) : {};
  let user: Awaited<ReturnType<ReturnType<typeof createClient>['auth']['getUser']>>['data']['user'] = null;

  if (authHeader) {
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const authResult = await supabaseAuth.auth.getUser();
    user = authResult.data.user;
  }

  if (!user) {
    const supabaseCookieAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
            try {
              cookiesToSet.forEach(({ name, value }) => {
                req.cookies.set(name, value);
              });
            } catch {
              // Ignore in request contexts where cookies are read-only.
            }
          },
        },
      }
    );

    const authResult = await supabaseCookieAuth.auth.getUser();
    user = authResult.data.user;
    if (!bearerToken) {
      const sessionResult = await supabaseCookieAuth.auth.getSession();
      const accessToken = sessionResult.data.session?.access_token ?? null;
      if (accessToken) {
        claims = decodeJwtClaims(accessToken);
      }
    }
  }

  if (!user) {
    return problemResponse(
      createProblemDetails('AUTH_001', 'Unauthorized', 401, 'Invalid or expired session', instance)
    );
  }

  const tenantIdFromClaims =
    readStringClaim(claims, ['tenant_id', 'tenantId']) ||
    ((user.app_metadata?.tenant_id as string | undefined)?.trim() ?? '');
  const forcedTenantId = (process.env.SINGLE_TENANT_ID ?? process.env.NEXT_PUBLIC_SINGLE_TENANT_ID ?? '').trim();
  const fallback = !tenantIdFromClaims ? await resolveTenantAndRole(user.id, user.email) : { tenantId: null, role: null };
  const tenantId = tenantIdFromClaims || fallback.tenantId || forcedTenantId;
  const roleFromAppMeta = user.app_metadata?.role as string | undefined;
  const roleFromUserMeta = user.user_metadata?.role as string | undefined;
  const roles = readRoleClaims(claims)
    .concat((user.app_metadata?.roles as string[]) ?? [])
    .concat(roleFromAppMeta ? [roleFromAppMeta] : [])
    .concat(roleFromUserMeta ? [roleFromUserMeta] : [])
    .concat(fallback.role ? [fallback.role] : [])
    .map((r) => r.trim().toUpperCase())
    .filter(Boolean);

  if (!tenantId) {
    return problemResponse(
      createProblemDetails('AUTH_003', 'Tenant scope mismatch', 403, 'User has no tenant assigned', instance)
    );
  }

  if (forcedTenantId && tenantId !== forcedTenantId) {
    return problemResponse(
      createProblemDetails('AUTH_003', 'Tenant scope mismatch', 403, 'User is outside the allowed Anderson tenant', instance),
    );
  }

  return {
    userId: user.id,
    tenantId,
    roles,
  };
}

/**
 * Type guard: check if extractAuth returned an error response.
 */
export function isAuthError(result: AuthContext | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
