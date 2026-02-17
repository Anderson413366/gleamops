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
        const rawRole =
          (claims.role as string | undefined) ??
          (claims.role_code as string | undefined) ??
          (Array.isArray(claims.roles) ? (claims.roles[0] as string | undefined) : undefined) ??
          null;

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
          const rawRole =
            (claims.role as string | undefined) ??
            (claims.role_code as string | undefined) ??
            (Array.isArray(claims.roles) ? (claims.roles[0] as string | undefined) : undefined) ??
            null;

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
