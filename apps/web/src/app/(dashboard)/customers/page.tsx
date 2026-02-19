import { Suspense } from 'react';
import CustomersPageClient from './customers-page-client';

export default function CustomersPage() {
  return (
    <Suspense fallback={null}>
      <CustomersPageClient />
    </Suspense>
  );
}
