import { Suspense } from 'react';
import SalesPageClient from './sales-page-client';

export default function SalesPage() {
  return (
    <Suspense fallback={null}>
      <SalesPageClient />
    </Suspense>
  );
}
