import { Suspense } from 'react';
import AdminPageClient from '../admin/admin-page';

export default function PlatformPage() {
  return (
    <Suspense fallback={null}>
      <AdminPageClient />
    </Suspense>
  );
}
