'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Box, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  EmptyState,
  Pagination,
  TableSkeleton,
  SlideOver,
  Input,
  Select,
  Textarea,
  Button,
  ExportButton,
} from '@gleamops/ui';
import type { SupplyKit, SupplyCatalog } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

interface KitWithCount extends SupplyKit {
  item_count: number;
}

interface KitItem {
  id?: string;
  supply_id: string;
  supply_name: string;
  quantity: number;
}

interface KitsTableProps {
  search: string;
  autoCreate?: boolean;
  onAutoCreateHandled?: () => void;
}

export default function KitsTable({ search, autoCreate, onAutoCreateHandled }: KitsTableProps) {
  const [rows, setRows] = useState<KitWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  // SlideOver form state
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<KitWithCount | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Form field values
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Kit items management
  const [kitItems, setKitItems] = useState<KitItem[]>([]);
  const [allSupplies, setAllSupplies] = useState<SupplyCatalog[]>([]);
  const [addSupplyId, setAddSupplyId] = useState('');
  const [addQuantity, setAddQuantity] = useState('1');

  const isEdit = !!editItem;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    // Fetch kits with item counts
    const { data, error } = await supabase
      .from('supply_kits')
      .select('*, supply_kit_items(id)')
      .is('archived_at', null)
      .order('name');

    if (!error && data) {
      const kitsWithCount = data.map((kit: Record<string, unknown>) => ({
        ...kit,
        item_count: Array.isArray(kit.supply_kit_items) ? kit.supply_kit_items.length : 0,
        supply_kit_items: undefined,
      })) as unknown as KitWithCount[];
      setRows(kitsWithCount);
    }
    setLoading(false);
  }, []);

  const fetchSupplies = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase
      .from('supply_catalog')
      .select('*')
      .is('archived_at', null)
      .order('name');
    if (data) setAllSupplies(data as unknown as SupplyCatalog[]);
  }, []);

  const fetchKitItems = useCallback(async (kitId: string) => {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase
      .from('supply_kit_items')
      .select('id, supply_id, quantity, supply:supply_catalog!supply_kit_items_supply_id_fkey(name)')
      .eq('kit_id', kitId)
      .is('archived_at', null);

    if (data) {
      setKitItems(
        data.map((item: Record<string, unknown>) => ({
          id: item.id as string,
          supply_id: item.supply_id as string,
          supply_name: (item.supply as Record<string, unknown>)?.name as string ?? 'Unknown',
          quantity: item.quantity as number,
        }))
      );
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchSupplies();
  }, [fetchData, fetchSupplies]);

  // Auto-create trigger from parent
  useEffect(() => {
    if (autoCreate && !loading) {
      handleAdd();
      onAutoCreateHandled?.();
    }
  }, [autoCreate, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[],
    'name',
    'asc'
  );
  const sortedRows = sorted as unknown as KitWithCount[];
  const pag = usePagination(sortedRows, 25);

  // --- Form helpers ---

  const resetForm = useCallback(() => {
    setCode('');
    setName('');
    setDescription('');
    setKitItems([]);
    setAddSupplyId('');
    setAddQuantity('1');
    setFormErrors({});
    setEditItem(null);
  }, []);

  const handleAdd = useCallback(() => {
    resetForm();
    setFormOpen(true);

    // Generate next code
    const supabase = getSupabaseBrowserClient();
    supabase.rpc('next_code', { p_tenant_id: null, p_prefix: 'KIT' }).then(({ data }) => {
      if (data) setCode(data);
    });
  }, [resetForm]);

  const handleEdit = useCallback(async (row: KitWithCount) => {
    setEditItem(row);
    setCode(row.code);
    setName(row.name);
    setDescription(row.description ?? '');
    setFormErrors({});
    setFormOpen(true);
    await fetchKitItems(row.id);
  }, [fetchKitItems]);

  const handleClose = useCallback(() => {
    setFormOpen(false);
    resetForm();
  }, [resetForm]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!code.trim()) errs.code = 'Code is required';
    if (!name.trim()) errs.name = 'Name is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Add supply item to kit
  const handleAddItem = () => {
    if (!addSupplyId) return;
    const qty = parseInt(addQuantity, 10);
    if (isNaN(qty) || qty < 1) return;

    // Prevent duplicates
    if (kitItems.some((item) => item.supply_id === addSupplyId)) return;

    const supply = allSupplies.find((s) => s.id === addSupplyId);
    if (!supply) return;

    setKitItems((prev) => [
      ...prev,
      {
        supply_id: addSupplyId,
        supply_name: supply.name,
        quantity: qty,
      },
    ]);
    setAddSupplyId('');
    setAddQuantity('1');
  };

  // Remove supply item from kit
  const handleRemoveItem = (index: number) => {
    setKitItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setFormLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      const tenantId = user?.app_metadata?.tenant_id;

      if (isEdit) {
        // Update kit details
        const { error } = await supabase
          .from('supply_kits')
          .update({
            name: name.trim(),
            description: description.trim() || null,
          })
          .eq('id', editItem!.id)
          .eq('version_etag', editItem!.version_etag);
        if (error) throw error;

        // Sync kit items: delete existing, re-insert
        await supabase
          .from('supply_kit_items')
          .delete()
          .eq('kit_id', editItem!.id);

        if (kitItems.length > 0) {
          const itemInserts = kitItems.map((item) => ({
            kit_id: editItem!.id,
            supply_id: item.supply_id,
            quantity: item.quantity,
            tenant_id: tenantId,
          }));
          const { error: itemErr } = await supabase
            .from('supply_kit_items')
            .insert(itemInserts);
          if (itemErr) throw itemErr;
        }
      } else {
        // Create kit
        const { data: newKit, error } = await supabase
          .from('supply_kits')
          .insert({
            code: code.trim(),
            name: name.trim(),
            description: description.trim() || null,
            tenant_id: tenantId,
          })
          .select('id')
          .single();
        if (error) throw error;

        // Insert kit items
        if (kitItems.length > 0 && newKit) {
          const itemInserts = kitItems.map((item) => ({
            kit_id: newKit.id,
            supply_id: item.supply_id,
            quantity: item.quantity,
            tenant_id: tenantId,
          }));
          const { error: itemErr } = await supabase
            .from('supply_kit_items')
            .insert(itemInserts);
          if (itemErr) throw itemErr;
        }
      }

      handleClose();
      fetchData();
      toast.success(isEdit ? 'Kit updated' : 'Kit created');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save kit';
      toast.error(message, { duration: Infinity });
    } finally {
      setFormLoading(false);
    }
  };

  // Available supplies (not already in kit)
  const availableSupplies = useMemo(() => {
    const usedIds = new Set(kitItems.map((item) => item.supply_id));
    return allSupplies
      .filter((s) => !usedIds.has(s.id))
      .map((s) => ({ value: s.id, label: `${s.code} — ${s.name}` }));
  }, [allSupplies, kitItems]);

  // --- Render ---

  if (loading) return <TableSkeleton rows={8} cols={4} />;

  if (filtered.length === 0) {
    return (
      <>
        <EmptyState
          icon={<Box className="h-12 w-12" />}
          title="No kits yet"
          description={search ? 'Try a different search term.' : 'Create your first kit to get started.'}
        />
        <SlideOver open={formOpen} onClose={handleClose} title={isEdit ? 'Edit Kit' : 'New Kit'} subtitle={isEdit ? editItem?.code : undefined} wide>
          {renderForm()}
        </SlideOver>
      </>
    );
  }

  function renderForm() {
    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Kit details */}
        <div className="space-y-4">
          <Input
            label="Kit Code"
            value={code}
            readOnly
            disabled
            hint="Auto-generated"
            error={formErrors.code}
          />
          <Input
            label="Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setFormErrors((prev) => {
                const next = { ...prev };
                delete next.name;
                return next;
              });
            }}
            error={formErrors.name}
            required
          />
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Kit items management */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Kit Items</h3>

          {kitItems.length > 0 && (
            <div className="border border-border rounded-lg divide-y divide-border">
              {kitItems.map((item, index) => (
                <div key={item.supply_id} className="flex items-center justify-between px-3 py-2">
                  <div className="flex-1">
                    <span className="text-sm font-medium text-foreground">{item.supply_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">Qty: {item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-1 rounded text-destructive hover:bg-destructive/10 transition-colors"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {kitItems.length === 0 && (
            <p className="text-sm text-muted-foreground italic">No items added yet.</p>
          )}

          {/* Add item row */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Select
                label="Supply"
                value={addSupplyId}
                onChange={(e) => setAddSupplyId(e.target.value)}
                options={availableSupplies}
                placeholder="Select a supply..."
              />
            </div>
            <div className="w-20">
              <Input
                label="Qty"
                type="number"
                min={1}
                value={addQuantity}
                onChange={(e) => setAddQuantity(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleAddItem}
              disabled={!addSupplyId}
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={formLoading}>
            {isEdit ? 'Save Changes' : 'Create Kit'}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="kits"
          columns={[
            { key: 'code', label: 'Code' },
            { key: 'name', label: 'Name' },
            { key: 'description', label: 'Description' },
            { key: 'item_count', label: 'Items' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
      </div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'code' && sortDir} onSort={() => onSort('code')}>
              Code
            </TableHead>
            <TableHead sortable sorted={sortKey === 'name' && sortDir} onSort={() => onSort('name')}>
              Name
            </TableHead>
            <TableHead>Description</TableHead>
            <TableHead sortable sorted={sortKey === 'item_count' && sortDir} onSort={() => onSort('item_count')}>
              Items
            </TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow
              key={row.id}
              onClick={() => handleEdit(row)}
            >
              <TableCell className="font-mono text-xs">{row.code}</TableCell>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell className="text-muted-foreground max-w-xs truncate">{row.description ?? '—'}</TableCell>
              <TableCell>{row.item_count}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        currentPage={pag.currentPage}
        totalPages={pag.totalPages}
        totalItems={pag.totalItems}
        pageSize={pag.pageSize}
        hasNext={pag.hasNext}
        hasPrev={pag.hasPrev}
        onNext={pag.nextPage}
        onPrev={pag.prevPage}
      />

      <SlideOver open={formOpen} onClose={handleClose} title={isEdit ? 'Edit Kit' : 'New Kit'} subtitle={isEdit ? editItem?.code : undefined} wide>
        {renderForm()}
      </SlideOver>
    </div>
  );
}
