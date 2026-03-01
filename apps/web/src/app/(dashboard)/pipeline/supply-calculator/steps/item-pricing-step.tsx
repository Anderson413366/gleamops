'use client';

import { AlertTriangle } from 'lucide-react';
import {
  Badge,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
} from '@gleamops/ui';
import type {
  CustomerTier,
  SupplyPricingMethod,
  SupplyPricingResult,
  SupplyItemInput,
  SupplyMarginHealth,
} from '@gleamops/cleanflow';
import {
  PRODUCT_FAMILY_LABELS,
  marginToMarkup,
  markupToMargin,
} from '@gleamops/cleanflow';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface ItemPricingStepProps {
  items: SupplyItemInput[];
  result: SupplyPricingResult | null;
  customerTier: CustomerTier;
  pricingMethod: SupplyPricingMethod;
  onUpdateItem: (index: number, patch: Partial<SupplyItemInput>) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const healthColor: Record<SupplyMarginHealth, string> = {
  healthy: 'text-success',
  caution: 'text-warning',
  below_floor: 'text-destructive',
};

const healthDot: Record<SupplyMarginHealth, string> = {
  healthy: 'bg-success',
  caution: 'bg-warning',
  below_floor: 'bg-destructive',
};

const healthBadge: Record<SupplyMarginHealth, 'green' | 'yellow' | 'red'> = {
  healthy: 'green',
  caution: 'yellow',
  below_floor: 'red',
};

// Family sort order
const FAMILY_ORDER = ['PAPER_COMMODITIES', 'HAND_SOAP_SANITIZER', 'GENERAL_CHEMICALS', 'SPECIALTY_FLOOR'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ItemPricingStep({
  items,
  result,
  customerTier,
  pricingMethod,
  onUpdateItem,
}: ItemPricingStepProps) {
  if (!result || result.items.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Add items in Step 1 to see pricing.
      </div>
    );
  }

  // Sort items by family order, then by cost descending within family
  const sortedItems = [...result.items].sort((a, b) => {
    const fa = FAMILY_ORDER.indexOf(a.product_family);
    const fb = FAMILY_ORDER.indexOf(b.product_family);
    if (fa !== fb) return fa - fb;
    return b.unit_cost - a.unit_cost;
  });

  // Find original index for each result item
  const findOriginalIndex = (code: string): number =>
    items.findIndex((i) => i.code === code);

  const belowFloorItems = result.items.filter((i) => i.margin_health === 'below_floor');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Item Pricing — {customerTier} Tier, {pricingMethod === 'MARGIN' ? 'Margin' : 'Markup'} Method
        </h3>
      </div>

      {/* Warning banner */}
      {belowFloorItems.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-3">
          <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
          <p className="text-sm text-warning">
            {belowFloorItems.length} item{belowFloorItems.length !== 1 ? 's' : ''} below 20%
            margin floor:{' '}
            {belowFloorItems.map((i) => `${i.code} (${i.actual_margin_pct}%)`).join(', ')}
          </p>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Family</TableHead>
              <TableHead className="text-right">Unit Cost</TableHead>
              <TableHead className="text-right">Freight</TableHead>
              <TableHead className="text-right">Shrink%</TableHead>
              <TableHead className="text-right">Landed</TableHead>
              <TableHead className="text-right">Margin%</TableHead>
              <TableHead className="text-right">Sale Price</TableHead>
              <TableHead className="text-right">Contribution</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Line Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedItems.map((item) => {
              const origIdx = findOriginalIndex(item.code);
              const dualLabel =
                pricingMethod === 'MARGIN'
                  ? `${item.actual_margin_pct}% margin = ${marginToMarkup(item.actual_margin_pct)}% markup`
                  : `${item.actual_margin_pct}% markup = ${markupToMargin(item.actual_margin_pct)}% margin`;

              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{item.code}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge color={healthBadge[item.margin_health]}>
                      {PRODUCT_FAMILY_LABELS[item.product_family]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {fmt(item.unit_cost)}
                  </TableCell>
                  <TableCell className="text-right">
                    <input
                      type="number"
                      step="0.01"
                      value={items[origIdx]?.freight_per_unit ?? 0}
                      onChange={(e) =>
                        origIdx >= 0 &&
                        onUpdateItem(origIdx, { freight_per_unit: Number(e.target.value) })
                      }
                      className="w-16 rounded-lg border border-border bg-background px-2 py-1 text-right text-sm"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <input
                      type="number"
                      step="0.5"
                      value={items[origIdx]?.shrink_pct ?? 2}
                      onChange={(e) =>
                        origIdx >= 0 &&
                        onUpdateItem(origIdx, { shrink_pct: Number(e.target.value) })
                      }
                      className="w-14 rounded-lg border border-border bg-background px-2 py-1 text-right text-sm"
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {fmt(item.landed_cost)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Tooltip content={dualLabel}>
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${healthDot[item.margin_health]}`}
                        />
                        <input
                          type="number"
                          step="0.5"
                          value={items[origIdx]?.override_margin_pct ?? item.target_margin_pct}
                          onChange={(e) => {
                            if (origIdx >= 0) {
                              const val = e.target.value;
                              onUpdateItem(origIdx, {
                                override_margin_pct: val ? Number(val) : undefined,
                              });
                            }
                          }}
                          className={`w-16 rounded-lg border border-border bg-background px-2 py-1 text-right text-sm ${healthColor[item.margin_health]}`}
                        />
                      </span>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {fmt(item.sale_price)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-success">
                    {fmt(item.contribution)}
                  </TableCell>
                  <TableCell className="text-right">
                    <input
                      type="number"
                      min="1"
                      value={items[origIdx]?.quantity ?? 1}
                      onChange={(e) =>
                        origIdx >= 0 &&
                        onUpdateItem(origIdx, { quantity: Number(e.target.value) || 1 })
                      }
                      className="w-14 rounded-lg border border-border bg-background px-2 py-1 text-right text-sm"
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium">
                    {fmt(item.discounted_line_total)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Running totals */}
      <div className="rounded-lg bg-muted/50 p-4">
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-[11px] text-muted-foreground">Total Cost</p>
            <p className="font-bold">{fmt(result.total_cost)}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Total Revenue</p>
            <p className="font-bold">{fmt(result.total_revenue)}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Blended Margin</p>
            <p className={`font-bold ${healthColor[result.margin_health]}`}>
              {result.blended_margin_pct}%
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Blended Markup</p>
            <p className="font-bold">{result.blended_markup_pct}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
