import { Suspense } from 'react';
import WorkPageClient from './work-page-client';

export default function WorkPage() {
  return (
    <Suspense fallback={null}>
      <WorkPageClient />
    </Suspense>
  );
}
