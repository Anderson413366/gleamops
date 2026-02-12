/**
 * Hook: useWeekTickets
 *
 * Fetches this week's work tickets with search filtering.
 * All data is cached via react-query persistence — works offline.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface WeekTicket {
  id: string;
  ticket_code: string;
  status: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  site?: { name: string; site_code: string } | null;
}

function getWeekRange() {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6); // Sunday
  return {
    start: weekStart.toISOString().split('T')[0],
    end: weekEnd.toISOString().split('T')[0],
  };
}

export function useWeekTickets(search: string) {
  const { start, end } = useMemo(() => getWeekRange(), []);

  const query = useQuery<WeekTicket[]>({
    queryKey: ['tickets', 'week', start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_tickets')
        .select(`
          id, ticket_code, status, scheduled_date, start_time, end_time,
          site:site_id(name, site_code)
        `)
        .is('archived_at', null)
        .gte('scheduled_date', start)
        .lte('scheduled_date', end)
        .order('scheduled_date', { ascending: true })
        .order('start_time', { ascending: true });
      if (error) throw error;
      return (data as unknown as WeekTicket[]) ?? [];
    },
  });

  const tickets = query.data ?? [];

  const filtered = useMemo(() => {
    if (!search) return tickets;
    const q = search.toLowerCase();
    return tickets.filter((t) =>
      t.ticket_code.toLowerCase().includes(q) ||
      t.site?.name?.toLowerCase().includes(q) ||
      t.status.toLowerCase().includes(q)
    );
  }, [tickets, search]);

  return {
    tickets: filtered,
    allCount: tickets.length,
    loading: query.isLoading,
    refreshing: query.isFetching && !query.isLoading,
    isOffline: query.isError && tickets.length > 0,
    refetch: query.refetch,
  };
}
