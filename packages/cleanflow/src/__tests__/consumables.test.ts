import { describe, it, expect } from 'vitest';
import { calculateConsumables, DEFAULT_CONSUMABLE_ITEMS } from '../consumables';
import type { ConsumableItem } from '../types';

describe('calculateConsumables', () => {
  it('returns zero for empty items', () => {
    const result = calculateConsumables([]);
    expect(result.items).toHaveLength(0);
    expect(result.total_monthly).toBe(0);
  });

  it('calculates single item cost (occupant × units × unit_cost)', () => {
    const items: ConsumableItem[] = [
      {
        name: 'Toilet Paper',
        category: 'PAPER',
        unit_cost: 0.85,
        units_per_occupant_per_month: 4,
        occupant_count: 50,
      },
    ];
    const result = calculateConsumables(items);
    // 50 * 4 * 0.85 = 170.00
    expect(result.total_monthly).toBe(170);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].monthly_cost).toBe(170);
  });

  it('calculates 5 items with 50 occupants', () => {
    const items: ConsumableItem[] = [
      { name: 'Toilet Paper', category: 'PAPER', unit_cost: 0.85, units_per_occupant_per_month: 4, occupant_count: 50 },
      { name: 'Paper Towels', category: 'PAPER', unit_cost: 1.20, units_per_occupant_per_month: 2, occupant_count: 50 },
      { name: 'Hand Soap', category: 'SOAP', unit_cost: 0.05, units_per_occupant_per_month: 8, occupant_count: 50 },
      { name: 'Trash Liners', category: 'LINER', unit_cost: 0.15, units_per_occupant_per_month: 20, occupant_count: 50 },
      { name: 'Sanitizer', category: 'CHEMICAL', unit_cost: 0.08, units_per_occupant_per_month: 4, occupant_count: 50 },
    ];

    const result = calculateConsumables(items);

    // Toilet Paper: 50 * 4 * 0.85 = 170
    // Paper Towels: 50 * 2 * 1.20 = 120
    // Hand Soap: 50 * 8 * 0.05 = 20
    // Trash Liners: 50 * 20 * 0.15 = 150
    // Sanitizer: 50 * 4 * 0.08 = 16
    // Total = 476
    expect(result.items).toHaveLength(5);
    expect(result.total_monthly).toBe(476);
  });

  it('covers all 5 categories (PAPER, SOAP, LINER, CHEMICAL, OTHER)', () => {
    const items: ConsumableItem[] = [
      { name: 'TP', category: 'PAPER', unit_cost: 1, units_per_occupant_per_month: 1, occupant_count: 10 },
      { name: 'Soap', category: 'SOAP', unit_cost: 1, units_per_occupant_per_month: 1, occupant_count: 10 },
      { name: 'Liners', category: 'LINER', unit_cost: 1, units_per_occupant_per_month: 1, occupant_count: 10 },
      { name: 'Bleach', category: 'CHEMICAL', unit_cost: 1, units_per_occupant_per_month: 1, occupant_count: 10 },
      { name: 'Freshener', category: 'OTHER', unit_cost: 1, units_per_occupant_per_month: 1, occupant_count: 10 },
    ];

    const result = calculateConsumables(items);
    // 5 * (10 * 1 * 1) = 50
    expect(result.total_monthly).toBe(50);
    const categories = result.items.map((i) => i.category);
    expect(categories).toContain('PAPER');
    expect(categories).toContain('SOAP');
    expect(categories).toContain('LINER');
    expect(categories).toContain('CHEMICAL');
    expect(categories).toContain('OTHER');
  });

  it('handles zero occupants', () => {
    const items: ConsumableItem[] = [
      { name: 'TP', category: 'PAPER', unit_cost: 0.85, units_per_occupant_per_month: 4, occupant_count: 0 },
    ];
    const result = calculateConsumables(items);
    expect(result.total_monthly).toBe(0);
    expect(result.items[0].monthly_cost).toBe(0);
  });

  it('rounds monthly_cost to 2 decimal places', () => {
    const items: ConsumableItem[] = [
      { name: 'Item', category: 'OTHER', unit_cost: 0.33, units_per_occupant_per_month: 3, occupant_count: 7 },
    ];
    const result = calculateConsumables(items);
    // 7 * 3 * 0.33 = 6.93
    expect(result.items[0].monthly_cost).toBe(6.93);
  });

  it('DEFAULT_CONSUMABLE_ITEMS has 6 items with 0 occupants', () => {
    expect(DEFAULT_CONSUMABLE_ITEMS).toHaveLength(6);
    for (const item of DEFAULT_CONSUMABLE_ITEMS) {
      expect(item.occupant_count).toBe(0);
      expect(item.unit_cost).toBeGreaterThan(0);
      expect(item.units_per_occupant_per_month).toBeGreaterThan(0);
    }
  });
});
