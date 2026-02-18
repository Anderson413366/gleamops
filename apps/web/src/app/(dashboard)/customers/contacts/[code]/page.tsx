import { redirect } from 'next/navigation';

export default async function CustomerContactDetailBridge({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  redirect(`/crm/contacts/${code}`);
}
