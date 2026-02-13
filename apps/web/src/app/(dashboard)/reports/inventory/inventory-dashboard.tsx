'use client';

import { useEffect, useState, useCallback } from 'react';
import { Package, Boxes, Truck, AlertTriangle } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, Skeleton, Badge } from '@gleamops/ui';

interface InventoryStats {
  catalogItems: number;
  activeSupplies: number;
  totalKits: number;
  vehicleCount: number;
}

interface CategoryBreakdown {
  [category: string]: number;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
}

export default function InventoryDashboard() {
  const [stats, setStats] = useState<InventoryStats>({
    catalogItems: 0,
    activeSupplies: 0,
    totalKits: 0,
    vehicleCount: 0,
  });
  const [categories, setCategories] = useState<CategoryBreakdown>({});
  const [topSupplies, setTopSupplies] = useState<{ name: string; unit_cost: number; category: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    const [catalogRes, kitsRes, vehiclesRes, siteSuppliesRes] = await Promise.all([
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
      });
      setCategories(byCategory);
      setTopSupplies(sorted);
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
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Catalog Items</p>
                <p className="text-2xl font-bold">{stats.catalogItems}</p>
                <p className="text-xs text-muted-foreground">{stats.activeSupplies} active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Boxes className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Supply Kits</p>
                <p className="text-2xl font-bold">{stats.totalKits}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Truck className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vehicles</p>
                <p className="text-2xl font-bold">{stats.vehicleCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Categories</p>
                <p className="text-2xl font-bold">{Object.keys(categories).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories + Top Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Items by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(categories).length === 0 ? (
              <p className="text-sm text-muted-foreground">No catalog items yet.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(categories)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, count]) => (
                    <div key={cat} className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate max-w-[200px]">{cat}</span>
                      <div className="flex items-center gap-2 flex-1 mx-4">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-blue-500"
                            style={{
                              width: `${stats.catalogItems > 0 ? (count / stats.catalogItems) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Highest Cost Items</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
