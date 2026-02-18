import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface ShiftTrade {
  id: string;
  status: string;
  request_type: string;
  requested_at: string;
}

export function useShiftTrades() {
  const [rows, setRows] = useState<ShiftTrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('shift_trade_requests')
        .select('id, status, request_type, requested_at')
        .order('requested_at', { ascending: false })
        .limit(100);

      if (!error) setRows((data ?? []) as ShiftTrade[]);
      setLoading(false);
    })();
  }, []);

  return {
    rows,
    loading,
  };
}
