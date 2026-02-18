import { Suspense } from 'react';
import CRMPageClient from '../crm/crm-page';

export default function CustomersPage() {
  return (
    <Suspense fallback={null}>
      <CRMPageClient />
    </Suspense>
  );
}
