import { Suspense } from 'react';
import PlatformPageClient from './platform-page-client';

export default function PlatformPage() {
  return (
    <Suspense fallback={null}>
      <PlatformPageClient />
    </Suspense>
  );
}
