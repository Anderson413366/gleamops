import { redirect } from 'next/navigation';
import { toQueryString, type SearchParams } from '@/lib/url/to-query-string';

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
