export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import SafetyPageClient from './safety-page';

interface SafetyPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SafetyPage({ searchParams }: SafetyPageProps) {
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
  if (tab === 'training-courses') {
    params.set('tab', 'courses');
    redirect(`/safety?${params.toString()}`);
  }
  if (tab === 'training-completions') {
    params.set('tab', 'completions');
    redirect(`/safety?${params.toString()}`);
  }
  if (tab === 'safety-documents') {
    params.set('tab', 'documents');
    redirect(`/safety?${params.toString()}`);
  }

  return <SafetyPageClient />;
}
