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
    if (resolved) return resolved;
  }

  return null;
}

export function useAuth() {
  const router = useRouter();
  const forcedTenantId = process.env.NEXT_PUBLIC_SINGLE_TENANT_ID ?? null;
  const [state, setState] = useState<AuthState>({
    user: null,
    tenantId: null,
    role: null,
    loading: true,
  });

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    async function loadSession() {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // Extract custom claims injected by our hook
        const claims = session.access_token
          ? JSON.parse(atob(session.access_token.split('.')[1]))
          : {};

        const resolvedTenantId = (claims.tenant_id as string | undefined) ?? null;
        const rawRole = resolveRawRole(
          claims as Record<string, unknown>,
          {
            app_metadata: session.user.app_metadata as Record<string, unknown> | undefined,
          },
        );

        if (forcedTenantId && resolvedTenantId && resolvedTenantId !== forcedTenantId) {
          await supabase.auth.signOut();
          setState({ user: null, tenantId: null, role: null, loading: false });
          router.push('/login');
          return;
        }

        setState({
          user: {
            id: session.user.id,
            email: session.user.email ?? '',
          },
          tenantId: resolvedTenantId,
          role: rawRole && isSupportedRole(rawRole) ? (rawRole.toUpperCase() as UserRole) : null,
          loading: false,
        });
      } else {
        setState({ user: null, tenantId: null, role: null, loading: false });
      }
    }

    loadSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const claims = session.access_token
            ? JSON.parse(atob(session.access_token.split('.')[1]))
            : {};

          const resolvedTenantId = (claims.tenant_id as string | undefined) ?? null;
          const rawRole = resolveRawRole(
            claims as Record<string, unknown>,
            {
              app_metadata: session.user.app_metadata as Record<string, unknown> | undefined,
            },
          );

          if (forcedTenantId && resolvedTenantId && resolvedTenantId !== forcedTenantId) {
            await supabase.auth.signOut();
            setState({ user: null, tenantId: null, role: null, loading: false });
            router.push('/login');
            return;
          }

          setState({
            user: {
              id: session.user.id,
              email: session.user.email ?? '',
            },
            tenantId: resolvedTenantId,
            role: rawRole && isSupportedRole(rawRole) ? (rawRole.toUpperCase() as UserRole) : null,
            loading: false,
          });
        } else {
          setState({ user: null, tenantId: null, role: null, loading: false });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [forcedTenantId, router]);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
  }, [router]);

  return { ...state, signOut };
}
