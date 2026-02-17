'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrainCircuit, TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Badge, Card, CardContent, CardHeader } from '@gleamops/ui';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type ItemRow = {
  id: string;
  item_name: string;
  item_category: string;
  uom: string;
  unit_cost: number | null;
  reorder_point: number | null;
  reorder_qty: number | null;
  is_active: boolean;
};

type StockLevelRow = {
  item_id: string;
  inventory_location_id: string;
  quantity_on_hand: number;
  quantity_reserved: number;
};

type StockMovementRow = {
  item_id: string;
  movement_type: string;
  quantity: number;
  moved_at: string;
  from_inventory_location_id: string | null;
};

type PurchaseOrderRow = {
  id: string;
  status: string;
};

type PurchaseOrderLineRow = {
  purchase_order_id: string;
  item_id: string;
  quantity_ordered: number;
  quantity_received: number;
};

type InventoryLocationRow = {
  id: string;
  name: string;
  location_type: string;
  is_active: boolean;
};

type ForecastRow = {
  item: ItemRow;
  onHand: number;
  pendingQty: number;
  monthlyUsage: number;
  dailyUsage: number;
  reorderPoint: number;
  suggestedOrder: number;
  estimatedCost: number;
  coverageDays: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  risk: 'CRITICAL' | 'WATCH' | 'HEALTHY';
};

interface Props {
  search: string;
}

function riskBadgeColor(risk: ForecastRow['risk']): 'red' | 'yellow' | 'green' {
  switch (risk) {
    case 'CRITICAL':
      return 'red';
    case 'WATCH':
      return 'yellow';
    case 'HEALTHY':
    default:
      return 'green';
  }
}

