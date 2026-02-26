import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_ROUTE_PREFIXES = [
  '/login',
  '/offline',
  '/auth/callback',
  '/api/webhooks',
  '/count',
  '/public/forms',
  '/public/work-orders',
  '/public/portal',
  '/proposal',
  '/api/public/counts',
  '/api/public/forms',
  '/api/public/portal',
  '/api/public/work-orders',
  '/api/public/proposals',
  '/api/cron',
  '/manifest.webmanifest',
  '/sw.js',
] as const;

export function isPublicRoutePath(pathname: string): boolean {
  return PUBLIC_ROUTE_PREFIXES.some((route) => pathname.startsWith(route));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          // Set cookies on the request (for downstream server components)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Set cookies on the response (for the browser)
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as never)
          );
        },
      },
    }
  );

  // Refresh session (important: don't remove this)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const forcedTenantId = process.env.SINGLE_TENANT_ID ?? process.env.NEXT_PUBLIC_SINGLE_TENANT_ID ?? '';

  const isPublicRoute = isPublicRoutePath(pathname);

  if (!user && !isPublicRoute) {
    // Not authenticated → redirect to login
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && pathname === '/login') {
    // Already authenticated → redirect to app
    const url = request.nextUrl.clone();
    url.pathname = '/home';
    return NextResponse.redirect(url);
  }

  if (user && forcedTenantId && !isPublicRoute) {
    const userTenantId = (user.app_metadata?.tenant_id as string | undefined) ?? '';
    if (userTenantId && userTenantId !== forcedTenantId) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', 'tenant_scope_mismatch');
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
