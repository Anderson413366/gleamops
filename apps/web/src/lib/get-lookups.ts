import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export interface LookupRow {
  id: string;
  category: string;
  code: string;
  label: string;
  sort_order: number | null;
  is_active: boolean;
  tenant_id: string | null;
}

let cache: Record<string, LookupRow[]> = {};

export async function getLookups(
  category: string,
  tenantId?: string,
): Promise<LookupRow[]> {
  const cacheKey = `${category}:${tenantId ?? 'global'}`;
  if (cache[cacheKey]) return cache[cacheKey];

  const supabase = getSupabaseBrowserClient();
  const query = supabase
    .from('lookups')
    .select('*')
    .eq('category', category)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (tenantId) {
    query.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);
  } else {
    query.is('tenant_id', null);
  }

  const { data, error } = await query;
  if (error) throw error;

  cache[cacheKey] = (data ?? []) as LookupRow[];
  return cache[cacheKey];
}

export function clearLookupsCache() {
  cache = {};
}
