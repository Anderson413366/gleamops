import { redirect } from 'next/navigation';

interface EmployeeAliasPageProps {
  params: Promise<{
    code: string;
  }>;
}

export default async function EmployeeAliasPage({ params }: EmployeeAliasPageProps) {
  const { code } = await params;
  redirect(`/team/staff/${encodeURIComponent(code)}`);
}
