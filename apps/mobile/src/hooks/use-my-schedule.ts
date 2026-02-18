import { useMemo } from 'react';
import { useMyDay } from './use-my-day';

export function useMySchedule() {
  const { tickets, loading, refreshing, isOffline, refetch } = useMyDay();

  const upcoming = useMemo(
    () => tickets.filter((ticket) => ticket.status === 'SCHEDULED' || ticket.status === 'IN_PROGRESS'),
    [tickets],
  );

  return {
    upcoming,
    loading,
    refreshing,
    isOffline,
    refetch,
  };
}