function confidenceBadgeColor(confidence: ForecastRow['confidence']): 'blue' | 'yellow' | 'gray' {
  switch (confidence) {
    case 'HIGH':
      return 'blue';
    case 'MEDIUM':
      return 'yellow';
    case 'LOW':
    default:
      return 'gray';
  }
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ForecastingPanel({ search }: Props) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ForecastRow[]>([]);
  const [locations, setLocations] = useState<InventoryLocationRow[]>([]);
  const [locationFilter, setLocationFilter] = useState('ALL');

  const load = useCallback(async () => {
    setLoading(true);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const [
      itemsRes,
      stockLevelsRes,
      movementsRes,
      locationsRes,
      purchaseOrdersRes,
      purchaseOrderLinesRes,
    ] = await Promise.all([
      supabase
        .from('items')
        .select('id, item_name, item_category, uom, unit_cost, reorder_point, reorder_qty, is_active')
        .is('archived_at', null)
        .eq('is_active', true)
        .limit(1200),
      supabase
        .from('stock_levels')
        .select('item_id, inventory_location_id, quantity_on_hand, quantity_reserved')
        .is('archived_at', null)
        .limit(4000),
      supabase
        .from('stock_movements')
        .select('item_id, movement_type, quantity, moved_at, from_inventory_location_id')
        .eq('movement_type', 'CONSUME')
        .is('archived_at', null)
        .gte('moved_at', ninetyDaysAgo.toISOString())
        .limit(8000),
      supabase
        .from('inventory_locations')
        .select('id, name, location_type, is_active')
        .is('archived_at', null)
        .eq('is_active', true)
        .order('name', { ascending: true })
        .limit(1000),
      supabase
        .from('purchase_orders')
        .select('id, status')
        .is('archived_at', null)
        .in('status', ['DRAFT', 'SENT', 'PARTIALLY_RECEIVED'])
        .limit(3000),
      supabase
        .from('purchase_order_lines')
        .select('purchase_order_id, item_id, quantity_ordered, quantity_received')
        .is('archived_at', null)
        .limit(10000),
    ]);

    const errors = [
      itemsRes.error,
      stockLevelsRes.error,
      movementsRes.error,
      locationsRes.error,
      purchaseOrdersRes.error,
      purchaseOrderLinesRes.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      toast.error(errors[0]?.message ?? 'Failed to load forecasting data.');
      setLoading(false);
      return;
    }

    const items = (itemsRes.data ?? []) as ItemRow[];
    const stockLevels = (stockLevelsRes.data ?? []) as StockLevelRow[];
    const movements = (movementsRes.data ?? []) as StockMovementRow[];
    const inventoryLocations = (locationsRes.data ?? []) as InventoryLocationRow[];
    const purchaseOrders = (purchaseOrdersRes.data ?? []) as PurchaseOrderRow[];
    const purchaseOrderLines = (purchaseOrderLinesRes.data ?? []) as PurchaseOrderLineRow[];

    setLocations(inventoryLocations);

    const relevantLocationIds = locationFilter === 'ALL'
      ? new Set(inventoryLocations.map((location) => location.id))
      : new Set([locationFilter]);

    const onHandByItem = new Map<string, number>();
    for (const row of stockLevels) {
      if (!relevantLocationIds.has(row.inventory_location_id)) continue;
      const available = (row.quantity_on_hand ?? 0) - (row.quantity_reserved ?? 0);
      onHandByItem.set(row.item_id, (onHandByItem.get(row.item_id) ?? 0) + Math.max(available, 0));
    }

    const consumeQtyByItem = new Map<string, number>();
    const consumeEventsByItem = new Map<string, number>();
    for (const movement of movements) {
      if (locationFilter !== 'ALL' && movement.from_inventory_location_id !== locationFilter) continue;
      const quantity = movement.quantity ?? 0;
      consumeQtyByItem.set(movement.item_id, (consumeQtyByItem.get(movement.item_id) ?? 0) + quantity);
      consumeEventsByItem.set(movement.item_id, (consumeEventsByItem.get(movement.item_id) ?? 0) + 1);
    }

    const activePoIds = new Set(purchaseOrders.map((order) => order.id));
    const pendingByItem = new Map<string, number>();
    for (const line of purchaseOrderLines) {
      if (!activePoIds.has(line.purchase_order_id)) continue;
      const pending = Math.max((line.quantity_ordered ?? 0) - (line.quantity_received ?? 0), 0);
      if (pending === 0) continue;
      pendingByItem.set(line.item_id, (pendingByItem.get(line.item_id) ?? 0) + pending);
    }

    const computedRows: ForecastRow[] = items.map((item) => {
      const consumedLastNinety = consumeQtyByItem.get(item.id) ?? 0;
      const monthlyUsage = consumedLastNinety / 3;
      const dailyUsage = monthlyUsage / 30;

      const onHand = onHandByItem.get(item.id) ?? 0;
      const pendingQty = pendingByItem.get(item.id) ?? 0;
      const reorderPoint = item.reorder_point ?? Math.max(1, Math.ceil(monthlyUsage * 1.5));
      const reorderQtyDefault = item.reorder_qty ?? Math.max(1, Math.ceil(monthlyUsage));

      const effectiveQty = onHand + pendingQty;
      const suggestedOrder = effectiveQty < reorderPoint
        ? Math.max(reorderQtyDefault, reorderPoint - effectiveQty + Math.ceil(monthlyUsage * 0.5))
        : 0;

      const estimatedCost = suggestedOrder * (item.unit_cost ?? 0);
      const coverageDays = dailyUsage > 0 ? onHand / dailyUsage : 999;

      const eventCount = consumeEventsByItem.get(item.id) ?? 0;
      const confidence: ForecastRow['confidence'] = eventCount >= 12 ? 'HIGH' : eventCount >= 5 ? 'MEDIUM' : 'LOW';

      const risk: ForecastRow['risk'] = coverageDays < 7
        ? 'CRITICAL'
        : coverageDays < 14
          ? 'WATCH'
          : 'HEALTHY';

      return {
        item,
        onHand,
        pendingQty,
        monthlyUsage,
        dailyUsage,
        reorderPoint,
        suggestedOrder,
        estimatedCost,
        coverageDays,
        confidence,
        risk,
      };
    });

    computedRows.sort((a, b) => {
      const riskRank = { CRITICAL: 0, WATCH: 1, HEALTHY: 2 } as const;
      if (riskRank[a.risk] !== riskRank[b.risk]) return riskRank[a.risk] - riskRank[b.risk];
      return b.monthlyUsage - a.monthlyUsage;
    });

    setRows(computedRows);
    setLoading(false);
  }, [locationFilter, supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      row.item.item_name.toLowerCase().includes(q)
      || row.item.item_category.toLowerCase().includes(q)
      || row.item.uom.toLowerCase().includes(q)
      || row.risk.toLowerCase().includes(q)
      || row.confidence.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const metrics = useMemo(() => {
    const monthlyDemand = filteredRows.reduce((sum, row) => sum + row.monthlyUsage, 0);
    const atRiskItems = filteredRows.filter((row) => row.risk !== 'HEALTHY').length;
    const suggestedCost = filteredRows.reduce((sum, row) => sum + row.estimatedCost, 0);
    const highConfidenceRows = filteredRows.filter((row) => row.confidence === 'HIGH').length;
    return {
      monthlyDemand,
      atRiskItems,
      suggestedCost,
      highConfidenceRows,
    };
  }, [filteredRows]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Monthly Demand (Units)</p><p className="text-xl font-semibold">{metrics.monthlyDemand.toFixed(0)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">At-Risk Items</p><p className="text-xl font-semibold text-warning">{metrics.atRiskItems}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Suggested Order Value</p><p className="text-xl font-semibold">{formatMoney(metrics.suggestedCost)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">High-Confidence Signals</p><p className="text-xl font-semibold text-blue-600">{metrics.highConfidenceRows}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Forecasting & Auto-Replenish</h3>
            </div>
            <select
              value={locationFilter}
              onChange={(event) => setLocationFilter(event.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
            >
              <option value="ALL">All inventory locations</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name} ({location.location_type})
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-muted-foreground">Recommendations use last 90 days of consumption movements with reorder-point and pending-PO adjustments.</p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading forecast signals...</p>
          ) : filteredRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No forecast data found.</p>
          ) : (
            <div className="space-y-2">
              {filteredRows.slice(0, 120).map((row) => (
                <div key={row.item.id} className="rounded-lg border border-border px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{row.item.item_name}</p>
                    <div className="flex items-center gap-2">
                      <Badge color={riskBadgeColor(row.risk)}>{row.risk}</Badge>
                      <Badge color={confidenceBadgeColor(row.confidence)}>{row.confidence}</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{row.item.item_category} · {row.item.uom}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground md:grid-cols-4">
                    <span>On Hand: <span className="font-medium text-foreground">{row.onHand}</span></span>
                    <span>Pending PO: <span className="font-medium text-foreground">{row.pendingQty}</span></span>
                    <span>Monthly Usage: <span className="font-medium text-foreground">{row.monthlyUsage.toFixed(1)}</span></span>
                    <span>Coverage: <span className="font-medium text-foreground">{row.coverageDays >= 365 ? '365+ days' : `${row.coverageDays.toFixed(1)} days`}</span></span>
                    <span>Reorder Point: <span className="font-medium text-foreground">{row.reorderPoint}</span></span>
                    <span>Suggested Order: <span className="font-medium text-foreground">{row.suggestedOrder}</span></span>
                    <span>Est. Cost: <span className="font-medium text-foreground">{formatMoney(row.estimatedCost)}</span></span>
                    <span>Daily Usage: <span className="font-medium text-foreground">{row.dailyUsage.toFixed(2)}</span></span>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    {row.risk === 'CRITICAL' ? <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> : <ShieldCheck className="h-3.5 w-3.5 text-green-600" />}
                    {row.suggestedOrder > 0
                      ? <span>Recommendation: order <span className="font-semibold text-foreground">{row.suggestedOrder}</span> units to recover buffer.</span>
                      : <span>Inventory is healthy at current demand and reorder settings.</span>}
                    <TrendingUp className="ml-auto h-3.5 w-3.5 text-blue-600" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
