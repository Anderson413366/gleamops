import { Suspense } from 'react';
import PeoplePageClient from './people-page-client';

export default function PeoplePage() {
  return (
    <Suspense fallback={null}>
      <PeoplePageClient />
    </Suspense>
  );
}
