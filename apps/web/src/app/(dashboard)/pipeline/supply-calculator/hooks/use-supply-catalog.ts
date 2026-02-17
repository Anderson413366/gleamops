'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { SupplyItemInput } from '@gleamops/cleanflow';
import { mapCategoryToFamily } from '@gleamops/cleanflow';

interface UseSupplyCatalogReturn {
  items: SupplyItemInput[];
  loading: boolean;
  error: string | null;
}

export function useSupplyCatalog(): UseSupplyCatalogReturn {
  const [items, setItems] = useState<SupplyItemInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    supabase
      .from('supply_catalog')
      .select('id, code, name, category, unit, unit_cost')
      .is('archived_at', null)
      .order('name')
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError(fetchError.message);
          setLoading(false);
          return;
        }

        const mapped: SupplyItemInput[] = (data ?? []).map(
          (row: Record<string, unknown>) => ({
            id: row.id as string,
            code: (row.code as string) ?? '',
            name: (row.name as string) ?? '',
            product_family: mapCategoryToFamily((row.category as string) ?? ''),
            unit: (row.unit as string) ?? 'each',
            unit_cost: Number(row.unit_cost) || 0,
            freight_per_unit: 0,
            shrink_pct: 2,
            quantity: 1,
          })
        );

        setItems(mapped);
        setLoading(false);
      });
  }, []);

  return { items, loading, error };
}
