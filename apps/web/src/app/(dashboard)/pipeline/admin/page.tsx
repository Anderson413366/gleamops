import { Suspense } from 'react';
import SalesAdminPageClient from './sales-admin-page';

export default function SalesAdminPage() {
  return (
    <Suspense fallback={null}>
      <SalesAdminPageClient />
    </Suspense>
  );
}
