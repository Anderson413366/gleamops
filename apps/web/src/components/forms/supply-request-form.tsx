'use client';

import { Input, Textarea } from '@gleamops/ui';

interface SupplyRequestFormProps {
  item: string;
  quantity: string;
  notes: string;
  onItemChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onNotesChange: (value: string) => void;
}

export function SupplyRequestForm({
  item,
  quantity,
  notes,
  onItemChange,
  onQuantityChange,
  onNotesChange,
}: SupplyRequestFormProps) {
  return (
    <div className="space-y-3">
      <Input
        label="Item Needed"
        value={item}
        onChange={(event) => onItemChange(event.target.value)}
        placeholder="e.g., Restroom paper"
      />
      <Input
        label="Quantity"
        type="number"
        min={1}
        value={quantity}
        onChange={(event) => onQuantityChange(event.target.value)}
      />
      <Textarea
        label="Notes"
        value={notes}
        onChange={(event) => onNotesChange(event.target.value)}
        placeholder="Optional notes for purchasing/stocking"
        rows={3}
      />
    </div>
  );
}
