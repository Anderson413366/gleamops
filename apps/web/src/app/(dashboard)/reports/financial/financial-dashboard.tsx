'use client';

import { useEffect, useState, useCallback } from 'react';
import { DollarSign, TrendingUp, Building2, Briefcase, PieChart, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Skeleton, Badge, Button } from '@gleamops/ui';
import { MetricCard, BreakdownRow, ChartCard } from '../_components/report-components';

interface RevenueStats {
  totalMonthlyRevenue: number;
  activeJobsCount: number;
  avgJobValue: number;
  topClients: { name: string; revenue: number }[];
}

interface FrequencyBreakdown {
  [frequency: string]: { count: number; revenue: number };
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
}

export default function FinancialDashboard(props: { rangeDays: number; refreshKey: number }) {
  const router = useRouter();
  const [stats, setStats] = useState<RevenueStats>({
    totalMonthlyRevenue: 0,
    activeJobsCount: 0,
    avgJobValue: 0,
    topClients: [],
  });
  const [freqBreakdown, setFreqBreakdown] = useState<FrequencyBreakdown>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    const [jobsRes] = await Promise.all([
      supabase
        .from('site_jobs')
        .select('id, billing_amount, frequency, status, site:site_id(name, client:client_id(name))')
        .eq('status', 'ACTIVE')
        .is('archived_at', null),
    ]);

    if (jobsRes.data) {
      const jobs = jobsRes.data as unknown as {
        id: string;
        billing_amount: number | null;
        frequency: string;
        status: string;
        site: { name: string; client: { name: string } | null } | null;
      }[];

      let totalRevenue = 0;
      const clientRevMap: Record<string, number> = {};
      const freqMap: FrequencyBreakdown = {};

      for (const j of jobs) {
        const amt = j.billing_amount || 0;
        totalRevenue += amt;

        const clientName = j.site?.client?.name || 'Unknown';
        clientRevMap[clientName] = (clientRevMap[clientName] || 0) + amt;

        const freq = j.frequency || 'OTHER';
        if (!freqMap[freq]) freqMap[freq] = { count: 0, revenue: 0 };
        freqMap[freq].count++;
        freqMap[freq].revenue += amt;
      }

      const topClients = Object.entries(clientRevMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, revenue]) => ({ name, revenue }));

      setStats({
        totalMonthlyRevenue: totalRevenue,
        activeJobsCount: jobs.length,
        avgJobValue: jobs.length > 0 ? totalRevenue / jobs.length : 0,
        topClients,
      });
      setFreqBreakdown(freqMap);
    }

    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => { fetchData(); }, [props.refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  const topClientShare = stats.totalMonthlyRevenue > 0 && stats.topClients.length > 0
    ? Math.round((stats.topClients[0].revenue / stats.totalMonthlyRevenue) * 100)
    : 0;
  const top3Share = stats.totalMonthlyRevenue > 0
    ? Math.round((stats.topClients.slice(0, 3).reduce((s, c) => s + c.revenue, 0) / stats.totalMonthlyRevenue) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          icon={<DollarSign className="h-5 w-5" />}
          tone="success"
          label="Monthly Revenue"
          value={formatCurrency(stats.totalMonthlyRevenue)}
        />
        <MetricCard
          icon={<Briefcase className="h-5 w-5" />}
          tone="primary"
          label="Active Jobs"
          value={stats.activeJobsCount}
        />
        <MetricCard
          icon={<TrendingUp className="h-5 w-5" />}
          tone="accent"
          label="Avg Job Value"
          value={formatCurrency(stats.avgJobValue)}
          sublabel="/month"
        />
        <MetricCard
          icon={<Building2 className="h-5 w-5" />}
          tone="warning"
          label="Annual Projection"
          value={formatCurrency(stats.totalMonthlyRevenue * 12)}
        />
        <MetricCard
          icon={<PieChart className="h-5 w-5" />}
          tone="primary"
          label="Top Client Share"
          value={`${topClientShare}%`}
          helper="Monthly revenue concentration"
        />
        <MetricCard
          icon={<PieChart className="h-5 w-5" />}
          tone="accent"
          label="Top 3 Share"
          value={`${top3Share}%`}
          helper="Monthly revenue concentration"
        />
      </div>

      {/* Top Clients + Frequency Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Top Clients by Revenue"
          subtitle="Monthly revenue per client based on active jobs."
          action={
            <Button size="sm" variant="secondary" onClick={() => router.push('/crm')}>
              View CRM <ArrowRight className="h-4 w-4" />
            </Button>
          }
        >
            {stats.topClients.length === 0 ? (
              <p className="text-sm text-muted-foreground">No revenue data yet.</p>
            ) : (
              <div className="space-y-3">
                {stats.topClients.map((client) => (
                  <BreakdownRow
                    key={client.name}
                    left={<span className="text-sm font-medium truncate max-w-[240px]">{client.name}</span>}
                    right={<span className="tabular-nums">{formatCurrency(client.revenue)}/mo</span>}
                    pct={stats.totalMonthlyRevenue > 0 ? client.revenue / stats.totalMonthlyRevenue : 0}
                    rightWidthClassName="w-24"
                  />
                ))}
              </div>
            )}
        </ChartCard>

        <ChartCard title="Revenue by Frequency" subtitle="How monthly revenue breaks down by visit frequency.">
            {Object.keys(freqBreakdown).length === 0 ? (
              <p className="text-sm text-muted-foreground">No job data yet.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(freqBreakdown)
                  .sort((a, b) => b[1].revenue - a[1].revenue)
                  .map(([freq, { count, revenue }]) => (
                    <BreakdownRow
                      key={freq}
                      left={
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge color="blue">{freq}</Badge>
                          <span className="text-xs text-muted-foreground">{count} jobs</span>
                        </div>
                      }
                      right={<span className="tabular-nums">{formatCurrency(revenue)}/mo</span>}
                      pct={stats.totalMonthlyRevenue > 0 ? revenue / stats.totalMonthlyRevenue : 0}
                      rightWidthClassName="w-24"
                    />
                  ))}
              </div>
            )}
        </ChartCard>
      </div>
    </div>
  );
}
