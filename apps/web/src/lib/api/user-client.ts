import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export function getUserClient(request: NextRequest) {
  const authHeader = request.headers.get('authorization') ?? '';
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    }
  );
}
