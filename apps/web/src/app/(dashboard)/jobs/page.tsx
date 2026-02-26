export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import JobsPageClient from './jobs-page';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function JobsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const sp = searchParams ? await searchParams : undefined;
  const tabValue = sp?.tab;
  const requestedTab = Array.isArray(tabValue) ? tabValue[0] : tabValue;

  if (requestedTab === 'shifts-time') {
    const nextParams = new URLSearchParams();
    for (const [key, value] of Object.entries(sp ?? {})) {
      if (key === 'tab' || value == null) continue;
      if (Array.isArray(value)) {
        for (const entry of value) nextParams.append(key, entry);
      } else {
        nextParams.set(key, value);
      }
    }
    const query = nextParams.toString();
    redirect(query ? `/shifts-time?${query}` : '/shifts-time');
  }

  return <JobsPageClient />;
}
