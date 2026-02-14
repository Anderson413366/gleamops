/**
 * Hook: useInspectionDetail
 *
 * Fetches a single inspection with its items, template, and site info.
 * Provides optimistic setters for scoring and status changes, plus
 * invalidation helpers for re-fetching after sync.
 * All queries are cached and persist offline.
 */
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/auth-context';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface InspectionFull {
  id: string;
  tenant_id: string;
  inspection_code: string;
  template_id: string | null;
  site_id: string | null;
  ticket_id: string | null;
  inspector_id: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  total_score: number | null;
  max_score: number | null;
  score_pct: number | null;
  passed: boolean | null;
  notes: string | null;
  client_version: number;
  template?: { name: string; scoring_scale: number; pass_threshold: number } | null;
  site?: { name: string; site_code: string; street_address: string | null; city: string | null; state: string | null } | null;
}

export interface InspectionItemRow {
  id: string;
  section: string | null;
  label: string;
  sort_order: number;
  score: number | null;
  requires_photo: boolean;
  photo_taken: boolean;
  notes: string | null;
}

export interface InspectionIssueRow {
  id: string;
  severity: string;
  description: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useInspectionDetail(inspectionId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // -- Staff self (shared key with useMyDay) --------------------------------
  const staffQuery = useQuery<{ id: string; full_name: string } | null>({
    queryKey: ['staff-self', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('staff')
        .select('id, full_name')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // -- Inspection detail ----------------------------------------------------
  const inspectionQuery = useQuery<InspectionFull | null>({
    queryKey: ['inspection', inspectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inspections')
        .select(`
          *,
          template:template_id(name, scoring_scale, pass_threshold),
          site:site_id(name, site_code, street_address, city, state)
        `)
        .eq('id', inspectionId!)
        .single();
      if (error) throw error;
      return data as unknown as InspectionFull;
    },
    enabled: !!inspectionId,
  });

  // -- Inspection items -----------------------------------------------------
  const itemsQuery = useQuery<InspectionItemRow[]>({
    queryKey: ['inspection-items', inspectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inspection_items')
        .select('id, section, label, sort_order, score, requires_photo, photo_taken, notes')
        .eq('inspection_id', inspectionId!)
        .is('archived_at', null)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as InspectionItemRow[];
    },
    enabled: !!inspectionId,
  });

  // -- Inspection issues (dependent on inspection) --------------------------
  const issuesQuery = useQuery<InspectionIssueRow[]>({
    queryKey: ['inspection-issues', inspectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inspection_issues')
        .select('id, severity, description, created_at')
        .eq('inspection_id', inspectionId!)
        .is('archived_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as InspectionIssueRow[];
    },
    enabled: !!inspectionId,
  });

  // -- Optimistic item score setter -----------------------------------------
  const setItemScore = useCallback(
    (itemId: string, score: number, notes?: string | null) => {
      queryClient.setQueryData<InspectionItemRow[]>(['inspection-items', inspectionId], (old) => {
        if (!old) return old;
        return old.map((item) =>
          item.id === itemId
            ? { ...item, score, ...(notes !== undefined ? { notes } : {}) }
            : item,
        );
      });
    },
    [queryClient, inspectionId],
  );

  // -- Optimistic inspection status setter ----------------------------------
  const setInspectionStatus = useCallback(
    (newStatus: string, extras?: Partial<InspectionFull>) => {
      queryClient.setQueryData<InspectionFull | null>(['inspection', inspectionId], (old) => {
        if (!old) return old;
        return { ...old, status: newStatus, ...extras };
      });
    },
    [queryClient, inspectionId],
  );

  // -- Invalidation helpers -------------------------------------------------
  const invalidateItems = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['inspection-items', inspectionId] }),
    [queryClient, inspectionId],
  );

  const invalidateInspection = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['inspection', inspectionId] }),
    [queryClient, inspectionId],
  );

  const invalidateIssues = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['inspection-issues', inspectionId] }),
    [queryClient, inspectionId],
  );

  // -- Refetch all ----------------------------------------------------------
  const refetch = useCallback(async () => {
    await Promise.all([
      inspectionQuery.refetch(),
      itemsQuery.refetch(),
      issuesQuery.refetch(),
    ]);
  }, [inspectionQuery, itemsQuery, issuesQuery]);

  // -- Aggregate loading / offline state -----------------------------------
  const loading = inspectionQuery.isLoading;
  const isOffline = inspectionQuery.isError && !!inspectionQuery.data;

  return {
    inspection: inspectionQuery.data ?? null,
    items: itemsQuery.data ?? [],
    issues: issuesQuery.data ?? [],
    staffId: staffQuery.data?.id ?? null,
    tenantId: inspectionQuery.data?.tenant_id ?? null,

    loading,
    isOffline,
    refetch,

    // Optimistic setters
    setItemScore,
    setInspectionStatus,

    // Invalidation
    invalidateItems,
    invalidateInspection,
    invalidateIssues,
  };
}
