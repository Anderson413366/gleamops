'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Warehouse, ArrowRightLeft, AlertTriangle, ClipboardList } from 'lucide-react';
import { Badge, Card, CardContent, CardHeader } from '@gleamops/ui';
import { toast } from 'sonner';
import { EntityLink } from '@/components/links/entity-link';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type InventoryLocationRow = {
  id: string;
  name: string;
  location_type: string;
  is_active: boolean;
  site_id: string | null;
};

type ItemRow = {
  id: string;
  item_name: string;
  item_category: string;
  uom: string;
  reorder_point: number | null;
  reorder_qty: number | null;
  unit_cost: number | null;
  is_active: boolean;
};

type StockLevelRow = {
  inventory_location_id: string;
  item_id: string;
  quantity_on_hand: number;
  quantity_reserved: number;
};

type MovementRow = {
  id: string;
  item_id: string;
  movement_type: string;
  quantity: number;
  moved_at: string;
  from_inventory_location_id: string | null;
  to_inventory_location_id: string | null;
  notes: string | null;
};

type SupplyRequestRow = {
  id: string;
  status: string;
  requested_at: string;
  site_id: string | null;
  inventory_location_id: string | null;
  requested_by_staff_id: string;
  notes: string | null;
};

type SiteRow = {
  id: string;
  site_code: string;
  name: string;
};

type StaffRow = {
  id: string;
  staff_code: string;
  full_name: string | null;
};

interface Props {
  search: string;
}

interface LowStockRow {
  location: InventoryLocationRow;
  item: ItemRow;
  available: number;
  reorderPoint: number;
  gap: number;
}

function movementColor(type: string): 'blue' | 'yellow' | 'green' | 'red' | 'gray' {
  switch (type) {
    case 'RECEIVE':
      return 'green';
    case 'TRANSFER':
      return 'blue';
    case 'CONSUME':
      return 'yellow';
    case 'ADJUST':
      return 'gray';
    case 'RETURN':
      return 'red';
    default:
      return 'gray';
  }
}

function requestColor(status: string): 'yellow' | 'blue' | 'green' | 'red' | 'gray' {
  switch (status) {
    case 'PENDING':
      return 'yellow';
    case 'APPROVED':
      return 'blue';
    case 'FULFILLED':
      return 'green';
    case 'REJECTED':
      return 'red';
    default:
      return 'gray';
  }
}

