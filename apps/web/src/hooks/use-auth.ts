'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { isSupportedRole } from '@gleamops/shared';
import type { UserRole } from '@gleamops/shared';

interface AuthState {
  user: {
    id: string;
    email: string;
  } | null;
  tenantId: string | null;
  role: UserRole | null;
  loading: boolean;
}

interface AuthContextFallback {
  tenantId: string | null;
  role: string | null;
}

interface SessionSnapshot {
  access_token: string;
  user: {
    id: string;
    email?: string | null;
    app_metadata?: Record<string, unknown>;
  };
}

interface SupabaseSessionLike {
  access_token: string;
  user: {
    id: string;
    email?: string | null;
    app_metadata?: Record<string, unknown>;
  };
}

interface AuthContextResponse {
  tenantId: string | null;
  role: string | null;
}

interface AuthContextFetchResult {
  ok: boolean;
  status: number | null;
  payload: AuthContextResponse | null;
}

function createSignedOutAuthState(loading: boolean): AuthState {
  return {
    user: null,
    tenantId: null,
    role: null,
    loading,
  };
}

function createSessionSnapshot(session: SupabaseSessionLike): SessionSnapshot {
  return {
    access_token: session.access_token,
    user: {
      id: session.user.id,
      email: session.user.email,
      app_metadata: session.user.app_metadata,
    },
  };
}

function extractRoleCandidate(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string' && item.trim().length > 0) {
        return item.trim();
      }
    }
  }

  return null;
}

function resolveRawRole(
  claims: Record<string, unknown>,
  user: {
    app_metadata?: Record<string, unknown>;
  },
): string | null {
  // Only trust JWT claims and app_metadata (server-set).
  // Never read from user_metadata — it is user-editable in Supabase.
  const candidates: unknown[] = [
    claims.role,
    claims.role_code,
    claims.user_role,
    claims.roles,
    claims.user_roles,
    user.app_metadata?.role,
    user.app_metadata?.role_code,
    user.app_metadata?.roles,
  ];

  for (const candidate of candidates) {
    const resolved = extractRoleCandidate(candidate);
    if (resolved && isSupportedRole(resolved)) return resolved;
  }

  return null;
}

function normalizeStaffRole(roleValue: string | null | undefined): string | null {
  if (!roleValue) return null;
  const normalized = roleValue.trim().toUpperCase();
  if (!normalized) return null;
  if (normalized.includes('OWNER') || normalized.includes('ADMIN')) return 'OWNER_ADMIN';
  if (normalized.includes('MANAGER') || normalized.includes('OPERATIONS')) return 'MANAGER';
  if (normalized.includes('SUPERVISOR')) return 'SUPERVISOR';
  if (normalized.includes('INSPECTOR')) return 'INSPECTOR';
  if (normalized.includes('SALES')) return 'SALES';
  if (normalized.includes('CLEANER') || normalized.includes('TECHNICIAN')) return 'CLEANER';
  return normalized;
}

