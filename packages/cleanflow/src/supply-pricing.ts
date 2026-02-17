/**
 * Supply pricing engine — pure functions, no DB calls.
 * Implements AC-SUM-007 formulas: landed cost → sale price → margins → aggregation.
 * All monetary results rounded to 2 decimal places.
 */
import type {
  CustomerTier,
  SupplyProductFamily,
  SupplyPricingMethod,
  SupplyItemInput,
  SupplyItemResult,
  SupplyPricingInput,
  SupplyPricingResult,
  SupplyMarginHealth,
  VolumeDiscountBracket,
} from './types';
import {
  SUPPLY_MARGIN_TARGETS,
  MARGIN_FLOOR_PCT,
  BLENDED_TARGET_MIN,
  DELIVERY_FEE_TIERS,
  EMERGENCY_DELIVERY_FEE,
} from './supply-constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const round2 = (n: number): number => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// 1. Landed Cost
// ---------------------------------------------------------------------------
export function calculateLandedCost(item: {
  unit_cost: number;
  freight_per_unit: number;
  shrink_pct: number;
}): number {
  return round2(item.unit_cost + item.freight_per_unit + item.unit_cost * (item.shrink_pct / 100));
}

// ---------------------------------------------------------------------------
// 2. Sale Price (from landed cost + method + percentage)
// ---------------------------------------------------------------------------
export function calculateSalePrice(
  landedCost: number,
  method: SupplyPricingMethod,
  pct: number
): number {
  if (method === 'MARGIN') {
    if (pct >= 100) return landedCost;
    return round2(landedCost / (1 - pct / 100));
  }
  // MARKUP
  return round2(landedCost * (1 + pct / 100));
}

// ---------------------------------------------------------------------------
// 3. Margin ↔ Markup conversions
// ---------------------------------------------------------------------------
export function marginToMarkup(marginPct: number): number {
  if (marginPct >= 100) return 0;
  return round2((marginPct / (100 - marginPct)) * 100);
}

export function markupToMargin(markupPct: number): number {
  if (markupPct <= -100) return 0;
  return round2((markupPct / (100 + markupPct)) * 100);
}

// ---------------------------------------------------------------------------
// 4. Volume Discount (incremental brackets)
// ---------------------------------------------------------------------------
export function calculateVolumeDiscount(
  qty: number,
  unitPrice: number,
  brackets: VolumeDiscountBracket[]
): { total: number; effective_discount_pct: number } {
  if (qty <= 0 || brackets.length === 0) {
    return { total: round2(qty * unitPrice), effective_discount_pct: 0 };
  }

  let total = 0;
  let remaining = qty;

  // Sort brackets by min_quantity ascending
  const sorted = [...brackets].sort((a, b) => a.min_quantity - b.min_quantity);

  for (const bracket of sorted) {
    if (remaining <= 0) break;
    const bracketMax = bracket.max_quantity ?? Infinity;
    const bracketSize = bracketMax - bracket.min_quantity + 1;
    const unitsInBracket = Math.min(remaining, bracketSize);
    const discountedPrice = unitPrice * (1 - bracket.discount_pct / 100);
    total += unitsInBracket * discountedPrice;
    remaining -= unitsInBracket;
  }

  // If any remaining units beyond last bracket, use last bracket's discount
  if (remaining > 0 && sorted.length > 0) {
    const lastBracket = sorted[sorted.length - 1]!;
    const discountedPrice = unitPrice * (1 - lastBracket.discount_pct / 100);
    total += remaining * discountedPrice;
  }

  total = round2(total);
  const fullPrice = qty * unitPrice;
  const effectiveDiscount = fullPrice > 0 ? round2(((fullPrice - total) / fullPrice) * 100) : 0;

  return { total, effective_discount_pct: effectiveDiscount };
}

// ---------------------------------------------------------------------------
// 5. Delivery Fee
// ---------------------------------------------------------------------------
export function calculateDeliveryFee(orderValue: number, isEmergency: boolean): number {
  if (isEmergency) return EMERGENCY_DELIVERY_FEE;

  for (const tier of DELIVERY_FEE_TIERS) {
    const max = tier.max_order ?? Infinity;
    if (orderValue >= tier.min_order && orderValue < max) {
      return tier.fee;
    }
  }
  return 0;
}

// ---------------------------------------------------------------------------
// 6. Price Single Item
// ---------------------------------------------------------------------------
export function priceSupplyItem(
  item: SupplyItemInput,
  tier: CustomerTier,
  method: SupplyPricingMethod,
  managementFeePct: number,
  volumeBrackets: VolumeDiscountBracket[] | null
): SupplyItemResult {
  const landedCost = calculateLandedCost(item);

  // Determine target margin for this product family + tier
  const targetMarginPct = SUPPLY_MARGIN_TARGETS[item.product_family][tier];

  // Use override if provided, otherwise use tier/family default
  const actualMarginPct = item.override_margin_pct ?? targetMarginPct;

  // Calculate sale price
  const salePrice = calculateSalePrice(landedCost, method, actualMarginPct);

  // Contribution per unit
  const contribution = round2(salePrice - landedCost);

  // Line total before volume discount
  const lineTotal = round2(salePrice * item.quantity);

  // Volume discount
  let volumeDiscountPct = 0;
  let discountedLineTotal = lineTotal;
  if (volumeBrackets && volumeBrackets.length > 0 && item.quantity > 0) {
    const volResult = calculateVolumeDiscount(item.quantity, salePrice, volumeBrackets);
    discountedLineTotal = volResult.total;
    volumeDiscountPct = volResult.effective_discount_pct;
  }

  // Management fee on this item's revenue
  const managementFeeAmount = round2(discountedLineTotal * (managementFeePct / 100));

  // Margin health classification
  let marginHealth: SupplyMarginHealth = 'healthy';
  if (actualMarginPct < MARGIN_FLOOR_PCT) {
    marginHealth = 'below_floor';
  } else if (actualMarginPct < targetMarginPct) {
    marginHealth = 'caution';
  }

  return {
    id: item.id ?? item.code,
    code: item.code,
    name: item.name,
    product_family: item.product_family,
    unit: item.unit,
    unit_cost: item.unit_cost,
    freight_per_unit: item.freight_per_unit,
    shrink_pct: item.shrink_pct,
    quantity: item.quantity,
    landed_cost: landedCost,
    target_margin_pct: targetMarginPct,
    actual_margin_pct: actualMarginPct,
    sale_price: salePrice,
    contribution,
    line_total: lineTotal,
    volume_discount_pct: volumeDiscountPct,
    discounted_line_total: discountedLineTotal,
    management_fee_amount: managementFeeAmount,
    margin_health: marginHealth,
  };
}

