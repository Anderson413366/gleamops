import { redirect } from 'next/navigation';

export default async function WorkTicketDetailBridge({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/operations/tickets/${id}`);
}
