import { Suspense } from 'react';
import { Skeleton } from '@gleamops/ui';
import FinancialIntelligenceClient from './financial-intelligence-client';

export default function FinancialIntelligencePage() {
  // Next.js requires client components using `useSearchParams()` to be wrapped in a Suspense boundary.
  return (
    <Suspense
      fallback={(
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <Skeleton key={idx} className="h-28 w-full" />
            ))}
          </div>
        </div>
      )}
    >
      <FinancialIntelligenceClient />
    </Suspense>
  );
}