function decodeJwtClaims(accessToken: string | null | undefined): Record<string, unknown> {
  if (!accessToken) return {};

  try {
    const payload = accessToken.split('.')[1];
    if (!payload) return {};
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`;
    const decoded = atob(padded);
    const parsed = JSON.parse(decoded);
    return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

async function resolveAuthContextFromApi(accessToken: string): Promise<AuthContextFallback> {
  const fetchContext = async (token: string): Promise<AuthContextFetchResult> => {
    try {
      const response = await fetch('/api/auth/context', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
        credentials: 'include',
      });

      if (!response.ok) {
        return { ok: false, status: response.status, payload: null };
      }

      const payload = (await response.json()) as { tenantId?: unknown; role?: unknown } | null;
      const tenantId = typeof payload?.tenantId === 'string' && payload.tenantId.trim()
        ? payload.tenantId.trim()
        : null;
      const role = extractRoleCandidate(payload?.role);

      return {
        ok: true,
        status: response.status,
        payload: { tenantId, role },
      };
    } catch {
      return { ok: false, status: null, payload: null };
    }
  };

  try {
    const initial = await fetchContext(accessToken);
    if (initial.ok && initial.payload) {
      return initial.payload;
    }

    // During long-lived sessions a stale JWT can race with refresh and produce one-off 401s.
    // Retry once with a freshly issued token before treating auth context as unavailable.
    if (initial.status === 401) {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.refreshSession();
      const refreshedToken = data.session?.access_token ?? null;
      if (!error && refreshedToken && refreshedToken !== accessToken) {
        const retried = await fetchContext(refreshedToken);
        if (retried.ok && retried.payload) {
          return retried.payload;
        }
      }
    }

    return { tenantId: null, role: null };
  } catch {
    return { tenantId: null, role: null };
  }
}

async function resolveRoleFromStaffProfile(
  userId: string,
  email: string | null,
): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const profileByUser = await supabase
    .from('staff')
    .select('role')
    .eq('user_id', userId)
    .is('archived_at', null)
    .limit(1)
    .maybeSingle<{ role: string | null }>();

  if (!profileByUser.error && profileByUser.data?.role) {
    return normalizeStaffRole(profileByUser.data.role);
  }

  if (!email) return null;

  const profileByEmail = await supabase
    .from('staff')
    .select('role')
    .eq('email', email)
    .is('archived_at', null)
    .limit(1)
    .maybeSingle<{ role: string | null }>();

  if (!profileByEmail.error && profileByEmail.data?.role) {
    return normalizeStaffRole(profileByEmail.data.role);
  }

  return null;
}

function extractTenantClaim(claims: Record<string, unknown>): string | null {
  const appMetadata = typeof claims.app_metadata === 'object' && claims.app_metadata !== null
    ? claims.app_metadata as Record<string, unknown>
    : null;

  return (
    extractRoleCandidate(claims.tenant_id) ??
    extractRoleCandidate(claims.tenantId) ??
    extractRoleCandidate(appMetadata?.tenant_id)
  );
}

async function refreshSessionWhenTenantClaimMissing(
  session: SessionSnapshot,
  resolvedTenantId: string | null,
): Promise<SessionSnapshot> {
  if (!resolvedTenantId) return session;

  const claims = decodeJwtClaims(session.access_token);
  if (extractTenantClaim(claims)) return session;

  const supabase = getSupabaseBrowserClient();
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) return session;

    return {
      access_token: data.session.access_token,
      user: {
        id: data.session.user.id,
        email: data.session.user.email,
        app_metadata: data.session.user.app_metadata as Record<string, unknown> | undefined,
      },
    };
  } catch {
    return session;
  }
}

async function resolveTenantAndRole(
  session: SessionSnapshot,
): Promise<{ tenantId: string | null; rawRole: string | null }> {
  const claims = decodeJwtClaims(session.access_token);
  let tenantId = extractRoleCandidate(claims.tenant_id) ?? extractRoleCandidate(claims.tenantId);
  let rawRole = resolveRawRole(claims, { app_metadata: session.user.app_metadata });

  if ((!tenantId || !rawRole) && session.access_token) {
    const apiContext = await resolveAuthContextFromApi(session.access_token);
    if (!tenantId) {
      tenantId = apiContext.tenantId;
    }
    if (!rawRole) {
      if (apiContext.role && isSupportedRole(apiContext.role)) {
        rawRole = apiContext.role;
      } else {
        rawRole = normalizeStaffRole(apiContext.role);
      }
    }
  }

  if (!rawRole) {
    rawRole = await resolveRoleFromStaffProfile(session.user.id, session.user.email ?? null);
  }

  return { tenantId, rawRole };
}

export function useAuth() {
  const router = useRouter();
  const forcedTenantId = process.env.NEXT_PUBLIC_SINGLE_TENANT_ID ?? null;
  const [state, setState] = useState<AuthState>(createSignedOutAuthState(true));

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let isActive = true;

    const settleAuthFailure = () => {
      if (!isActive) return;
      // Preserve an already-resolved session when a transient auth fetch fails during navigation.
      setState((current) => (current.loading ? createSignedOutAuthState(false) : current));
    };

    const setSignedOutState = () => {
      if (!isActive) return;
      setState(createSignedOutAuthState(false));
    };

    async function applySession(session: SupabaseSessionLike | null) {
      try {
        if (!session?.user) {
          setSignedOutState();
          return;
        }

        let sessionSnapshot = createSessionSnapshot(session);
        let { tenantId: resolvedTenantId, rawRole } = await resolveTenantAndRole(sessionSnapshot);
        sessionSnapshot = await refreshSessionWhenTenantClaimMissing(sessionSnapshot, resolvedTenantId);

        if (sessionSnapshot.access_token !== session.access_token) {
          ({ tenantId: resolvedTenantId, rawRole } = await resolveTenantAndRole(sessionSnapshot));
        }

        if (forcedTenantId && resolvedTenantId && resolvedTenantId !== forcedTenantId) {
          await supabase.auth.signOut().catch(() => {});
          setSignedOutState();
          if (isActive) {
            router.push('/login');
          }
          return;
        }

        if (!isActive) return;
        setState({
          user: {
            id: sessionSnapshot.user.id,
            email: sessionSnapshot.user.email ?? '',
          },
          tenantId: resolvedTenantId,
          role: rawRole && isSupportedRole(rawRole) ? (rawRole.toUpperCase() as UserRole) : null,
          loading: false,
        });
      } catch {
        settleAuthFailure();
      }
    }

    async function loadSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await applySession(session);
      } catch {
        settleAuthFailure();
      }
    }

    void loadSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        await applySession(session);
      }
    );

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [forcedTenantId, router]);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
  }, [router]);

  return { ...state, signOut };
}
