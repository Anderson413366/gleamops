'use client';

import { useEffect, useState, useCallback } from 'react';
import { Package, Boxes, Truck, AlertTriangle, DollarSign, ShoppingCart, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Skeleton, Button } from '@gleamops/ui';
import { MetricCard, BreakdownRow, MiniBars, ChartCard } from '../_components/report-components';

interface InventoryStats {
  catalogItems: number;
  activeSupplies: number;
  totalKits: number;
  vehicleCount: number;
  siteSupplyAssignments: number;
}

interface CategoryBreakdown {
  [category: string]: number;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
}

export default function InventoryDashboard(props: { rangeDays: number; refreshKey: number }) {
  const router = useRouter();
  const [stats, setStats] = useState<InventoryStats>({
    catalogItems: 0,
    activeSupplies: 0,
    totalKits: 0,
    vehicleCount: 0,
    siteSupplyAssignments: 0,
  });
  const [categories, setCategories] = useState<CategoryBreakdown>({});
  const [topSupplies, setTopSupplies] = useState<{ name: string; unit_cost: number; category: string }[]>([]);
  const [orderSpendSeries, setOrderSpendSeries] = useState<number[]>([]);
  const [orderStats, setOrderStats] = useState<{ totalOrders: number; inTransit: number; spend: number }>({ totalOrders: 0, inTransit: 0, spend: 0 });
  const [loading, setLoading] = useState(true);

  const buildDailyLabels = (days: number) => {
    const out: { key: string; label: string }[] = [];
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      out.push({ key: d.toISOString().slice(0, 10), label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) });
    }
    return out;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const rangeStart = new Date(Date.now() - props.rangeDays * 86400000).toISOString().slice(0, 10);

    const [catalogRes, kitsRes, vehiclesRes, siteSuppliesRes, ordersRes] = await Promise.all([
      supabase
        .from('supply_catalog')
        .select('id, name, category, unit_cost, supply_status')
        .is('archived_at', null),
      supabase
        .from('supply_kits')
        .select('id', { count: 'exact', head: true })
        .is('archived_at', null),
      supabase
        .from('vehicles')
        .select('id', { count: 'exact', head: true })
        .is('archived_at', null),
      supabase
        .from('site_supplies')
        .select('id', { count: 'exact', head: true })
        .is('archived_at', null),
      supabase
        .from('supply_orders')
        .select('order_date, status, total_amount')
        .gte('order_date', rangeStart)
        .is('archived_at', null),
    ]);

    if (catalogRes.data) {
      const byCategory: CategoryBreakdown = {};
      const active = catalogRes.data.filter((s) => s.supply_status !== 'DISCONTINUED');

      for (const item of catalogRes.data) {
        const cat = item.category || 'Uncategorized';
        byCategory[cat] = (byCategory[cat] || 0) + 1;
      }

      const sorted = [...catalogRes.data]
        .filter((s) => s.unit_cost != null)
        .sort((a, b) => (b.unit_cost || 0) - (a.unit_cost || 0))
        .slice(0, 10)
        .map((s) => ({ name: s.name, unit_cost: s.unit_cost || 0, category: s.category || '—' }));

      setStats({
        catalogItems: catalogRes.data.length,
        activeSupplies: active.length,
        totalKits: kitsRes.count || 0,
        vehicleCount: vehiclesRes.count || 0,
        siteSupplyAssignments: siteSuppliesRes.count || 0,
      });
      setCategories(byCategory);
      setTopSupplies(sorted);
    }

    if (ordersRes.data) {
      const byDay: Record<string, number> = {};
      let totalOrders = 0;
      let inTransit = 0;
      let spend = 0;
      for (const o of ordersRes.data as unknown as { order_date: string; status: string; total_amount: number | null }[]) {
        totalOrders++;
        if (o.status === 'ORDERED' || o.status === 'SHIPPED') inTransit++;
        const amt = o.total_amount || 0;
        spend += amt;
        const key = o.order_date;
        byDay[key] = (byDay[key] || 0) + amt;
      }
      const labels = buildDailyLabels(Math.min(14, Math.max(7, props.rangeDays)));
      setOrderSpendSeries(labels.map((d) => Math.round((byDay[d.key] || 0) * 100) / 100));
      setOrderStats({ totalOrders, inTransit, spend });
    }

    setLoading(false);
  }, [props.rangeDays]);

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

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          icon={<Package className="h-5 w-5" />}
          tone="primary"
          label="Catalog Items"
          value={stats.catalogItems}
          helper={`${stats.activeSupplies} active`}
        />
        <MetricCard
          icon={<Boxes className="h-5 w-5" />}
          tone="success"
          label="Supply Kits"
          value={stats.totalKits}
        />
        <MetricCard
          icon={<Truck className="h-5 w-5" />}
          tone="accent"
          label="Vehicles"
          value={stats.vehicleCount}
        />
        <MetricCard
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="warning"
          label="Site Supply Records"
          value={stats.siteSupplyAssignments}
        />
        <MetricCard
          icon={<ShoppingCart className="h-5 w-5" />}
          tone="primary"
          label={`Orders (${props.rangeDays}d)`}
          value={orderStats.totalOrders}
          helper={`${orderStats.inTransit} in transit`}
        />
        <MetricCard
          icon={<DollarSign className="h-5 w-5" />}
          tone="accent"
          label={`Supply Spend (${props.rangeDays}d)`}
          value={formatCurrency(orderStats.spend)}
        />
      </div>

      {/* Categories + Top Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          title="Items by Category"
          subtitle="Catalog items grouped by category."
          action={
            <Button size="sm" variant="secondary" onClick={() => router.push('/inventory')}>
              View Inventory <ArrowRight className="h-4 w-4" />
            </Button>
          }
        >
            {Object.keys(categories).length === 0 ? (
              <p className="text-sm text-muted-foreground">No catalog items yet.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(categories)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, count]) => (
                    <BreakdownRow
                      key={cat}
                      left={<span className="text-sm font-medium truncate max-w-[200px]">{cat}</span>}
                      right={count}
                      pct={stats.catalogItems > 0 ? count / stats.catalogItems : 0}
                    />
                  ))}
              </div>
            )}
        </ChartCard>

        <ChartCard title="Highest Cost Items" subtitle="Most expensive items by unit cost.">
            {topSupplies.length === 0 ? (
              <p className="text-sm text-muted-foreground">No supply cost data yet.</p>
            ) : (
              <div className="space-y-3">
                {topSupplies.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.category}</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium tabular-nums ml-2">{formatCurrency(item.unit_cost)}</span>
                  </div>
                ))}
              </div>
            )}
        </ChartCard>

        <ChartCard title="Supply Spend Trend" subtitle={`Order spend by day (last ${props.rangeDays} days)`}>
          {orderSpendSeries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders recorded in this range.</p>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[clamp(1rem,3vw,1.5rem)] font-semibold tabular-nums leading-tight [overflow-wrap:anywhere]">{formatCurrency(orderStats.spend)}</p>
                <p className="text-xs text-muted-foreground">Total spend in range</p>
              </div>
              <MiniBars values={orderSpendSeries} barClassName="fill-success/60" ariaLabel="Supply order spend per day" />
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
