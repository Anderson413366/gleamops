import { Suspense } from 'react';
import PlanningPageClient from '../planning-page-client';

export default function PlanningBoardsPage() {
  return (
    <Suspense fallback={null}>
      <PlanningPageClient />
    </Suspense>
  );
}
