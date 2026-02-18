import { Suspense } from 'react';
import ReportsPageClient from '../reports/reports-page';

export default function InsightsPage() {
  return (
    <Suspense fallback={null}>
      <ReportsPageClient />
    </Suspense>
  );
}
