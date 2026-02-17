'use client';

import { useState } from 'react';
import { Plus, Trash2, Package, Search, Zap, X } from 'lucide-react';
import {
  Input,
  Select,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  EmptyState,
  SearchInput,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
} from '@gleamops/ui';
import type { SupplyItemInput, SupplyProductFamily } from '@gleamops/cleanflow';
import { ANDERSON_ANCHOR_SKUS, PRODUCT_FAMILY_LABELS } from '@gleamops/cleanflow';
import { usePagination } from '@/hooks/use-pagination';
import { useSupplyCatalog } from '../hooks/use-supply-catalog';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface ItemSelectionStepProps {
  items: SupplyItemInput[];
  onSetItems: (items: SupplyItemInput[]) => void;
  onAddItem: (item: SupplyItemInput) => void;
  onRemoveItem: (index: number) => void;
  onUpdateItem: (index: number, patch: Partial<SupplyItemInput>) => void;
}

const FAMILY_OPTIONS: { value: SupplyProductFamily; label: string }[] = [
  { value: 'PAPER_COMMODITIES', label: 'Paper' },
  { value: 'HAND_SOAP_SANITIZER', label: 'Soap / Sanitizer' },
  { value: 'GENERAL_CHEMICALS', label: 'General Chemicals' },
  { value: 'SPECIALTY_FLOOR', label: 'Specialty Floor' },
];

const FAMILY_BADGE_COLORS: Record<SupplyProductFamily, 'blue' | 'green' | 'purple' | 'orange'> = {
  PAPER_COMMODITIES: 'blue',
  HAND_SOAP_SANITIZER: 'green',
  GENERAL_CHEMICALS: 'purple',
  SPECIALTY_FLOOR: 'orange',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ItemSelectionStep({
  items,
  onSetItems,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
}: ItemSelectionStepProps) {
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const catalog = useSupplyCatalog();

  const filteredCatalog = catalog.items.filter(
    (item) =>
      item.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      item.code.toLowerCase().includes(catalogSearch.toLowerCase())
  );
  const pagination = usePagination(filteredCatalog, 10);
  const [selectedCatalogIds, setSelectedCatalogIds] = useState<Set<string>>(new Set());

  const handleLoadAnchors = () => {
    onSetItems(ANDERSON_ANCHOR_SKUS.map((sku) => ({ ...sku })));
  };

  const handleAddCustom = () => {
    onAddItem({
      code: '',
      name: '',
      product_family: 'GENERAL_CHEMICALS',
      unit: 'each',
      unit_cost: 0,
      freight_per_unit: 0,
      shrink_pct: 2,
      quantity: 1,
    });
  };

  const handleAddFromCatalog = () => {
    const existingCodes = new Set(items.map((i) => i.code));
    const newItems = catalog.items.filter(
      (item) => selectedCatalogIds.has(item.id ?? item.code) && !existingCodes.has(item.code)
    );
    onSetItems([...items, ...newItems]);
    setSelectedCatalogIds(new Set());
    setCatalogOpen(false);
  };

  const toggleCatalogItem = (id: string) => {
    setSelectedCatalogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Supply Items</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setCatalogOpen(true)}>
                <Search className="h-3.5 w-3.5" /> Load from Catalog
              </Button>
              <Button variant="secondary" size="sm" onClick={handleLoadAnchors}>
                <Zap className="h-3.5 w-3.5" /> Anderson Anchors
              </Button>
              <Button variant="secondary" size="sm" onClick={handleAddCustom}>
                <Plus className="h-3.5 w-3.5" /> Custom Item
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 ? (
            <EmptyState
              title="No items selected"
              description="Select supplies from your catalog or load Anderson's anchor SKUs to get started."
              icon={<Package className="h-10 w-10" />}
              bullets={[
                'Load from your existing supply catalog',
                'Use anchor SKUs for a quick quote',
                'Add custom items for special products',
              ]}
            />
          ) : (
            <>
              {items.map((item, i) => (
                <div
                  key={`${item.code}-${i}`}
                  className="flex items-end gap-2 rounded-lg border border-border p-3 transition-all duration-200 hover:shadow-sm"
                >
                  <div className="w-28">
                    <Input
                      label="Code"
                      value={item.code}
                      onChange={(e) => onUpdateItem(i, { code: e.target.value })}
                      placeholder="PP-TIS-001"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      label="Name"
                      value={item.name}
                      onChange={(e) => onUpdateItem(i, { name: e.target.value })}
                      placeholder="Product name"
                    />
                  </div>
                  <div className="w-36">
                    <Select
                      label="Family"
                      value={item.product_family}
                      onChange={(e) =>
                        onUpdateItem(i, {
                          product_family: e.target.value as SupplyProductFamily,
                        })
                      }
                      options={FAMILY_OPTIONS}
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      label="Unit Cost"
                      type="number"
                      step="0.01"
                      value={item.unit_cost}
                      onChange={(e) =>
                        onUpdateItem(i, { unit_cost: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="w-20">
                    <Input
                      label="Unit"
                      value={item.unit}
                      onChange={(e) => onUpdateItem(i, { unit: e.target.value })}
                      placeholder="case"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(i)}
                    className="pb-2 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  {items.length} item{items.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Catalog Modal */}
      {catalogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="text-base font-semibold text-foreground">Supply Catalog</h3>
              <button
                type="button"
                onClick={() => setCatalogOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 py-3">
              <SearchInput
                value={catalogSearch}
                onChange={setCatalogSearch}
                placeholder="Search supplies..."
              />
            </div>
            <div className="max-h-96 overflow-y-auto px-5">
              {catalog.loading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Loading catalog...
                </p>
              ) : filteredCatalog.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No supplies found.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Family</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagination.page.map((item) => {
                      const id = item.id ?? item.code;
                      const checked = selectedCatalogIds.has(id);
                      return (
                        <TableRow
                          key={id}
                          className="cursor-pointer"
                          onClick={() => toggleCatalogItem(id)}
                        >
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCatalogItem(id)}
                              className="rounded border-border"
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {item.code}
                          </TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>
                            <Badge color={FAMILY_BADGE_COLORS[item.product_family]}>
                              {PRODUCT_FAMILY_LABELS[item.product_family]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {fmt(item.unit_cost)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-border px-5 py-3">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                pageSize={pagination.pageSize}
                hasNext={pagination.hasNext}
                hasPrev={pagination.hasPrev}
                onNext={pagination.nextPage}
                onPrev={pagination.prevPage}
                onGoTo={pagination.goToPage}
              />
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setCatalogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddFromCatalog}
                  disabled={selectedCatalogIds.size === 0}
                >
                  Add {selectedCatalogIds.size} Item{selectedCatalogIds.size !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
