import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Auth callback handler for OAuth and magic link flows.
 * Exchanges the auth code for a session, then redirects to the app.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/pipeline';

  if (code) {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth code exchange failed → redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
