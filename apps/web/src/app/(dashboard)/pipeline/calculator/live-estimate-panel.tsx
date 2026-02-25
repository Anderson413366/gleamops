'use client';

import { useState, useMemo } from 'react';
import { BarChart3, ChevronDown, AlertTriangle, TrendingUp, Scale, Gauge } from 'lucide-react';
import { Badge, CollapsibleCard } from '@gleamops/ui';
import type { WorkloadResult, PricingResult, ContractTerms } from '@gleamops/cleanflow';
import { calculateContractProjection } from '@gleamops/cleanflow';
import { INDUSTRY_BENCHMARK_RATES } from '@gleamops/shared';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface WhatIfMethod {
  method: string;
  label: string;
  monthly_price: number;
  margin_pct: number;
  hourly_rate: number;
}

interface LiveEstimatePanelProps {
  workload: WorkloadResult | null;
  pricing: PricingResult | null;
  isReviewStep?: boolean;
  /** What-if comparison: alternative pricing results keyed by method */
  whatIfMethods?: WhatIfMethod[];
  /** Currently selected pricing method */
  currentMethod?: string;
  /** Callback when user clicks a row in the what-if comparison */
  onPricingMethodChange?: (method: string) => void;
  /** Contract terms for projection */
  contractTerms?: ContractTerms;
  /** Building type code for benchmark lookup */
  buildingTypeCode?: string;
  /** Total sqft for price_per_sqft calculation */
  totalSqft?: number;
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
export function LiveEstimatePanel({
  workload,
  pricing,
  isReviewStep,
  whatIfMethods,
  currentMethod,
  onPricingMethodChange,
  contractTerms,
  buildingTypeCode,
  totalSqft,
}: LiveEstimatePanelProps) {
  const [expanded, setExpanded] = useState(false);

  // Contract projection
  const projection = useMemo(() => {
    if (!pricing || !contractTerms || !contractTerms.length_months || contractTerms.length_months <= 0) return null;
    return calculateContractProjection(pricing.recommended_price, contractTerms);
  }, [pricing, contractTerms]);

  // Benchmark rate
  const benchmark = useMemo(() => {
    if (!buildingTypeCode || !totalSqft || totalSqft <= 0 || !pricing) return null;
    const key = buildingTypeCode.toUpperCase();
    const rates = INDUSTRY_BENCHMARK_RATES[key];
    if (!rates) return null;
    const pricePerSqft = pricing.recommended_price / totalSqft;
    return { pricePerSqft, ...rates };
  }, [buildingTypeCode, totalSqft, pricing]);

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

          {/* Industry Benchmark Gauge */}
          {benchmark && (
            <div className="border-t border-border pt-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Industry Benchmark ($/sqft/mo)</span>
              </div>
              <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                {/* Range: low to high*1.3 to show premium zone */}
                {(() => {
                  const rangeMax = benchmark.high * 1.3;
                  const lowPos = ((benchmark.low / rangeMax) * 100);
                  const midPos = ((benchmark.mid / rangeMax) * 100);
                  const highPos = ((benchmark.high / rangeMax) * 100);
                  const bidPos = Math.min((benchmark.pricePerSqft / rangeMax) * 100, 100);
                  return (
                    <>
                      <div className="absolute inset-y-0 bg-green-200 dark:bg-green-900/40 rounded-full" style={{ left: `${lowPos}%`, width: `${midPos - lowPos}%` }} />
                      <div className="absolute inset-y-0 bg-yellow-200 dark:bg-yellow-900/40 rounded-full" style={{ left: `${midPos}%`, width: `${highPos - midPos}%` }} />
                      <div className="absolute inset-y-0 bg-red-200 dark:bg-red-900/40 rounded-full" style={{ left: `${highPos}%`, right: 0 }} />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 h-3 w-1 rounded-full bg-primary ring-2 ring-background"
                        style={{ left: `${bidPos}%` }}
                      />
                    </>
                  );
                })()}
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-muted-foreground tabular-nums">
                <span>${benchmark.low.toFixed(2)}</span>
                <span className="font-medium text-foreground">${benchmark.pricePerSqft.toFixed(3)}/sqft</span>
                <span>${benchmark.high.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contract Revenue Projection */}
      {projection && projection.years.length > 0 && (
        <CollapsibleCard
          id="estimate-contract-projection"
          title="Contract Projection"
          icon={<TrendingUp className="h-4 w-4" />}
          className="mt-3"
        >
          <div className="space-y-2 text-xs">
            {projection.years.map((y) => (
              <div key={y.year} className="flex justify-between">
                <span className="text-muted-foreground">Year {y.year}</span>
                <span className="tabular-nums">
                  {fmt(y.monthly)}/mo &middot; {fmt(y.annual)}/yr
                </span>
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-1.5 mt-1.5 font-medium">
              <span>Total Contract Value</span>
              <span className="tabular-nums text-primary">{fmt(projection.total_contract_value)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Effective Monthly Avg</span>
              <span className="tabular-nums">{fmt(projection.effective_monthly_avg)}</span>
            </div>
          </div>
        </CollapsibleCard>
      )}

      {/* What-If Pricing Comparison */}
      {whatIfMethods && whatIfMethods.length > 1 && (
        <CollapsibleCard
          id="estimate-what-if"
          title="Compare Methods"
          icon={<Scale className="h-4 w-4" />}
          className="mt-3"
        >
          <div className="space-y-1">
            {whatIfMethods.map((m) => {
              const isCurrent = m.method === currentMethod;
              return (
                <button
                  key={m.method}
                  type="button"
                  onClick={() => onPricingMethodChange?.(m.method)}
                  className={`flex items-center justify-between w-full rounded-md px-2 py-1.5 text-xs transition-colors ${
                    isCurrent
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    <span>{m.label}</span>
                  </span>
                  <span className="flex items-center gap-3 tabular-nums">
                    <span>{fmt(m.monthly_price)}</span>
                    <Badge
                      color={m.margin_pct >= 20 ? 'green' : m.margin_pct >= 10 ? 'yellow' : 'red'}
                    >
                      {fmtPct(m.margin_pct)}
                    </Badge>
                    <span className="text-muted-foreground">{fmt(m.hourly_rate)}/hr</span>
                  </span>
                </button>
              );
            })}
          </div>
        </CollapsibleCard>
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
