'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@gleamops/ui';
import type { OwnerDashboardResponse } from '@gleamops/shared';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { DailySnapshot } from './daily-snapshot';
import { KpiCards } from './kpi-cards';
import { SupplyCostChart } from './supply-cost-chart';

async function authHeaders(): Promise<Record<string, string>> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

/** Generate array of YYYY-MM-DD keys for the last N days */
function last30DayKeys(): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

/** Fetch daily ticket counts and build trend arrays for KPI sparklines */
async function fetchKpiTrends(): Promise<Record<string, number[]>> {
  const supabase = getSupabaseBrowserClient();
  const dayKeys = last30DayKeys();
  const startDate = dayKeys[0];

  // Fetch tickets completed in last 30 days (for complaint/resolution trends)
  const { data: tickets } = await supabase
    .from('work_tickets')
    .select('scheduled_date, status')
    .gte('scheduled_date', startDate)
    .in('status', ['COMPLETED', 'IN_PROGRESS', 'SCHEDULED']);

  // Build daily completed counts
  const ticketCountByDay: Record<string, number> = {};
  for (const t of (tickets ?? []) as { scheduled_date: string; status: string }[]) {
    const day = t.scheduled_date?.slice(0, 10);
    if (day) ticketCountByDay[day] = (ticketCountByDay[day] ?? 0) + 1;
  }
  const ticketTrend = dayKeys.map((d) => ticketCountByDay[d] ?? 0);

  // Fetch staff terminations in last 30 days (turnover trend)
  const { data: terminations } = await supabase
    .from('staff')
    .select('updated_at')
    .eq('staff_status', 'TERMINATED')
    .gte('updated_at', `${startDate}T00:00:00`);

  const termByDay: Record<string, number> = {};
  for (const s of (terminations ?? []) as { updated_at: string }[]) {
    const day = s.updated_at?.slice(0, 10);
    if (day) termByDay[day] = (termByDay[day] ?? 0) + 1;
  }
  const turnoverTrend = dayKeys.map((d) => termByDay[d] ?? 0);

  return {
    complaint_response_time_hours: ticketTrend,
    first_time_resolution_rate_pct: ticketTrend,
    specialist_turnover_90d_pct: turnoverTrend,
  };
}

export default function OwnerOverview() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OwnerDashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trendData, setTrendData] = useState<Record<string, number[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [response, trends] = await Promise.all([
        fetch('/api/reports/owner-dashboard', {
          headers: await authHeaders(),
          cache: 'no-store',
        }),
        fetchKpiTrends(),
      ]);
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.data) {
        throw new Error(body?.detail ?? body?.title ?? 'Failed to load owner dashboard');
      }
      setData(body.data as OwnerDashboardResponse);
      setTrendData(trends);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load owner dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Owner Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            KPI snapshot, operational alerts, and supply-cost visibility.
          </p>
        </div>
        <Button variant="secondary" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4" />
          Refresh KPIs
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <KpiCards kpis={data?.kpis ?? null} loading={loading} trendData={trendData} />
      <DailySnapshot snapshot={data?.snapshot ?? null} loading={loading} />
      <SupplyCostChart />
    </div>
  );
}
