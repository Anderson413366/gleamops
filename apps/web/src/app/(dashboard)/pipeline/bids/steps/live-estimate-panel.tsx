'use client';

import { useState } from 'react';
import { BarChart3, ChevronDown, AlertTriangle } from 'lucide-react';
import { Badge } from '@gleamops/ui';
import type { WorkloadResult, PricingResult } from '@gleamops/cleanflow';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface LiveEstimatePanelProps {
  workload: WorkloadResult | null;
  pricing: PricingResult | null;
  isReviewStep?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function LiveEstimatePanel({ workload, pricing, isReviewStep }: LiveEstimatePanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (!workload || !pricing) {
    return (
      <div className="mt-6 rounded-lg border border-border bg-muted/30 p-4">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {isReviewStep ? 'Final Estimate' : 'Live Estimate'}
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">Add areas & tasks to see estimate</p>
      </div>
    );
  }

  const total = pricing.recommended_price || 1;
  const laborPct = (pricing.burdened_labor_cost / total) * 100;
  const suppliesPct = (pricing.supplies_cost / total) * 100;
  const equipmentPct = (pricing.equipment_cost / total) * 100;
  const overheadPct = (pricing.overhead_cost / total) * 100;
  const profitPct = Math.max(0, pricing.effective_margin_pct);
  const effectiveHourlyRate = workload.monthly_hours > 0
    ? pricing.recommended_price / workload.monthly_hours
    : 0;

  return (
    <div className="mt-6 rounded-lg border border-border bg-muted/30 p-4">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between w-full mb-3 group"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {isReviewStep ? 'Final Estimate' : 'Live Estimate'}
          </h3>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>{expanded ? 'Hide' : 'Show'} breakdown</span>
          <ChevronDown
            className={`h-3 w-3 transition-transform duration-200 ${expanded ? 'rotate-0' : '-rotate-90'}`}
          />
        </div>
      </button>

      {/* 5-stat row — always visible */}
      <div className="grid grid-cols-5 gap-3">
        <div>
          <p className="text-[10px] text-muted-foreground">Monthly Price</p>
          <p className="text-sm font-bold text-primary">{fmt(pricing.recommended_price)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Margin</p>
          <p className="text-sm font-bold">
            <Badge
              color={
                pricing.effective_margin_pct >= 20
                  ? 'green'
                  : pricing.effective_margin_pct >= 10
                    ? 'yellow'
                    : 'red'
              }
            >
              {fmtPct(pricing.effective_margin_pct)}
            </Badge>
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Monthly Hours</p>
          <p className="text-sm font-bold">{workload.monthly_hours.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Cleaners</p>
          <p className="text-sm font-bold">{workload.cleaners_needed}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Total Cost</p>
          <p className="text-sm font-bold">{fmt(pricing.total_monthly_cost)}</p>
        </div>
      </div>

      {/* Expanded breakdown */}
      {expanded && (
        <div className="mt-4 space-y-3 border-t border-border pt-3">
          {/* Mini cost-stack bar */}
          <div className="flex h-4 rounded-lg overflow-hidden">
            {laborPct > 0 && (
              <div
                className="bg-blue-500"
                style={{ width: `${laborPct}%` }}
                title={`Labor: ${fmtPct(laborPct)}`}
              />
            )}
            {suppliesPct > 0 && (
              <div
                className="bg-emerald-500"
                style={{ width: `${suppliesPct}%` }}
                title={`Supplies: ${fmtPct(suppliesPct)}`}
              />
            )}
            {equipmentPct > 0 && (
              <div
                className="bg-orange-500"
                style={{ width: `${equipmentPct}%` }}
                title={`Equipment: ${fmtPct(equipmentPct)}`}
              />
            )}
            {overheadPct > 0 && (
              <div
                className="bg-purple-500"
                style={{ width: `${overheadPct}%` }}
                title={`Overhead: ${fmtPct(overheadPct)}`}
              />
            )}
            {profitPct > 0 && (
              <div
                className="bg-green-500"
                style={{ width: `${profitPct}%` }}
                title={`Profit: ${fmtPct(profitPct)}`}
              />
            )}
          </div>

          {/* Line items */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-blue-500" />Labor
              </span>
              <span className="font-medium tabular-nums">
                {fmt(pricing.burdened_labor_cost)} <span className="text-muted-foreground">({fmtPct(laborPct)})</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />Supplies
              </span>
              <span className="font-medium tabular-nums">
                {fmt(pricing.supplies_cost)} <span className="text-muted-foreground">({fmtPct(suppliesPct)})</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-orange-500" />Equipment
              </span>
              <span className="font-medium tabular-nums">
                {fmt(pricing.equipment_cost)} <span className="text-muted-foreground">({fmtPct(equipmentPct)})</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-purple-500" />Overhead
              </span>
              <span className="font-medium tabular-nums">
                {fmt(pricing.overhead_cost)} <span className="text-muted-foreground">({fmtPct(overheadPct)})</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-green-500" />Profit
              </span>
              <span className="font-medium tabular-nums">
                {fmt(pricing.recommended_price - pricing.total_monthly_cost)} <span className="text-muted-foreground">({fmtPct(profitPct)})</span>
              </span>
            </div>
            <div className="flex justify-between border-t border-border pt-1.5 mt-1.5">
              <span className="text-muted-foreground">Effective $/hr</span>
              <span className="font-medium tabular-nums">{fmt(effectiveHourlyRate)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {workload.warnings.length > 0 && (
        <div className="mt-2 flex items-start gap-1.5">
          <AlertTriangle className="h-3 w-3 text-warning mt-0.5 shrink-0" />
          <p className="text-[10px] text-warning">{workload.warnings.join('; ')}</p>
        </div>
      )}
    </div>
  );
}
