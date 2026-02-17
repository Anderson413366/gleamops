import { Suspense } from 'react';
import SupplyCalculatorPage from './supply-calculator-page';

export const dynamic = 'force-dynamic';

export default function SupplyCalculatorRoute() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-muted-foreground">Loading calculator...</div>}>
      <SupplyCalculatorPage />
    </Suspense>
  );
}
