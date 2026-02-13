/**
 * Hook: useMyDay
 *
 * Fetches today's work tickets + current staff info.
 * All data is cached via react-query persistence — works offline.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/auth-context';

export interface TodayTicket {
  id: string;
  ticket_code: string;
  status: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  site?: { name: string; site_code: string } | null;
  job?: { job_code: string } | null;
  assignments?: { staff_id: string; role: string | null }[];
}

interface StaffSelf {
  id: string;
  full_name: string;
}

export function useMyDay() {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  const staffQuery = useQuery<StaffSelf | null>({
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

  const ticketsQuery = useQuery<TodayTicket[]>({
    queryKey: ['tickets', 'today', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_tickets')
        .select(`
          id, ticket_code, status, scheduled_date, start_time, end_time,
          site:site_id(name, site_code),
          job:job_id(job_code),
          assignments:ticket_assignments(staff_id, role)
        `)
        .eq('scheduled_date', today)
        .is('archived_at', null)
        .neq('status', 'CANCELED')
        .order('start_time', { ascending: true });
      if (error) throw error;
      return (data as unknown as TodayTicket[]) ?? [];
    },
  });

  return {
    staffId: staffQuery.data?.id ?? null,
    staffName: staffQuery.data?.full_name ?? '',
    tickets: ticketsQuery.data ?? [],
    loading: staffQuery.isLoading || ticketsQuery.isLoading,
    refreshing: ticketsQuery.isFetching && !ticketsQuery.isLoading,
    isOffline: ticketsQuery.isError && (ticketsQuery.data ?? []).length > 0,
    refetch: ticketsQuery.refetch,
  };
}
