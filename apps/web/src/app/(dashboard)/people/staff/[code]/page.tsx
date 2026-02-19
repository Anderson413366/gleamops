import { redirect } from 'next/navigation';

// Legacy route: /people/staff/[code] → canonical /workforce/staff/[code]
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
