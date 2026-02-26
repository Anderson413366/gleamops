'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, EmptyState } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type SupplyCostsResponse = {
  rows: Array<Record<string, unknown>>;
  by_site: Array<{ site_id: string; site_name: string; site_code: string | null; total_cost: number }>;
  monthly_trend: Array<{ month: string; total_cost: number }>;
  total_cost: number;
  date_range: { from: string; to: string };
};

type SiteBreakdownResponse = {
  rows: Array<Record<string, unknown>>;
  by_supply: Array<{ supply_id: string; supply_name: string; supply_code: string | null; quantity: number; total_cost: number }>;
  monthly_trend: Array<{ month: string; total_cost: number }>;
  total_cost: number;
};

function monthStartKey() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return new Date(local.getFullYear(), local.getMonth(), 1).toISOString().slice(0, 10);
}

function todayKey() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function formatMonthLabel(month: string) {
  const date = new Date(`${month}-01T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return month;
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

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

export function SupplyCostChart() {
  const [dateFrom, setDateFrom] = useState(monthStartKey);
  const [dateTo, setDateTo] = useState(todayKey);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SupplyCostsResponse | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [siteLoading, setSiteLoading] = useState(false);
  const [siteData, setSiteData] = useState<SiteBreakdownResponse | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date_from: dateFrom,
        date_to: dateTo,
        limit: '500',
      });
      const response = await fetch(`/api/reports/supply-costs?${params.toString()}`, {
        headers: await authHeaders(),
        cache: 'no-store',
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.data) throw new Error(body?.detail ?? body?.title ?? 'Failed to load supply costs');
      const nextData = body.data as SupplyCostsResponse;
      setData(nextData);
      if (!selectedSiteId && nextData.by_site.length > 0) {
        setSelectedSiteId(nextData.by_site[0].site_id);
      }
      if (selectedSiteId && !nextData.by_site.some((site) => site.site_id === selectedSiteId)) {
        setSelectedSiteId(nextData.by_site[0]?.site_id ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, selectedSiteId]);

  const loadSiteBreakdown = useCallback(async () => {
    if (!selectedSiteId) {
      setSiteData(null);
      return;
    }

    setSiteLoading(true);
    try {
      const params = new URLSearchParams({
        date_from: dateFrom,
        date_to: dateTo,
      });
      const response = await fetch(`/api/reports/supply-costs/${selectedSiteId}?${params.toString()}`, {
        headers: await authHeaders(),
        cache: 'no-store',
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.data) throw new Error(body?.detail ?? body?.title ?? 'Failed to load site breakdown');
      setSiteData(body.data as SiteBreakdownResponse);
    } finally {
      setSiteLoading(false);
    }
  }, [dateFrom, dateTo, selectedSiteId]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    void loadSiteBreakdown();
  }, [loadSiteBreakdown]);

  const maxSiteCost = useMemo(() => {
    if (!data?.by_site?.length) return 0;
    return Math.max(...data.by_site.map((site) => site.total_cost), 0);
  }, [data]);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Supply Cost Panel</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Top sites by supply spend, monthly trend, and per-site drilldown.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <Button variant="secondary" onClick={() => void loadSummary()}>
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="h-4 w-4" />
          <span>Total spend for range: {formatCurrency(data?.total_cost ?? 0)}</span>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading supply costs...</p>
        ) : !data || data.by_site.length === 0 ? (
          <EmptyState
            icon={<TrendingUp className="h-12 w-12" />}
            title="No supply costs in this range"
            description="Completed delivery tasks will populate this panel automatically."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top Sites</p>
              {data.by_site.map((site) => {
                const widthPct = maxSiteCost > 0 ? Math.max(5, (site.total_cost / maxSiteCost) * 100) : 5;
                const selected = selectedSiteId === site.site_id;
                return (
                  <button
                    key={site.site_id}
                    type="button"
                    onClick={() => setSelectedSiteId(site.site_id)}
                    className={`w-full rounded-lg border p-3 text-left transition-all duration-200 ease-in-out ${
                      selected ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/40'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{site.site_name}</p>
                      <p className="shrink-0 text-sm font-semibold">{formatCurrency(site.total_cost)}</p>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{site.site_code ?? 'No site code'}</p>
                  </button>
                );
              })}
            </div>

            <div className="space-y-4 rounded-lg border border-border bg-background p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Monthly Trend</p>
                <div className="mt-2 space-y-2">
                  {data.monthly_trend.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No trend points in selected range.</p>
                  ) : (
                    data.monthly_trend.map((entry) => (
                      <div key={entry.month} className="flex items-center justify-between text-sm">
                        <span>{formatMonthLabel(entry.month)}</span>
                        <span className="font-medium">{formatCurrency(entry.total_cost)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Site Breakdown</p>
                {siteLoading ? (
                  <p className="mt-2 text-sm text-muted-foreground">Loading site breakdown...</p>
                ) : !siteData || siteData.by_supply.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">Select a site to view itemized costs.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {siteData.by_supply.slice(0, 8).map((row) => (
                      <div key={row.supply_id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{row.supply_name}</p>
                          <p className="text-xs text-muted-foreground">{row.quantity.toLocaleString()} units</p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold">{formatCurrency(row.total_cost)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
