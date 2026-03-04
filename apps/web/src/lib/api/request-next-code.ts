import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export async function requestNextCode(prefix: string): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    throw new Error('Missing session token for code generation.');
  }

  const response = await fetch('/api/codes/next', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ prefix }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { data?: unknown; detail?: unknown }
    | null;

  if (!response.ok) {
    const detail = typeof payload?.detail === 'string' ? payload.detail : null;
    throw new Error(detail ?? `Unable to generate ${prefix} code.`);
  }

  if (typeof payload?.data !== 'string' || !payload.data.trim()) {
    throw new Error('Invalid code response.');
  }

  return payload.data.trim();
}
