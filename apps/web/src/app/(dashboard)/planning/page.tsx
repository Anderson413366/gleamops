import { Suspense } from 'react';
import PlanningPageClient from './planning-page-client';

export default function PlanningPage() {
  return (
    <Suspense fallback={null}>
      <PlanningPageClient />
    </Suspense>
  );
}
