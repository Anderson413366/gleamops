import { redirect } from 'next/navigation';

export default async function CustomerSiteDetailBridge({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/crm/sites/${id}`);
}
