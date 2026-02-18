import { redirect } from 'next/navigation';
import { toQueryString, type SearchParams } from '@/lib/url/to-query-string';

export default async function ScheduleRedirect({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const sp = searchParams ? await searchParams : undefined;
  if (sp && !sp.tab) {
    const hasTicket = typeof sp.ticket === 'string' ? sp.ticket.length > 0 : Array.isArray(sp.ticket) && sp.ticket.length > 0;
    sp.tab = hasTicket ? 'tickets' : 'planning';
  }
  redirect(`/operations${toQueryString(sp)}`);
}
