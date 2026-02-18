import { redirect } from 'next/navigation';

export default async function SalesOpportunityDetailBridge({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/pipeline/opportunities/${id}`);
}
