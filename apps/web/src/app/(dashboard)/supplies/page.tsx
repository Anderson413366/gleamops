import { Suspense } from 'react';
import InventoryPageClient from '../inventory/inventory-page';

export default function SuppliesPage() {
  return (
    <Suspense fallback={null}>
      <InventoryPageClient />
    </Suspense>
  );
}
