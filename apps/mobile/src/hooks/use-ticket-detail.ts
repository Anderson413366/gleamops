/**
 * Hook: useTicketDetail
 *
 * Fetches full ticket detail: ticket, checklist, supplies, asset requirements,
 * checkouts, and current staff info. All queries are cached and persist offline.
 */
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/auth-context';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface TicketFull {
  id: string;
  tenant_id: string;
  ticket_code: string;
  status: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  site_id: string | null;
  site?: {
    name: string;
    site_code: string;
    street_address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  } | null;
  job?: { job_code: string } | null;
  assignments?: { staff_id: string; staff?: { full_name: string; staff_code: string } | null }[];
}

export interface ChecklistItem {
  id: string;
  label: string;
  section: string | null;
  is_checked: boolean;
  is_required: boolean;
  sort_order: number;
}

interface ChecklistData {
  checklistId: string | null;
  items: ChecklistItem[];
}

export interface SiteSupply {
  id: string;
  name: string;
  category: string | null;
  sds_url: string | null;
  notes: string | null;
}

export interface AssetRequirement {
  id: string;
  asset_type: 'KEY' | 'VEHICLE' | 'EQUIPMENT';
  description: string;
  is_required: boolean;
}

export interface AssetCheckout {
  id: string;
  requirement_id: string;
  staff_id: string;
  checked_out_at: string;
  returned_at: string | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useTicketDetail(ticketId: string | undefined) {
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

  // -- Ticket detail --------------------------------------------------------
  const ticketQuery = useQuery<TicketFull | null>({
    queryKey: ['ticket', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_tickets')
        .select(`
          *,
          site:site_id(name, site_code, street_address, city, state, zip),
          job:job_id(job_code),
          assignments:ticket_assignments(staff_id, staff:staff_id(full_name, staff_code))
        `)
        .eq('id', ticketId!)
        .single();
      if (error) throw error;
      return data as unknown as TicketFull;
    },
    enabled: !!ticketId,
  });

  // -- Checklist (ticket_checklists → ticket_checklist_items) ---------------
  const checklistQuery = useQuery<ChecklistData>({
    queryKey: ['checklist', ticketId],
    queryFn: async () => {
      const { data: checklist } = await supabase
        .from('ticket_checklists')
        .select('id')
        .eq('ticket_id', ticketId!)
        .is('archived_at', null)
        .maybeSingle();

      if (!checklist) return { checklistId: null, items: [] };

      const { data: items } = await supabase
        .from('ticket_checklist_items')
        .select('id, label, section, is_checked, is_required, sort_order')
        .eq('checklist_id', checklist.id)
        .is('archived_at', null)
        .order('sort_order');

      return {
        checklistId: checklist.id,
        items: (items ?? []) as ChecklistItem[],
      };
    },
    enabled: !!ticketId,
  });

  // -- Supplies (dependent on site_id) -------------------------------------
  const siteId = ticketQuery.data?.site_id;

  const suppliesQuery = useQuery<SiteSupply[]>({
    queryKey: ['site-supplies', siteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_supplies')
        .select('id, name, category, sds_url, notes')
        .eq('site_id', siteId!)
        .is('archived_at', null)
        .order('name');
      if (error) throw error;
      return (data ?? []) as SiteSupply[];
    },
    enabled: !!siteId,
  });

  // -- Asset requirements (dependent on site_id) ---------------------------
  const requirementsQuery = useQuery<AssetRequirement[]>({
    queryKey: ['site-requirements', siteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_asset_requirements')
        .select('id, asset_type, description, is_required')
        .eq('site_id', siteId!)
        .is('archived_at', null)
        .order('asset_type');
      if (error) throw error;
      return (data ?? []) as AssetRequirement[];
    },
    enabled: !!siteId,
  });

  // -- Asset checkouts (ticket-level) --------------------------------------
  const checkoutsQuery = useQuery<AssetCheckout[]>({
    queryKey: ['ticket-checkouts', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_asset_checkouts')
        .select('id, requirement_id, staff_id, checked_out_at, returned_at')
        .eq('ticket_id', ticketId!);
      if (error) throw error;
      return (data ?? []) as AssetCheckout[];
    },
    enabled: !!ticketId,
  });

  // -- Optimistic checklist item setter ------------------------------------
  const setChecklistItems = useCallback(
    (updater: (items: ChecklistItem[]) => ChecklistItem[]) => {
      queryClient.setQueryData<ChecklistData>(['checklist', ticketId], (old) => {
        if (!old) return old;
        return { ...old, items: updater(old.items) };
      });
    },
    [queryClient, ticketId],
  );

  // -- Optimistic ticket setter (for status changes) ----------------------
  const setTicketStatus = useCallback(
    (newStatus: string) => {
      queryClient.setQueryData<TicketFull | null>(['ticket', ticketId], (old) => {
        if (!old) return old;
        return { ...old, status: newStatus };
      });
    },
    [queryClient, ticketId],
  );

  // -- Invalidation helpers ------------------------------------------------
  const invalidateChecklist = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['checklist', ticketId] }),
    [queryClient, ticketId],
  );
  const invalidateCheckouts = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['ticket-checkouts', ticketId] }),
    [queryClient, ticketId],
  );
  const invalidateTicket = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] }),
    [queryClient, ticketId],
  );

  // -- Refetch all ----------------------------------------------------------
  const refetch = useCallback(async () => {
    await Promise.all([
      ticketQuery.refetch(),
      checklistQuery.refetch(),
      suppliesQuery.refetch(),
      requirementsQuery.refetch(),
      checkoutsQuery.refetch(),
    ]);
  }, [ticketQuery, checklistQuery, suppliesQuery, requirementsQuery, checkoutsQuery]);

  // -- Aggregate loading / offline state -----------------------------------
  const loading = ticketQuery.isLoading;
  const isOffline = ticketQuery.isError && !!ticketQuery.data;

  return {
    ticket: ticketQuery.data ?? null,
    checklistId: checklistQuery.data?.checklistId ?? null,
    checklistItems: checklistQuery.data?.items ?? [],
    supplies: suppliesQuery.data ?? [],
    requirements: requirementsQuery.data ?? [],
    checkouts: checkoutsQuery.data ?? [],
    staffId: staffQuery.data?.id ?? null,
    tenantId: ticketQuery.data?.tenant_id ?? null,

    loading,
    isOffline,
    refetch,

    // Optimistic setters
    setChecklistItems,
    setTicketStatus,

    // Invalidation
    invalidateChecklist,
    invalidateCheckouts,
    invalidateTicket,
  };
}
