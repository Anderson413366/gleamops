import { redirect } from 'next/navigation';

// Legacy route: /people/staff/[code] → canonical /workforce/staff/[code]
export default async function PeopleStaffRedirect({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  redirect(`/workforce/staff/${code}`);
}
