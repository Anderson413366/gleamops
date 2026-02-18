import type { SupabaseClient } from '@supabase/supabase-js';

type JsonRecord = Record<string, unknown>;

export async function getSupabaseAuthHeader(
  supabase: SupabaseClient,
): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error('Not authenticated. Please sign in again.');
  }
  return { authorization: `Bearer ${token}` };
}

export async function fetchJsonWithSupabaseAuth<TPayload = JsonRecord>(
  supabase: SupabaseClient,
  input: string,
  init?: RequestInit,
): Promise<TPayload> {
  const authHeader = await getSupabaseAuthHeader(supabase);
  const headers = new Headers(init?.headers ?? undefined);
  headers.set('authorization', authHeader.authorization);

  const hasBody = init?.body !== undefined && init?.body !== null;
  if (hasBody && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  const payload = await response.json().catch(() => ({} as JsonRecord));
  if (!response.ok) {
    const detail = (payload as JsonRecord).detail;
    const title = (payload as JsonRecord).title;
    const error = (payload as JsonRecord).error;
    const message = (
      (typeof detail === 'string' && detail)
      || (typeof title === 'string' && title)
      || (typeof error === 'string' && error)
      || `Request failed (${response.status})`
    );
    throw new Error(message);
  }

  return payload as TPayload;
}
