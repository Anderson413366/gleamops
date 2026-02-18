import { redirect } from 'next/navigation';

export default async function WorkJobDetailBridge({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/operations/jobs/${id}`);
}
