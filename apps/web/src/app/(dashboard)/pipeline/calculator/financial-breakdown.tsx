'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@gleamops/ui';
import type { PricingResult } from '@gleamops/cleanflow';

interface FinancialBreakdownProps {
  pricing: PricingResult | null;
}

interface BreakdownRow {
  key: string;
  label: string;
  value: number;
  pctRevenue: number | null;
  emphasis?: boolean;
}

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function formatMoney(value: number): string {
  return currency.format(value);
}

function formatPct(value: number | null): string {
  return value == null ? '—' : `${value.toFixed(1)}%`;
}

export function FinancialBreakdown({ pricing }: FinancialBreakdownProps) {
  if (!pricing) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Financial Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Add estimate inputs to see monthly values and revenue mix.
        </CardContent>
      </Card>
    );
  }

  const revenue = pricing.recommended_price || 0;
  const hasPositiveRevenue = revenue > 0;
  const grossProfit = revenue - pricing.total_monthly_cost;
  const rows: BreakdownRow[] = [
    {
      key: 'labor',
      label: 'Burdened Labor',
      value: pricing.burdened_labor_cost,
      pctRevenue: hasPositiveRevenue ? (pricing.burdened_labor_cost / revenue) * 100 : null,
    },
    {
      key: 'supplies',
      label: 'Supplies',
      value: pricing.supplies_cost,
      pctRevenue: hasPositiveRevenue ? (pricing.supplies_cost / revenue) * 100 : null,
    },
    {
      key: 'equipment',
      label: 'Equipment',
      value: pricing.equipment_cost,
      pctRevenue: hasPositiveRevenue ? (pricing.equipment_cost / revenue) * 100 : null,
    },
    {
      key: 'overhead',
      label: 'Overhead',
      value: pricing.overhead_cost,
      pctRevenue: hasPositiveRevenue ? (pricing.overhead_cost / revenue) * 100 : null,
    },
    {
      key: 'gross_profit',
      label: 'Gross Profit',
      value: grossProfit,
      pctRevenue: hasPositiveRevenue ? (grossProfit / revenue) * 100 : null,
      emphasis: true,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Financial Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground">
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4 text-right">Monthly Value</th>
                <th className="py-2 text-right">% Revenue</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.key}
                  className={row.emphasis ? 'bg-primary/5 font-semibold text-foreground' : 'text-foreground'}
                >
                  <td className="py-2 pr-4">{row.label}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{formatMoney(row.value)}</td>
                  <td className="py-2 text-right tabular-nums">{formatPct(row.pctRevenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">Total Monthly Cost</p>
            <p className="text-sm font-semibold tabular-nums">{formatMoney(pricing.total_monthly_cost)}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">Total Monthly Revenue</p>
            <p className="text-sm font-semibold tabular-nums">{formatMoney(revenue)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
