import { redirect } from 'next/navigation';
import { toQueryString, type SearchParams } from '@/lib/url/to-query-string';

export default async function RootPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const sp = searchParams ? await searchParams : undefined;
  redirect(`/command${toQueryString(sp)}`);
}