export default function WarehousePanel({ search }: Props) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<InventoryLocationRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevelRow[]>([]);
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [requests, setRequests] = useState<SupplyRequestRow[]>([]);
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);

    const [
      locationsRes,
      itemsRes,
      stockRes,
      movementsRes,
      requestsRes,
      sitesRes,
      staffRes,
    ] = await Promise.all([
      supabase
        .from('inventory_locations')
        .select('id, name, location_type, is_active, site_id')
        .is('archived_at', null)
        .order('name', { ascending: true })
        .limit(1000),
      supabase
        .from('items')
        .select('id, item_name, item_category, uom, reorder_point, reorder_qty, unit_cost, is_active')
        .is('archived_at', null)
        .eq('is_active', true)
        .limit(1500),
      supabase
        .from('stock_levels')
        .select('inventory_location_id, item_id, quantity_on_hand, quantity_reserved')
        .is('archived_at', null)
        .limit(8000),
      supabase
        .from('stock_movements')
        .select('id, item_id, movement_type, quantity, moved_at, from_inventory_location_id, to_inventory_location_id, notes')
        .is('archived_at', null)
        .order('moved_at', { ascending: false })
        .limit(150),
      supabase
        .from('supply_requests')
        .select('id, status, requested_at, site_id, inventory_location_id, requested_by_staff_id, notes')
        .is('archived_at', null)
        .order('requested_at', { ascending: false })
        .limit(150),
      supabase
        .from('sites')
        .select('id, site_code, name')
        .is('archived_at', null)
        .limit(600),
      supabase
        .from('staff')
        .select('id, staff_code, full_name')
        .is('archived_at', null)
        .limit(1200),
    ]);

    const errors = [
      locationsRes.error,
      itemsRes.error,
      stockRes.error,
      movementsRes.error,
      requestsRes.error,
      sitesRes.error,
      staffRes.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      toast.error(errors[0]?.message ?? 'Failed to load warehouse data.');
    }

    setLocations((locationsRes.data ?? []) as InventoryLocationRow[]);
    setItems((itemsRes.data ?? []) as ItemRow[]);
    setStockLevels((stockRes.data ?? []) as StockLevelRow[]);
    setMovements((movementsRes.data ?? []) as MovementRow[]);
    setRequests((requestsRes.data ?? []) as SupplyRequestRow[]);
    setSites((sitesRes.data ?? []) as SiteRow[]);
    setStaff((staffRes.data ?? []) as StaffRow[]);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const locationById = useMemo(() => new Map(locations.map((row) => [row.id, row])), [locations]);
  const itemById = useMemo(() => new Map(items.map((row) => [row.id, row])), [items]);
  const siteById = useMemo(() => new Map(sites.map((row) => [row.id, row])), [sites]);
  const staffById = useMemo(() => new Map(staff.map((row) => [row.id, row])), [staff]);

  const lowStockRows = useMemo(() => {
    const rows: LowStockRow[] = [];
    for (const stock of stockLevels) {
      const location = locationById.get(stock.inventory_location_id);
      const item = itemById.get(stock.item_id);
      if (!location || !item) continue;
      const reorderPoint = item.reorder_point;
      if (reorderPoint == null) continue;
      const available = Math.max((stock.quantity_on_hand ?? 0) - (stock.quantity_reserved ?? 0), 0);
      if (available >= reorderPoint) continue;
      rows.push({
        location,
        item,
        available,
        reorderPoint,
        gap: reorderPoint - available,
      });
    }

    rows.sort((a, b) => b.gap - a.gap);
    return rows;
  }, [itemById, locationById, stockLevels]);

  const filteredLowStock = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return lowStockRows;
    return lowStockRows.filter((row) =>
      row.location.name.toLowerCase().includes(q)
      || row.item.item_name.toLowerCase().includes(q)
      || row.item.item_category.toLowerCase().includes(q),
    );
  }, [lowStockRows, search]);

  const filteredMovements = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return movements;
    return movements.filter((movement) => {
      const item = itemById.get(movement.item_id);
      const fromLocation = movement.from_inventory_location_id ? locationById.get(movement.from_inventory_location_id) : null;
      const toLocation = movement.to_inventory_location_id ? locationById.get(movement.to_inventory_location_id) : null;
      return movement.movement_type.toLowerCase().includes(q)
        || (item?.item_name ?? '').toLowerCase().includes(q)
        || (fromLocation?.name ?? '').toLowerCase().includes(q)
        || (toLocation?.name ?? '').toLowerCase().includes(q)
        || (movement.notes ?? '').toLowerCase().includes(q);
    });
  }, [itemById, locationById, movements, search]);

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((request) => {
      const site = request.site_id ? siteById.get(request.site_id) : null;
      const location = request.inventory_location_id ? locationById.get(request.inventory_location_id) : null;
      const requestedBy = staffById.get(request.requested_by_staff_id);
      return request.status.toLowerCase().includes(q)
        || (site?.name ?? '').toLowerCase().includes(q)
        || (location?.name ?? '').toLowerCase().includes(q)
        || (requestedBy?.full_name ?? '').toLowerCase().includes(q)
        || (requestedBy?.staff_code ?? '').toLowerCase().includes(q)
        || (request.notes ?? '').toLowerCase().includes(q);
    });
  }, [locationById, requests, search, siteById, staffById]);

  const metrics = useMemo(() => ({
    locationCount: locations.filter((location) => location.is_active).length,
    lowStockCount: lowStockRows.length,
    pendingRequestCount: requests.filter((request) => ['PENDING', 'APPROVED'].includes(request.status)).length,
    movementCount: movements.length,
  }), [locations, lowStockRows.length, movements.length, requests]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active Locations</p><p className="text-xl font-semibold">{metrics.locationCount}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Low Stock Slots</p><p className="text-xl font-semibold text-warning">{metrics.lowStockCount}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Open Supply Requests</p><p className="text-xl font-semibold">{metrics.pendingRequestCount}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Recent Movements</p><p className="text-xl font-semibold text-blue-600">{metrics.movementCount}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Warehouse className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Inventory Locations</h3>
            <Badge color="gray">{locations.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading warehouse locations...</p>
          ) : locations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No inventory locations found.</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {locations.map((location) => {
                const site = location.site_id ? siteById.get(location.site_id) : null;
                return (
                  <div key={location.id} className="rounded-lg border border-border px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{location.name}</p>
                      <Badge color={location.is_active ? 'green' : 'gray'}>{location.location_type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {site
                        ? <EntityLink entityType="site" code={site.site_code} name={site.name} showCode />
                        : 'Unlinked warehouse location'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h3 className="text-sm font-semibold text-foreground">Low Stock Watch</h3>
            <Badge color="yellow">{filteredLowStock.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading low-stock analysis...</p>
          ) : filteredLowStock.length === 0 ? (
            <p className="text-sm text-muted-foreground">No low-stock items found for current filters.</p>
          ) : (
            <div className="space-y-2">
              {filteredLowStock.slice(0, 120).map((row, index) => (
                <div key={`${row.location.id}:${row.item.id}:${index}`} className="rounded-lg border border-border px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{row.item.item_name}</p>
                    <Badge color="red">Gap: {row.gap}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{row.item.item_category} · {row.item.uom} · {row.location.name}</p>
                  <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-muted-foreground md:grid-cols-4">
                    <span>Available: <span className="font-medium text-foreground">{row.available}</span></span>
                    <span>Reorder Point: <span className="font-medium text-foreground">{row.reorderPoint}</span></span>
                    <span>Reorder Qty: <span className="font-medium text-foreground">{row.item.reorder_qty ?? '—'}</span></span>
                    <span>Unit Cost: <span className="font-medium text-foreground">{row.item.unit_cost == null ? '—' : `$${row.item.unit_cost.toFixed(2)}`}</span></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-foreground">Recent Stock Movements</h3>
              <Badge color="blue">{filteredMovements.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading movements...</p>
            ) : filteredMovements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No movement records found.</p>
            ) : (
              <div className="space-y-2">
                {filteredMovements.slice(0, 80).map((movement) => {
                  const item = itemById.get(movement.item_id);
                  const fromLocation = movement.from_inventory_location_id ? locationById.get(movement.from_inventory_location_id) : null;
                  const toLocation = movement.to_inventory_location_id ? locationById.get(movement.to_inventory_location_id) : null;
                  return (
                    <div key={movement.id} className="rounded-lg border border-border px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">{item?.item_name ?? 'Unknown Item'}</p>
                        <Badge color={movementColor(movement.movement_type)}>{movement.movement_type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Qty {movement.quantity} · {new Date(movement.moved_at).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {fromLocation?.name ?? '—'} → {toLocation?.name ?? '—'}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-warning" />
              <h3 className="text-sm font-semibold text-foreground">Supply Requests</h3>
              <Badge color="gray">{filteredRequests.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading requests...</p>
            ) : filteredRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No supply requests found.</p>
            ) : (
              <div className="space-y-2">
                {filteredRequests.slice(0, 80).map((request) => {
                  const site = request.site_id ? siteById.get(request.site_id) : null;
                  const location = request.inventory_location_id ? locationById.get(request.inventory_location_id) : null;
                  const requestedBy = staffById.get(request.requested_by_staff_id);

                  return (
                    <div key={request.id} className="rounded-lg border border-border px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">Request {request.id.slice(0, 8).toUpperCase()}</p>
                        <Badge color={requestColor(request.status)}>{request.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {site
                          ? <EntityLink entityType="site" code={site.site_code} name={site.name} showCode />
                          : location?.name ?? 'No site/location attached'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Requested by: {requestedBy?.staff_code
                          ? <EntityLink entityType="staff" code={requestedBy.staff_code} name={requestedBy.full_name ?? requestedBy.staff_code} showCode />
                          : requestedBy?.full_name ?? request.requested_by_staff_id}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(request.requested_at).toLocaleString()}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
