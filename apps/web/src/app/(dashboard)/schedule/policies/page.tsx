import { Suspense } from 'react';
import PoliciesClient from './policies-client';

export default function SchedulePoliciesPage() {
  return (
    <Suspense fallback={null}>
      <PoliciesClient />
    </Suspense>
  );
}
