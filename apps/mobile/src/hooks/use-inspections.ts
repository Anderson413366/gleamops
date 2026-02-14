/**
 * Hook: useInspections
 *
 * Fetches inspections assigned to the current inspector (staff).
 * Supports search filtering and status filtering.
 * All data is cached via react-query persistence — works offline.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/auth-context';

export interface InspectionListItem {
  id: string;
  inspection_code: string;
  status: string;
  site_id: string | null;
  ticket_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  total_score: number | null;
  max_score: number | null;
  score_pct: number | null;
  passed: boolean | null;
  template?: { name: string } | null;
  site?: { name: string; site_code: string } | null;
}

export function useInspections(search: string, statusFilter: string) {
  const { user } = useAuth();

  // Resolve staff record from the auth user
  const staffQuery = useQuery<{ id: string } | null>({
    queryKey: ['staff-self', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const staffId = staffQuery.data?.id ?? null;

  const inspectionsQuery = useQuery<InspectionListItem[]>({
    queryKey: ['inspections', 'list', staffId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inspections')
        .select(`
          id, inspection_code, status, site_id, ticket_id,
          started_at, completed_at,
          total_score, max_score, score_pct, passed,
          template:template_id(name),
          site:site_id(name, site_code)
        `)
        .eq('inspector_id', staffId!)
        .is('archived_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as unknown as InspectionListItem[]) ?? [];
    },
    enabled: !!staffId,
  });

  const allInspections = inspectionsQuery.data ?? [];

  // Apply status and search filters client-side (allows offline filtering)
  const filtered = useMemo(() => {
    let result = allInspections;

    // Status filter
    if (statusFilter && statusFilter !== 'ALL') {
      result = result.filter((i) => i.status === statusFilter);
    }

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((i) =>
        i.inspection_code.toLowerCase().includes(q) ||
        i.site?.name?.toLowerCase().includes(q) ||
        i.template?.name?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [allInspections, search, statusFilter]);

  return {
    inspections: filtered,
    allCount: allInspections.length,
    loading: staffQuery.isLoading || inspectionsQuery.isLoading,
    refreshing: inspectionsQuery.isFetching && !inspectionsQuery.isLoading,
    isOffline: inspectionsQuery.isError && allInspections.length > 0,
    refetch: inspectionsQuery.refetch,
  };
}
