import { redirect } from 'next/navigation';

type SearchParams = Record<string, string | string[] | undefined>;

function toQueryString(searchParams?: SearchParams) {
  if (!searchParams) return '';
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
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

export default async function ScheduleRedirect({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const sp = searchParams ? await searchParams : undefined;
  if (sp && !sp.tab) {
    const hasTicket = typeof sp.ticket === 'string' ? sp.ticket.length > 0 : Array.isArray(sp.ticket) && sp.ticket.length > 0;
    sp.tab = hasTicket ? 'tickets' : 'planning';
  }
  redirect(`/operations${toQueryString(sp)}`);
}
