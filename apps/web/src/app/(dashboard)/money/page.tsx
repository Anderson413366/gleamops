import { Suspense } from 'react';
import MoneyPageClient from './money-page';

export default function MoneyPage() {
  return (
    <Suspense fallback={null}>
      <MoneyPageClient />
    </Suspense>
  );
}
