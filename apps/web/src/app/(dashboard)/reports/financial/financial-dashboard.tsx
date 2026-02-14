'use client';

import { useEffect, useState, useCallback } from 'react';
import { DollarSign, TrendingUp, Building2, Briefcase } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, Skeleton, Badge } from '@gleamops/ui';

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

export default function FinancialDashboard() {
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

    const [jobsRes, clientsRes] = await Promise.all([
      supabase
        .from('site_jobs')
        .select('id, billing_amount, frequency, status, site:site_id(name, client:client_id(name))')
        .eq('status', 'ACTIVE')
        .is('archived_at', null),
      supabase
        .from('clients')
        .select('id, name')
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

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Monthly Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalMonthlyRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Jobs</p>
                <p className="text-2xl font-bold">{stats.activeJobsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Job Value</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.avgJobValue)}</p>
                <p className="text-xs text-muted-foreground">/month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Building2 className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Annual Projection</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalMonthlyRevenue * 12)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Clients + Frequency Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Top Clients by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topClients.length === 0 ? (
              <p className="text-sm text-muted-foreground">No revenue data yet.</p>
            ) : (
              <div className="space-y-3">
                {stats.topClients.map((client, i) => (
                  <div key={client.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                      <span className="text-sm font-medium truncate max-w-[200px]">{client.name}</span>
                    </div>
                    <span className="text-sm font-medium tabular-nums">{formatCurrency(client.revenue)}/mo</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Frequency</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(freqBreakdown).length === 0 ? (
              <p className="text-sm text-muted-foreground">No job data yet.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(freqBreakdown)
                  .sort((a, b) => b[1].revenue - a[1].revenue)
                  .map(([freq, { count, revenue }]) => (
                    <div key={freq} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge color="blue">{freq}</Badge>
                        <span className="text-xs text-muted-foreground">{count} jobs</span>
                      </div>
                      <span className="text-sm font-medium tabular-nums">{formatCurrency(revenue)}/mo</span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
