import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/auth-context';
import { supabase } from '../lib/supabase';
import { enqueue } from '../lib/mutation-queue';
import { syncNow } from './use-sync';

export interface FieldReportDraft {
  report_type: 'SUPPLY_REQUEST' | 'MAINTENANCE' | 'DAY_OFF' | 'INCIDENT' | 'GENERAL';
  site_id: string | null;
  description: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  photos: string[] | null;
  requested_items: Array<{ supply_id: string; qty: number }> | null;
  requested_date: string | null;
}

export interface MyFieldReport {
  id: string;
  report_code: string;
  report_type: string;
  status: string;
  priority: string;
  description: string;
  created_at: string;
  requested_date: string | null;
}

interface StaffSelf {
  id: string;
}

export function useFieldReport() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const staffQuery = useQuery<StaffSelf | null>({
    queryKey: ['staff-self', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user!.id)
        .is('archived_at', null)
        .maybeSingle();
      return data as StaffSelf | null;
    },
    enabled: !!user,
  });

  const reportsQuery = useQuery<MyFieldReport[]>({
    queryKey: ['field-reports', 'my', staffQuery.data?.id],
    queryFn: async () => {
      const staffId = staffQuery.data?.id;
      if (!staffId) return [];

      const { data, error } = await supabase
        .from('field_reports')
        .select('id, report_code, report_type, status, priority, description, created_at, requested_date')
        .eq('reported_by', staffId)
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data ?? []) as MyFieldReport[];
    },
    enabled: !!staffQuery.data?.id,
  });

  const submitReport = async (draft: FieldReportDraft) => {
    const optimisticId = `local-${Date.now()}`;
    const optimistic: MyFieldReport = {
      id: optimisticId,
      report_code: 'FR-PENDING',
      report_type: draft.report_type,
      status: 'OPEN',
      priority: draft.priority,
      description: draft.description,
      created_at: new Date().toISOString(),
      requested_date: draft.requested_date,
    };

    queryClient.setQueryData<MyFieldReport[]>(
      ['field-reports', 'my', staffQuery.data?.id],
      (current) => [optimistic, ...(current ?? [])],
    );

    await enqueue({
      type: 'field_report_create',
      reportType: draft.report_type,
      siteId: draft.site_id,
      description: draft.description,
      priority: draft.priority,
      photos: draft.photos,
      requestedItems: draft.requested_items,
      requestedDate: draft.requested_date,
    });

    try {
      await syncNow();
    } finally {
      await reportsQuery.refetch();
    }
  };

  return {
    reports: reportsQuery.data ?? [],
    loading: staffQuery.isLoading || reportsQuery.isLoading,
    refreshing: reportsQuery.isFetching && !reportsQuery.isLoading,
    refetch: reportsQuery.refetch,
    submitReport,
  };
}

