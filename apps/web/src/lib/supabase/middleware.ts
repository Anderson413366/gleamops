import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getLegacyRedirectUrl } from '@/lib/routing/legacy-redirect-map';

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
  const vercelEnv = process.env.VERCEL_ENV ?? '';
  const configuredCanonicalHost = (
    process.env.NEXT_PUBLIC_CANONICAL_HOST
    ?? process.env.CANONICAL_HOST
    ?? ''
  ).trim().toLowerCase();
  const canonicalHost = configuredCanonicalHost || (vercelEnv === 'production' ? 'gleamops.vercel.app' : '');
  const rawHost = (request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '').split(',')[0]?.trim().toLowerCase() ?? '';
  const forcedTenantId = process.env.SINGLE_TENANT_ID ?? process.env.NEXT_PUBLIC_SINGLE_TENANT_ID ?? '';

  // In production, force a single public entrypoint host for non-API routes.
  if (
    canonicalHost
    && rawHost
    && rawHost !== canonicalHost
    && !rawHost.startsWith('localhost')
    && !rawHost.startsWith('127.0.0.1')
    && !pathname.startsWith('/api/')
  ) {
    const url = request.nextUrl.clone();
    url.protocol = 'https';
    url.host = canonicalHost;
    return NextResponse.redirect(url, 308);
  }

  if (!pathname.startsWith('/api/')) {
    const legacyRedirectUrl = getLegacyRedirectUrl(request.nextUrl);
    if (legacyRedirectUrl && legacyRedirectUrl.pathname !== pathname) {
      return NextResponse.redirect(legacyRedirectUrl, 308);
    }
  }

  // Public routes that don't need auth
  const publicRoutes = ['/login', '/offline', '/auth/callback', '/api/webhooks', '/count', '/api/public/counts', '/api/cron'];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  if (!user && !isPublicRoute) {
    // Not authenticated → redirect to login
    const url = request.nextUrl.clone();
    const requestedPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    url.pathname = '/login';
    url.searchParams.set('next', requestedPath);
    return NextResponse.redirect(url);
  }

  if (user && pathname === '/login') {
    // Already authenticated → redirect to app
    const url = request.nextUrl.clone();
    url.pathname = '/command';
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
