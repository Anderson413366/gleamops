'use client';

import { Plus, Trash2, Package } from 'lucide-react';
import { Input, Select, Button, Card, CardContent, CardHeader, CardTitle } from '@gleamops/ui';
import type { ConsumableItem } from '@gleamops/cleanflow';
import { calculateConsumables, DEFAULT_CONSUMABLE_ITEMS } from '@gleamops/cleanflow';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface ConsumablesStepProps {
  items: ConsumableItem[];
  onChange: (items: ConsumableItem[]) => void;
}

const CATEGORY_OPTIONS = [
  { value: 'PAPER', label: 'Paper' },
  { value: 'SOAP', label: 'Soap' },
  { value: 'LINER', label: 'Liner' },
  { value: 'CHEMICAL', label: 'Chemical' },
  { value: 'OTHER', label: 'Other' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ConsumablesStep({ items, onChange }: ConsumablesStepProps) {
  const addItem = () => {
    onChange([...items, {
      name: '',
      category: 'OTHER',
      unit_cost: 0,
      units_per_occupant_per_month: 0,
      occupant_count: 0,
    }]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, patch: Partial<ConsumableItem>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const loadDefaults = (occupantCount: number) => {
    onChange(DEFAULT_CONSUMABLE_ITEMS.map((item) => ({ ...item, occupant_count: occupantCount })));
  };

  const setAllOccupants = (count: number) => {
    onChange(items.map((item) => ({ ...item, occupant_count: count })));
  };

  const result = items.length > 0 ? calculateConsumables(items) : null;
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  const currentOccupants = items.length > 0 ? items[0].occupant_count : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Consumables</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => loadDefaults(currentOccupants || 50)}>
              Load Defaults
            </Button>
            <Button variant="secondary" size="sm" onClick={addItem}>
              <Plus className="h-3.5 w-3.5" /> Add Item
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Item-level occupancy-based consumable costs. Overrides flat monthly consumables.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">
            No consumable items — using flat monthly rate from Costs step.
          </p>
        ) : (
          <>
            {/* Global occupant count */}
            <div className="flex items-end gap-3 p-3 rounded-lg bg-muted/30">
              <div className="w-48">
                <Input
                  label="Building Occupants"
                  type="number"
                  value={currentOccupants}
                  onChange={(e) => setAllOccupants(Number(e.target.value))}
                  placeholder="e.g. 75"
                />
              </div>
              <p className="text-xs text-muted-foreground pb-2">Applied to all items</p>
            </div>

            {/* Item rows */}
            {items.map((item, i) => (
              <div key={i} className="flex items-end gap-2 p-3 rounded-lg border border-border">
                <div className="flex-1">
                  <Input
                    label="Item"
                    value={item.name}
                    onChange={(e) => updateItem(i, { name: e.target.value })}
                    placeholder="e.g. Toilet Paper (rolls)"
                  />
                </div>
                <div className="w-24">
                  <Select
                    label="Category"
                    value={item.category}
                    onChange={(e) => updateItem(i, { category: e.target.value as ConsumableItem['category'] })}
                    options={CATEGORY_OPTIONS}
                  />
                </div>
                <div className="w-20">
                  <Input
                    label="$/unit"
                    type="number"
                    step="0.01"
                    value={item.unit_cost}
                    onChange={(e) => updateItem(i, { unit_cost: Number(e.target.value) })}
                  />
                </div>
                <div className="w-24">
                  <Input
                    label="Units/occ/mo"
                    type="number"
                    step="0.1"
                    value={item.units_per_occupant_per_month}
                    onChange={(e) => updateItem(i, { units_per_occupant_per_month: Number(e.target.value) })}
                  />
                </div>
                <button type="button" onClick={() => removeItem(i)} className="text-muted-foreground hover:text-destructive pb-2">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            {/* Totals */}
            {result && (
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Total Monthly Consumables</p>
                  <p className="text-sm font-bold">{fmt(result.total_monthly)}</p>
                </div>
                <div className="mt-2 space-y-1">
                  {result.items.map((ci, i) => (
                    <div key={i} className="flex justify-between text-xs text-muted-foreground">
                      <span>{ci.name || `Item ${i + 1}`}</span>
                      <span>{fmt(ci.monthly_cost)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
