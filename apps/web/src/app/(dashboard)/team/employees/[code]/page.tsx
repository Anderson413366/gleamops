import { redirect } from 'next/navigation';

interface TeamEmployeeAliasPageProps {
  params: Promise<{
    code: string;
  }>;
}

export default async function TeamEmployeeAliasPage({ params }: TeamEmployeeAliasPageProps) {
  const { code } = await params;
  redirect(`/team/staff/${encodeURIComponent(code)}`);
}
