import { Suspense } from 'react';
import OperationsPageClient from '../operations/operations-page';

export default function WorkPage() {
  return (
    <Suspense fallback={null}>
      <OperationsPageClient defaultTab="tickets" />
    </Suspense>
  );
}
