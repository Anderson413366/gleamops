export interface LegacyRedirect {
  from: string;
  to: string;
}

export const LEGACY_REDIRECTS: LegacyRedirect[] = [
  { from: '/home', to: '/command' },
  { from: '/pipeline', to: '/sales' },
  { from: '/crm', to: '/customers' },
  { from: '/operations', to: '/work' },
  { from: '/workforce', to: '/people' },
  { from: '/inventory', to: '/supplies' },
  { from: '/assets', to: '/supplies' },
  { from: '/vendors', to: '/supplies' },
  { from: '/reports', to: '/insights' },
  { from: '/admin', to: '/platform' },
];

export function getLegacyRedirect(pathname: string): string | null {
  const match = LEGACY_REDIRECTS.find((item) => pathname === item.from || pathname.startsWith(`${item.from}/`));
  if (!match) return null;
  return pathname.replace(match.from, match.to);
}

export function getLegacyRedirectUrl(url: URL): URL | null {
  const pathname = url.pathname;

  if (pathname === '/operations' || pathname.startsWith('/operations/')) {
    const tab = url.searchParams.get('tab');
    const targetBase = tab === 'planning'
      ? '/planning'
      : tab === 'calendar'
        ? '/schedule'
        : '/work';

    const next = new URL(url.toString());
    next.pathname = pathname.replace('/operations', targetBase);

    if (tab === 'planning' || tab === null) {
      next.searchParams.delete('tab');
    }

    return next;
  }

  const mapped = getLegacyRedirect(pathname);
  if (!mapped) return null;

  const next = new URL(url.toString());
  next.pathname = mapped;
  return next;
}
