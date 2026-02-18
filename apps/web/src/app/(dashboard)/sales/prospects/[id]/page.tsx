import { redirect } from 'next/navigation';

export default async function SalesProspectDetailBridge({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/pipeline/prospects/${id}`);
}
