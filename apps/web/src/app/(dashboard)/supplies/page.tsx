import { Suspense } from 'react';
import SuppliesPageClient from './supplies-page-client';

export default function SuppliesPage() {
  return (
    <Suspense fallback={null}>
      <SuppliesPageClient />
    </Suspense>
  );
}
