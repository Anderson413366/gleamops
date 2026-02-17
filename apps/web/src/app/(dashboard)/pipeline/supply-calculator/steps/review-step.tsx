'use client';

import { DollarSign, TrendingUp, Percent, Briefcase, Package, AlertTriangle } from 'lucide-react';
import {
  StatCard,
  Badge,
  Button,
  ExportButton,
  ConfirmDialog,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@gleamops/ui';
import type { SupplyPricingResult, SupplyMarginHealth } from '@gleamops/cleanflow';
import { PRODUCT_FAMILY_LABELS } from '@gleamops/cleanflow';
import type { SupplyCalculatorState } from '../lib/supply-calculator-types';
import { SUPPLY_CSV_COLUMNS } from '../lib/supply-csv-export';
import { useState } from 'react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface ReviewStepProps {
  state: SupplyCalculatorState;
  result: SupplyPricingResult;
  onReset: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const healthBadge: Record<SupplyMarginHealth, 'green' | 'yellow' | 'red'> = {
  healthy: 'green',
  caution: 'yellow',
  below_floor: 'red',
};

const structureLabel: Record<string, string> = {
  LINE_ITEM: 'Line-Item',
  MONTHLY_ALLOWANCE: 'Monthly Allowance',
  ALL_INCLUSIVE: 'All-Inclusive',
};

const tierLabel: Record<string, string> = {
  STRATEGIC: 'Strategic',
  CORE: 'Core',
  BASE: 'Base',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ReviewStep({ state, result, onReset }: ReviewStepProps) {
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // Sort items by contribution descending for the breakdown table
  const sortedByContribution = [...result.items].sort(
    (a, b) => b.contribution * b.quantity - a.contribution * a.quantity
  );

  // Bottom 20% by contribution (whale curve)
  const bottomCutoff = Math.max(1, Math.ceil(result.items.length * 0.2));
  const bottomItemCodes = new Set(
    sortedByContribution
      .slice(-bottomCutoff)
      .map((i) => i.code)
  );

  // Structure comparison estimates
  const lineItemRevenue = result.total_revenue;
  const allowanceEstimate =
    state.allowance
      ? state.allowance.method === 'PER_PERSON'
        ? (state.allowance.occupant_count * state.allowance.rate) / 12
        : (state.allowance.total_sqft * state.allowance.rate) / 12
      : lineItemRevenue * 0.85;
  const allInclusiveEstimate =
    state.allInclusive
      ? (state.allInclusive.monthly_cleaning_rate * state.allInclusive.supply_pct) / 100
      : lineItemRevenue * 0.75;

  // CSV export data
  const csvData = result.items.map((item) => ({
    ...item,
    product_family: PRODUCT_FAMILY_LABELS[item.product_family],
  })) as unknown as Record<string, unknown>[];

  return (
    <div className="space-y-6">
      {/* Hero KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Grand Total"
          value={fmt(result.grand_total)}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          label="Blended Margin"
          value={`${result.blended_margin_pct}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          trend={result.blended_margin_pct >= 25 ? 'On target' : 'Below target'}
          trendUp={result.blended_margin_pct >= 25}
        />
        <StatCard
          label="Blended Markup"
          value={`${result.blended_markup_pct}%`}
          icon={<Percent className="h-5 w-5" />}
        />
        <StatCard
          label="Mgmt Fee"
          value={fmt(result.total_management_fee)}
          icon={<Briefcase className="h-5 w-5" />}
        />
        <StatCard
          label="Items Priced"
          value={result.items.length}
          icon={<Package className="h-5 w-5" />}
        />
      </div>

      {/* Pricing Summary */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-4">Pricing Summary</h3>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Pricing Structure</dt>
            <dd className="font-medium text-foreground">{structureLabel[state.pricingStructure]}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Customer Tier</dt>
            <dd className="font-medium text-foreground">{tierLabel[state.customerTier]}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Pricing Method</dt>
            <dd className="font-medium text-foreground">{state.pricingMethod === 'MARGIN' ? 'Margin' : 'Markup'}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-3">
            <dt className="text-muted-foreground">Total Supply Cost</dt>
            <dd className="font-medium text-foreground">{fmt(result.total_cost)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Total Supply Revenue</dt>
            <dd className="font-medium text-foreground">{fmt(result.total_revenue)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Total Contribution</dt>
            <dd className="font-medium text-success">{fmt(result.total_contribution)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Management Fee</dt>
            <dd className="font-medium text-foreground">
              {fmt(result.total_management_fee)}{' '}
              <span className="text-xs text-muted-foreground">
                ({state.managementFee.mode === 'FLAT' ? 'flat' : `${state.managementFee.fee_pct}%`})
              </span>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Delivery Fee Estimate</dt>
            <dd className="font-medium text-foreground">{fmt(result.delivery_fee)}</dd>
          </div>
        </dl>
      </div>

      {/* Structure Comparison */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Structure Comparison</h3>
        <div className="grid grid-cols-3 gap-4">
          <div
            className={`rounded-lg border p-4 ${
              state.pricingStructure === 'LINE_ITEM'
                ? 'ring-2 ring-primary border-primary'
                : 'border-border'
            }`}
          >
            <p className="text-lg font-bold text-foreground">{fmt(lineItemRevenue)}/mo</p>
            <p className="text-sm text-muted-foreground mt-1">{result.blended_margin_pct}% margin</p>
            <p className="text-xs text-muted-foreground mt-0.5">SKU-by-SKU</p>
          </div>
          <div
            className={`rounded-lg border p-4 ${
              state.pricingStructure === 'MONTHLY_ALLOWANCE'
                ? 'ring-2 ring-primary border-primary'
                : 'border-border'
            }`}
          >
            <p className="text-lg font-bold text-foreground">{fmt(allowanceEstimate)}/mo</p>
            <p className="text-sm text-muted-foreground mt-1">Per-person estimate</p>
            <p className="text-xs text-muted-foreground mt-0.5">Monthly allowance</p>
          </div>
          <div
            className={`rounded-lg border p-4 ${
              state.pricingStructure === 'ALL_INCLUSIVE'
                ? 'ring-2 ring-primary border-primary'
                : 'border-border'
            }`}
          >
            <p className="text-lg font-bold text-foreground">{fmt(allInclusiveEstimate)}/mo</p>
            <p className="text-sm text-muted-foreground mt-1">
              {state.allInclusive ? `${state.allInclusive.supply_pct}%` : '6%'} of rate
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Embedded</p>
          </div>
        </div>
      </div>

      {/* Item Breakdown */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Item Breakdown</h3>
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Family</TableHead>
                <TableHead className="text-right">Margin%</TableHead>
                <TableHead className="text-right">Sale Price</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedByContribution.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.code}</TableCell>
                  <TableCell className="text-sm">{item.name}</TableCell>
                  <TableCell>
                    <Badge color={healthBadge[item.margin_health]}>
                      {PRODUCT_FAMILY_LABELS[item.product_family]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{item.actual_margin_pct}%</TableCell>
                  <TableCell className="text-right font-mono">{fmt(item.sale_price)}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {fmt(item.discounted_line_total)}
                  </TableCell>
                  <TableCell>
                    {bottomItemCodes.has(item.code) && (
                      <Badge color="orange">Low Margin</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
            <div className="text-sm text-warning space-y-1">
              {result.warnings.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <ExportButton
          data={csvData}
          filename="supply-quote"
          columns={SUPPLY_CSV_COLUMNS as { key: keyof Record<string, unknown>; label: string }[]}
          label="Export CSV"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 hover:shadow-md transition-all duration-200"
        />
        <Button variant="secondary" onClick={() => setConfirmResetOpen(true)}>
          Start Over
        </Button>
      </div>

      <ConfirmDialog
        open={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        onConfirm={() => {
          setConfirmResetOpen(false);
          onReset();
        }}
        title="Start Over?"
        description="This will clear all items and settings. Your draft will be removed."
        confirmLabel="Start Over"
        variant="danger"
      />
    </div>
  );
}
