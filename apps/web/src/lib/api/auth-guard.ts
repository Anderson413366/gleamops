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
  }

  if (!user) {
    return problemResponse(
      createProblemDetails('AUTH_001', 'Unauthorized', 401, 'Invalid or expired session', instance)
    );
  }

  const tenantId = (user.app_metadata?.tenant_id as string) ?? '';
  const roleFromAppMeta = user.app_metadata?.role as string | undefined;
  const roleFromUserMeta = user.user_metadata?.role as string | undefined;
  const roles = ((user.app_metadata?.roles as string[]) ?? [])
    .concat(roleFromAppMeta ? [roleFromAppMeta] : [])
    .concat(roleFromUserMeta ? [roleFromUserMeta] : [])
    .map((r) => r.trim().toUpperCase())
    .filter(Boolean);

  if (!tenantId) {
    return problemResponse(
      createProblemDetails('AUTH_003', 'Tenant scope mismatch', 403, 'User has no tenant assigned', instance)
    );
  }

  const forcedTenantId = process.env.SINGLE_TENANT_ID ?? process.env.NEXT_PUBLIC_SINGLE_TENANT_ID ?? '';
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
