import { Suspense } from 'react';
import CalculatorPage from './calculator-page';

export const dynamic = 'force-dynamic';

export default function PipelineCalculatorRoute() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-muted-foreground">Loading calculator...</div>}>
      <CalculatorPage />
    </Suspense>
  );
}
