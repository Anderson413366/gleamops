import { redirect } from 'next/navigation';

interface TeamStaffAliasPageProps {
  params: Promise<{ code: string }>;
}

export default async function TeamStaffAliasPage({ params }: TeamStaffAliasPageProps) {
  const { code } = await params;
  redirect(`/workforce/staff/${encodeURIComponent(code)}`);
}
