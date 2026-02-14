/**
 * Consumables calculator — item-level occupancy-based assumptions.
 *
 * Each consumable item (toilet paper, soap, liners, etc.) has a per-occupant
 * monthly usage rate. The calculator rolls up to a total monthly cost.
 */
import type { ConsumableItem, ConsumablesResult } from './types';

/**
 * Calculate consumables from item-level occupancy assumptions.
 *
 * @param items - Array of consumable items with per-occupant rates
 * @returns Itemized costs + total monthly
 */
export function calculateConsumables(items: ConsumableItem[]): ConsumablesResult {
  const costed = items.map((item) => {
    const monthlyUnits = item.units_per_occupant_per_month * item.occupant_count;
    const monthlyCost = monthlyUnits * item.unit_cost;
    return {
      ...item,
      monthly_cost: Math.round(monthlyCost * 100) / 100,
    };
  });

  const total = costed.reduce((sum, i) => sum + i.monthly_cost, 0);

  return {
    items: costed,
    total_monthly: Math.round(total * 100) / 100,
  };
}

/**
 * Default consumable items for a standard office building.
 * Occupant count should be overridden per-bid.
 */
export const DEFAULT_CONSUMABLE_ITEMS: ConsumableItem[] = [
  { name: 'Toilet Paper (rolls)', category: 'PAPER', unit_cost: 0.85, units_per_occupant_per_month: 4, occupant_count: 0 },
  { name: 'Paper Towels (rolls)', category: 'PAPER', unit_cost: 1.20, units_per_occupant_per_month: 2, occupant_count: 0 },
  { name: 'Hand Soap (oz)', category: 'SOAP', unit_cost: 0.05, units_per_occupant_per_month: 8, occupant_count: 0 },
  { name: 'Trash Liners (bags)', category: 'LINER', unit_cost: 0.15, units_per_occupant_per_month: 20, occupant_count: 0 },
  { name: 'Sanitizer (oz)', category: 'CHEMICAL', unit_cost: 0.08, units_per_occupant_per_month: 4, occupant_count: 0 },
  { name: 'Air Freshener (cans)', category: 'OTHER', unit_cost: 3.50, units_per_occupant_per_month: 0.1, occupant_count: 0 },
];
