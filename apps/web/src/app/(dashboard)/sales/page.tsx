import { Suspense } from 'react';
import PipelinePageClient from '../pipeline/pipeline-page';

export default function SalesPage() {
  return (
    <Suspense fallback={null}>
      <PipelinePageClient />
    </Suspense>
  );
}
