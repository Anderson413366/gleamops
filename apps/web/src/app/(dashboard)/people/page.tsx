import { Suspense } from 'react';
import WorkforcePageClient from '../workforce/workforce-page';

export default function PeoplePage() {
  return (
    <Suspense fallback={null}>
      <WorkforcePageClient />
    </Suspense>
  );
}
