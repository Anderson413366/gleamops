import { Suspense } from 'react';
import OperationsPageClient from '../operations/operations-page';

export default function SchedulePage() {
  return (
    <Suspense fallback={null}>
      <OperationsPageClient defaultTab="planning" />
    </Suspense>
  );
}