// ---------------------------------------------------------------------------
// 7. Main Entry Point — calculateSupplyPricing
// ---------------------------------------------------------------------------
export function calculateSupplyPricing(input: SupplyPricingInput): SupplyPricingResult {
  const warnings: string[] = [];

  // Determine management fee percentage for per-item allocation
  const mgmtFeePct =
    input.management_fee.enabled && input.management_fee.mode !== 'FLAT'
      ? input.management_fee.fee_pct
      : 0;

  // Price each item
  const items = input.items.map((item) =>
    priceSupplyItem(
      item,
      input.customer_tier,
      input.pricing_method,
      mgmtFeePct,
      input.volume_discounts.enabled ? input.volume_discounts.brackets : null
    )
  );

  // Aggregate totals
  const totalCost = round2(items.reduce((sum, i) => sum + i.landed_cost * i.quantity, 0));
  const totalRevenue = round2(items.reduce((sum, i) => sum + i.discounted_line_total, 0));
  const totalContribution = round2(totalRevenue - totalCost);

  // Blended margin
  const blendedMarginPct = totalRevenue > 0
    ? round2((totalContribution / totalRevenue) * 100)
    : 0;
  const blendedMarkupPct = totalCost > 0
    ? round2((totalContribution / totalCost) * 100)
    : 0;

  // Management fee calculation
  let totalManagementFee = 0;
  if (input.management_fee.enabled) {
    if (input.management_fee.mode === 'FLAT') {
      totalManagementFee = input.management_fee.flat_amount;
    } else {
      totalManagementFee = round2(items.reduce((sum, i) => sum + i.management_fee_amount, 0));
    }
  }

  // Grand total
  const grandTotal = round2(totalRevenue + totalManagementFee);

  // Delivery fee estimate
  const deliveryFee = calculateDeliveryFee(grandTotal, false);

  // Monthly allowance estimate
  let monthlyAllowance: number | undefined;
  if (input.allowance) {
    if (input.allowance.method === 'PER_PERSON') {
      monthlyAllowance = round2(
        (input.allowance.occupant_count * input.allowance.rate) / 12
      );
    } else {
      monthlyAllowance = round2(
        (input.allowance.total_sqft * input.allowance.rate) / 12
      );
    }
  }

  // All-inclusive budget estimate
  let allInclusiveBudget: number | undefined;
  if (input.all_inclusive) {
    allInclusiveBudget = round2(
      input.all_inclusive.monthly_cleaning_rate * (input.all_inclusive.supply_pct / 100)
    );
  }

  // Guardrail warnings
  const belowFloorItems = items.filter((i) => i.actual_margin_pct < MARGIN_FLOOR_PCT);
  if (belowFloorItems.length > 0) {
    const codes = belowFloorItems.map((i) => `${i.code} (${i.actual_margin_pct}%)`).join(', ');
    warnings.push(`${belowFloorItems.length} item(s) below ${MARGIN_FLOOR_PCT}% margin floor: ${codes}`);
  }

  if (blendedMarginPct < BLENDED_TARGET_MIN && items.length > 0) {
    warnings.push(
      `Blended margin ${blendedMarginPct}% is below ${BLENDED_TARGET_MIN}% target minimum`
    );
  }

  if (
    input.management_fee.enabled &&
    input.management_fee.mode !== 'FLAT' &&
    input.management_fee.fee_pct < 3
  ) {
    warnings.push(
      `Management fee ${input.management_fee.fee_pct}% is below playbook minimum of 3%`
    );
  }

  // Overall margin health
  let marginHealth: SupplyMarginHealth = 'healthy';
  if (belowFloorItems.length > 0) {
    marginHealth = 'below_floor';
  } else if (blendedMarginPct < BLENDED_TARGET_MIN && items.length > 0) {
    marginHealth = 'caution';
  }

  return {
    items,
    total_cost: totalCost,
    total_revenue: totalRevenue,
    total_contribution: totalContribution,
    blended_margin_pct: blendedMarginPct,
    blended_markup_pct: blendedMarkupPct,
    total_management_fee: totalManagementFee,
    grand_total: grandTotal,
    delivery_fee: deliveryFee,
    monthly_allowance: monthlyAllowance,
    all_inclusive_budget: allInclusiveBudget,
    warnings,
    margin_health: marginHealth,
  };
}
