export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import VendorsPageClient from './vendors-page';

interface VendorsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function VendorsPage({ searchParams }: VendorsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (typeof value === 'string') {
      params.set(key, value);
    } else if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    }
  }

  const tab = params.get('tab');
  if (tab === 'job-details') {
    params.set('tab', 'jobs');
    redirect(`/vendors?${params.toString()}`);
  }
  if (tab === 'supply-vendors') {
    params.set('tab', 'vendors');
    redirect(`/vendors?${params.toString()}`);
  }

  return <VendorsPageClient />;
}
