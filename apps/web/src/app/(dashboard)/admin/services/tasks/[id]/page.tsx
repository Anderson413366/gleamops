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

export default async function AdminTaskDetailRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : undefined;
  redirect(`/services/tasks/${id}${toQueryString(sp)}`);
}
