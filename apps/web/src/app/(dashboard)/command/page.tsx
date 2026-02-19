import { Suspense } from 'react';
import CommandPageClient from './command-page-client';

export default function CommandPage() {
  return (
    <Suspense fallback={null}>
      <CommandPageClient />
    </Suspense>
  );
}
