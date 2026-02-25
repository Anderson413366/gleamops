import type { SupabaseClient, User } from '@supabase/supabase-js';

interface ResolveCurrentStaffResult<T> {
  user: User | null;
  staff: T | null;
}

async function fetchStaffByUser<T extends object>(
  supabase: SupabaseClient,
  userId: string,
  selectColumns: string,
): Promise<T | null> {
  const { data } = await supabase
    .from('staff')
    .select(selectColumns)
    .eq('user_id', userId)
    .is('archived_at', null)
    .maybeSingle();

  return (data as T | null) ?? null;
}

async function attemptSelfLink(accessToken: string): Promise<void> {
  try {
    await fetch('/api/staff/link-self', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch {
    // Ignore network or linkage errors here; caller will continue gracefully.
  }
}

/**
 * Resolves the logged-in user's linked staff profile.
 * If the explicit user_id link is missing (common after account resets),
 * it attempts a server-side email-based self-link and retries once.
 */
export async function resolveCurrentStaff<T extends object>(
  supabase: SupabaseClient,
  selectColumns: string,
): Promise<ResolveCurrentStaffResult<T>> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, staff: null };
  }

  let staff = await fetchStaffByUser<T>(supabase, user.id, selectColumns);
  if (staff) {
    return { user, staff };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token ?? null;
  if (accessToken) {
    await attemptSelfLink(accessToken);
    staff = await fetchStaffByUser<T>(supabase, user.id, selectColumns);
  }

  return { user, staff };
}
