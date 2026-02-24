import { redirect } from 'next/navigation';
import { isFeatureEnabled } from '@gleamops/shared';
import OperationsPageClient from './operations-page';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

function getFirstValue(val: string | string[] | undefined): string | undefined {
  if (Array.isArray(val)) return val[0];
  return val;
}

function toQueryString(params: SearchParams, exclude?: string[]): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (exclude?.includes(k)) continue;
    if (!v) continue;
    if (Array.isArray(v)) {
      for (const item of v) qs.append(k, item);
    } else {
      qs.set(k, v);
    }
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

/**
 * Redirect legacy /operations routes to new Schedule + Jobs modules.
 * Tab mapping follows the Architecture Handoff Phase 1 spec (Epic 1.5).
 */
const TAB_REDIRECTS: Record<string, string> = {
  calendar: '/schedule?tab=calendar',
  planning: '/schedule?tab=plan',
  tickets: '/jobs?tab=tickets',
  inspections: '/jobs?tab=inspections',
  jobs: '/jobs?tab=tickets',
  alerts: '/jobs?tab=time',
  routes: '/jobs?tab=routes',
  'task-catalog': '/settings?tab=tasks',
  forms: '/settings?tab=forms',
  templates: '/settings?tab=templates',
  geofences: '/settings?tab=geofences',
  messages: '/jobs?tab=tickets',
};

export default async function OperationsRedirect({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const scheduleLiberationEnabled = isFeatureEnabled('schedule_liberation');
  if (!scheduleLiberationEnabled) {
    return <OperationsPageClient />;
  }

  const sp = searchParams ? await searchParams : {};
  const tab = getFirstValue(sp.tab);
  const rest = toQueryString(sp, ['tab']);

  if (tab && TAB_REDIRECTS[tab]) {
    const base = TAB_REDIRECTS[tab];
    // Append any extra query params (e.g. ticket=uuid, site=code)
    if (rest) {
      const separator = base.includes('?') ? '&' : '?';
      redirect(`${base}${separator}${rest.slice(1)}`);
    }
    redirect(base);
  }

  // Default: redirect to Jobs (the primary successor)
  redirect(`/jobs${rest}`);
}
