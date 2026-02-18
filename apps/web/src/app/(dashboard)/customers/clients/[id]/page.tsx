import { redirect } from 'next/navigation';

export default async function CustomerClientDetailBridge({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/crm/clients/${id}`);
}
