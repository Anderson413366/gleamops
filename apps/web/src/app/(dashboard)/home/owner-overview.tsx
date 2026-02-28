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

export default function OwnerOverview() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OwnerDashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/reports/owner-dashboard', {
        headers: await authHeaders(),
        cache: 'no-store',
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.data) {
        throw new Error(body?.detail ?? body?.title ?? 'Failed to load owner dashboard');
      }
      setData(body.data as OwnerDashboardResponse);
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

      <KpiCards kpis={data?.kpis ?? null} loading={loading} />
      <DailySnapshot snapshot={data?.snapshot ?? null} loading={loading} />
      <SupplyCostChart />
    </div>
  );
}
