/**
 * CSV column definitions for the Supply Calculator export.
 */
import type { SupplyItemResult } from '@gleamops/cleanflow';

export const SUPPLY_CSV_COLUMNS: { key: keyof SupplyItemResult; label: string }[] = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
  { key: 'product_family', label: 'Product Family' },
  { key: 'unit', label: 'Unit' },
  { key: 'unit_cost', label: 'Unit Cost' },
  { key: 'freight_per_unit', label: 'Freight' },
  { key: 'shrink_pct', label: 'Shrink %' },
  { key: 'landed_cost', label: 'Landed Cost' },
  { key: 'target_margin_pct', label: 'Target Margin %' },
  { key: 'actual_margin_pct', label: 'Actual Margin %' },
  { key: 'sale_price', label: 'Sale Price' },
  { key: 'contribution', label: 'Contribution' },
  { key: 'quantity', label: 'Qty' },
  { key: 'line_total', label: 'Line Total' },
  { key: 'volume_discount_pct', label: 'Volume Discount %' },
  { key: 'discounted_line_total', label: 'Discounted Total' },
  { key: 'margin_health', label: 'Margin Health' },
];
