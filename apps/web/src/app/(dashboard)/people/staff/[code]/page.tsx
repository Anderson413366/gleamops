import { redirect } from 'next/navigation';
import { toQueryString, type SearchParams } from '@/lib/url/to-query-string';

// Legacy route: /people/staff/[code] → canonical /workforce/staff/[code]

export default async function PeopleStaffRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const { code } = await params;
  const sp = searchParams ? await searchParams : undefined;
  redirect(`/workforce/staff/${encodeURIComponent(code)}${toQueryString(sp)}`);
}
