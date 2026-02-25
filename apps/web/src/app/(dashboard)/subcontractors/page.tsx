import { redirect } from 'next/navigation';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function SubcontractorsRedirect({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const sp = searchParams ? await searchParams : {};

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (!value) continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
      continue;
    }
    params.set(key, value);
  }

  params.set('tab', 'partners');
  redirect(`/clients?${params.toString()}`);
}
