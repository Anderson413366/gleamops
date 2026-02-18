'use client';

import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@gleamops/ui';

interface VersionMetrics {
  monthly_price: number;
  margin_pct: number;
  monthly_hours: number;
  cleaners_needed: number;
  labor_cost: number;
  supplies_cost: number;
  equipment_cost: number;
  overhead_cost: number;
}

interface VersionDiffPanelProps {
  versionIdA: string;
  versionIdB: string;
  versionNumberA: number;
  versionNumberB: number;
  onClose: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

function DeltaIndicator({ a, b, format = 'currency' }: { a: number; b: number; format?: 'currency' | 'percent' | 'number' }) {
  const delta = b - a;
  if (Math.abs(delta) < 0.01) {
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  }
  const isPositive = delta > 0;
  const Icon = isPositive ? ArrowUp : ArrowDown;
  const color = isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  const formatted = format === 'currency' ? fmt(Math.abs(delta)) : format === 'percent' ? fmtPct(Math.abs(delta)) : Math.abs(delta).toFixed(1);
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${color}`}>
      <Icon className="h-3 w-3" />
      {formatted}
    </span>
  );
}

async function fetchVersionMetrics(versionId: string): Promise<VersionMetrics | null> {
  const supabase = getSupabaseBrowserClient();
  const [wRes, pRes] = await Promise.all([
    supabase.from('sales_bid_workload_results').select('*').eq('bid_version_id', versionId).single(),
    supabase.from('sales_bid_pricing_results').select('*').eq('bid_version_id', versionId).single(),
  ]);
  if (!wRes.data || !pRes.data) return null;
  const w = wRes.data as Record<string, unknown>;
  const p = pRes.data as Record<string, unknown>;
  return {
    monthly_price: Number(p.recommended_price ?? 0),
    margin_pct: Number(p.effective_margin_pct ?? 0),
    monthly_hours: Number(w.monthly_hours ?? 0),
    cleaners_needed: Number(w.cleaners_needed ?? 0),
    labor_cost: Number(p.burdened_labor_cost ?? 0),
    supplies_cost: Number(p.supplies_cost ?? 0),
    equipment_cost: Number(p.equipment_cost ?? 0),
    overhead_cost: Number(p.overhead_cost ?? 0),
  };
}

const METRIC_ROWS: Array<{ key: keyof VersionMetrics; label: string; format: 'currency' | 'percent' | 'number' }> = [
  { key: 'monthly_price', label: 'Monthly Price', format: 'currency' },
  { key: 'margin_pct', label: 'Margin', format: 'percent' },
  { key: 'monthly_hours', label: 'Monthly Hours', format: 'number' },
  { key: 'cleaners_needed', label: 'Cleaners', format: 'number' },
  { key: 'labor_cost', label: 'Labor Cost', format: 'currency' },
  { key: 'supplies_cost', label: 'Supplies', format: 'currency' },
  { key: 'equipment_cost', label: 'Equipment', format: 'currency' },
  { key: 'overhead_cost', label: 'Overhead', format: 'currency' },
];

export function VersionDiffPanel({ versionIdA, versionIdB, versionNumberA, versionNumberB, onClose }: VersionDiffPanelProps) {
  const [metricsA, setMetricsA] = useState<VersionMetrics | null>(null);
  const [metricsB, setMetricsB] = useState<VersionMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchVersionMetrics(versionIdA),
      fetchVersionMetrics(versionIdB),
    ]).then(([a, b]) => {
      setMetricsA(a);
      setMetricsB(b);
      setLoading(false);
    });
  }, [versionIdA, versionIdB]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-4 space-y-3">
          <Skeleton className="h-6 w-48" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!metricsA || !metricsB) {
    return (
      <Card>
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">Could not load comparison data for the selected versions.</p>
          <button type="button" onClick={onClose} className="text-xs text-primary hover:underline mt-2">
            Close comparison
          </button>
        </CardContent>
      </Card>
    );
  }

  const formatValue = (val: number, format: 'currency' | 'percent' | 'number') => {
    if (format === 'currency') return fmt(val);
    if (format === 'percent') return fmtPct(val);
    return val.toFixed(1);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Version Comparison</CardTitle>
          <button type="button" onClick={onClose} className="text-xs text-primary hover:underline">
            Close
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Column headers */}
        <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground mb-2 pb-2 border-b border-border">
          <span>Metric</span>
          <span className="text-right">v{versionNumberA}</span>
          <span className="text-right">v{versionNumberB}</span>
          <span className="text-right">Delta</span>
        </div>

        {/* Rows */}
        <div className="space-y-1.5">
          {METRIC_ROWS.map((row) => {
            const a = metricsA[row.key];
            const b = metricsB[row.key];
            return (
              <div key={row.key} className="grid grid-cols-4 gap-2 text-xs">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="text-right font-medium tabular-nums">{formatValue(a, row.format)}</span>
                <span className="text-right font-medium tabular-nums">{formatValue(b, row.format)}</span>
                <span className="text-right">
                  <DeltaIndicator a={a} b={b} format={row.format} />
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
