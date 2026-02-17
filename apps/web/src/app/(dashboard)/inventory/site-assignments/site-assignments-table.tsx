'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CalendarClock, MapPin, Package2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { SiteSupply } from '@gleamops/shared';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, TableSkeleton, Button, SlideOver, Select, Input, cn, ConfirmDialog,
} from '@gleamops/ui';

interface SiteSupplyRow extends SiteSupply {
  site?: { id: string; name: string; site_code: string } | null;
}

interface SiteOption {
  id: string;
  name: string;
  site_code: string;
  tenant_id: string;
}

interface SupplyOption {
  id: string;
  code: string;
  name: string;
  category: string | null;
  unit: string;
  preferred_vendor: string | null;
  sds_url: string | null;
  image_url: string | null;
}

interface InventoryCountSummary {
  id: string;
  count_code: string;
  site_id: string | null;
  count_date: string;
  counter?: { full_name: string | null } | null;
}

interface InventoryCountDetailSummary {
  count_id: string;
  supply_id: string;
  actual_qty: number | null;
}

interface LatestCountMeta {
  countId: string;
  countCode: string;
  countDate: string;
  countedBy: string | null;
}

interface Props {
  search: string;
}

function keyByName(rows: SupplyOption[]): Record<string, SupplyOption> {
  const map: Record<string, SupplyOption> = {};
  for (const row of rows) {
    map[row.name.trim().toLowerCase()] = row;
  }
  return map;
}

function formatDateLabel(value: string | null | undefined): string {
  if (!value) return 'Not Set';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Not Set';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function dueBadgeLabel(value: string | null | undefined): { label: string; tone: 'green' | 'yellow' | 'red' | 'gray' } {
  if (!value) return { label: 'No schedule', tone: 'gray' };
  const base = new Date(value);
  if (Number.isNaN(base.getTime())) return { label: 'No schedule', tone: 'gray' };
  const due = new Date(base);
  due.setDate(due.getDate() + 30);
  const ms = due.getTime() - Date.now();
  const diffDays = Math.ceil(ms / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'}`, tone: 'red' };
  if (diffDays <= 7) return { label: `Due in ${diffDays} day${diffDays === 1 ? '' : 's'}`, tone: 'yellow' };
  return { label: `Due in ${diffDays} days`, tone: 'green' };
}

export default function SiteAssignmentsTable({ search }: Props) {
  const searchParams = useSearchParams();
  const siteQueryCode = searchParams.get('site');

  const [rows, setRows] = useState<SiteSupplyRow[]>([]);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [catalogRows, setCatalogRows] = useState<SupplyOption[]>([]);
  const [latestCountBySite, setLatestCountBySite] = useState<Record<string, LatestCountMeta>>({});
  const [lastQtyBySiteSupply, setLastQtyBySiteSupply] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [vendorFilter, setVendorFilter] = useState<string>('all');

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignSiteId, setAssignSiteId] = useState<string>('');
  const [assignSupplySearch, setAssignSupplySearch] = useState('');
  const [selectedSupplyIds, setSelectedSupplyIds] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<SiteSupplyRow | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const [assignRes, sitesRes, catalogRes, countsRes] = await Promise.all([
      supabase
        .from('site_supplies')
        .select('*, site:site_id(id, name, site_code)')
        .is('archived_at', null)
        .order('created_at', { ascending: false }),
      supabase
        .from('sites')
        .select('id, name, site_code, tenant_id')
        .is('archived_at', null)
        .order('name'),
      supabase
        .from('supply_catalog')
        .select('id, code, name, category, unit, preferred_vendor, sds_url, image_url')
        .is('archived_at', null)
        .order('name'),
      supabase
        .from('inventory_counts')
        .select('id, count_code, site_id, count_date, counter:counted_by(full_name)')
        .is('archived_at', null)
        .order('count_date', { ascending: false }),
    ]);

    if (assignRes.error) toast.error(assignRes.error.message);
    if (sitesRes.error) toast.error(sitesRes.error.message);
    if (catalogRes.error) toast.error(catalogRes.error.message);
    if (countsRes.error) toast.error(countsRes.error.message);

    setRows((assignRes.data as unknown as SiteSupplyRow[]) ?? []);
    setSites((sitesRes.data as unknown as SiteOption[]) ?? []);
    setCatalogRows((catalogRes.data as unknown as SupplyOption[]) ?? []);

    const latestBySite: Record<string, LatestCountMeta> = {};
    const countIdToSite: Record<string, string> = {};
    for (const count of ((countsRes.data ?? []) as unknown as InventoryCountSummary[])) {
      if (!count.site_id) continue;
      if (latestBySite[count.site_id]) continue;
      latestBySite[count.site_id] = {
        countId: count.id,
        countCode: count.count_code,
        countDate: count.count_date,
        countedBy: count.counter?.full_name ?? null,
      };
      countIdToSite[count.id] = count.site_id;
    }
    setLatestCountBySite(latestBySite);

    const latestCountIds = Object.values(latestBySite).map((entry) => entry.countId);
    if (latestCountIds.length === 0) {
      setLastQtyBySiteSupply({});
      setLoading(false);
      return;
    }

    const { data: detailsData, error: detailsError } = await supabase
      .from('inventory_count_details')
      .select('count_id, supply_id, actual_qty')
      .is('archived_at', null)
      .in('count_id', latestCountIds);

    if (detailsError) {
      toast.error(detailsError.message);
      setLastQtyBySiteSupply({});
      setLoading(false);
      return;
    }

    const qtyMap: Record<string, number> = {};
    for (const detail of ((detailsData ?? []) as unknown as InventoryCountDetailSummary[])) {
      const siteId = countIdToSite[detail.count_id];
      if (!siteId) continue;
      const key = `${siteId}:${detail.supply_id}`;
      qtyMap[key] = Number(detail.actual_qty ?? 0);
    }
    setLastQtyBySiteSupply(qtyMap);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!siteQueryCode || sites.length === 0) return;
    const matchingSite = sites.find((site) => site.site_code === siteQueryCode);
    if (matchingSite) {
      setSiteFilter(matchingSite.id);
    }
  }, [siteQueryCode, sites]);

  const catalogByName = useMemo(() => keyByName(catalogRows), [catalogRows]);

  const categoryOptions = useMemo(() => {
    const values = new Set<string>();
    for (const row of rows) {
      const enriched = catalogByName[row.name.trim().toLowerCase()];
      const value = row.category ?? enriched?.category ?? null;
      if (value) values.add(value);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [catalogByName, rows]);

  const unitOptions = useMemo(() => {
    const values = new Set<string>();
    for (const row of rows) {
      const value = catalogByName[row.name.trim().toLowerCase()]?.unit ?? null;
      if (value) values.add(value);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [catalogByName, rows]);

  const vendorOptions = useMemo(() => {
    const values = new Set<string>();
    for (const row of rows) {
      const value = catalogByName[row.name.trim().toLowerCase()]?.preferred_vendor ?? null;
      if (value) values.add(value);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [catalogByName, rows]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((row) => {
      const enriched = catalogByName[row.name.trim().toLowerCase()];
      const category = row.category ?? enriched?.category ?? null;
      const unit = enriched?.unit ?? null;
      const vendor = enriched?.preferred_vendor ?? null;

      if (siteFilter !== 'all' && row.site_id !== siteFilter) return false;
      if (categoryFilter !== 'all' && category !== categoryFilter) return false;
      if (unitFilter !== 'all' && unit !== unitFilter) return false;
      if (vendorFilter !== 'all' && vendor !== vendorFilter) return false;

      if (!search) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        (row.site?.name ?? '').toLowerCase().includes(q) ||
        (row.site?.site_code ?? '').toLowerCase().includes(q) ||
        (category ?? '').toLowerCase().includes(q) ||
        (vendor ?? '').toLowerCase().includes(q)
      );
    });
  }, [categoryFilter, catalogByName, rows, search, siteFilter, unitFilter, vendorFilter]);

  const groupedBySite = useMemo(() => {
    const groups: Record<string, SiteSupplyRow[]> = {};
    for (const row of filtered) {
      const key = row.site?.site_code ?? 'UNASSIGNED';
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const selectedSite = useMemo(
    () => sites.find((site) => site.id === siteFilter) ?? null,
    [siteFilter, sites]
  );
  const selectedSiteLastCount = useMemo(
    () => (selectedSite ? latestCountBySite[selectedSite.id] ?? null : null),
    [latestCountBySite, selectedSite]
  );

  const assignmentSupplyOptions = useMemo(() => {
    if (!assignSupplySearch) return catalogRows;
    const q = assignSupplySearch.toLowerCase();
    return catalogRows.filter((row) =>
      row.name.toLowerCase().includes(q) ||
      row.code.toLowerCase().includes(q) ||
      (row.category ?? '').toLowerCase().includes(q)
    );
  }, [assignSupplySearch, catalogRows]);

  const openAssignModal = () => {
    setAssignOpen(true);
    setAssignSupplySearch('');
    setSelectedSupplyIds([]);
    setAssignSiteId(siteFilter !== 'all' ? siteFilter : '');
  };

  const toggleSelectedSupply = (supplyId: string) => {
    setSelectedSupplyIds((prev) => (
      prev.includes(supplyId)
        ? prev.filter((idValue) => idValue !== supplyId)
        : [...prev, supplyId]
    ));
  };

  const handleAssignSupplies = async () => {
    if (!assignSiteId) {
      toast.error('Select a site first.');
      return;
    }
    if (selectedSupplyIds.length === 0) {
      toast.error('Select at least one supply.');
      return;
    }
    setAssigning(true);
    const supabase = getSupabaseBrowserClient();
    const selectedSiteOption = sites.find((site) => site.id === assignSiteId);
    const tenantId = selectedSiteOption?.tenant_id ?? null;

    const selectedOptions = catalogRows.filter((supply) => selectedSupplyIds.includes(supply.id));
    const existingNames = new Set(
      rows
        .filter((row) => row.site_id === assignSiteId)
        .map((row) => row.name.trim().toLowerCase())
    );
    const insertRows = selectedOptions
      .filter((supply) => !existingNames.has(supply.name.trim().toLowerCase()))
      .map((supply) => ({
        tenant_id: tenantId,
        site_id: assignSiteId,
        name: supply.name,
        category: supply.category,
        sds_url: supply.sds_url,
        notes: `Assigned from supply catalog (${supply.code})`,
      }));

    if (insertRows.length === 0) {
      toast.info('All selected supplies are already assigned to this site.');
      setAssigning(false);
      return;
    }

    const { error } = await supabase.from('site_supplies').insert(insertRows);
    if (error) {
      toast.error(error.message);
      setAssigning(false);
      return;
    }

    toast.success(`Assigned ${insertRows.length} supply item${insertRows.length === 1 ? '' : 's'}.`);
    setAssigning(false);
    setAssignOpen(false);
    await fetchData();
  };

  const handleRemoveAssignment = async () => {
    if (!removeTarget) return;
    setRemovingId(removeTarget.id);
    const supabase = getSupabaseBrowserClient();
    const { data: authData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('site_supplies')
      .update({
        archived_at: new Date().toISOString(),
        archived_by: authData.user?.id ?? null,
        archive_reason: 'Removed from site assignments directory',
      })
      .eq('id', removeTarget.id)
      .is('archived_at', null);

    if (error) {
      toast.error(error.message);
      setRemovingId(null);
      return;
    }
    toast.success('Assignment removed.');
    setRemovingId(null);
    setRemoveTarget(null);
    await fetchData();
  };

  if (loading) return <TableSkeleton rows={8} cols={7} />;

  const renderRows = (targetRows: SiteSupplyRow[]) => (
    <div className="w-full overflow-x-auto">
      <Table className="w-full min-w-full">
        <TableHeader>
          <tr>
            <TableHead>Img</TableHead>
            <TableHead className="w-full">Supply</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Last Cnt</TableHead>
            <TableHead>Assigned Date</TableHead>
            <TableHead>SDS</TableHead>
            <TableHead>Action</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {targetRows.map((row) => {
            const enriched = catalogByName[row.name.trim().toLowerCase()];
            const category = row.category ?? enriched?.category ?? 'Not Set';
            const unit = enriched?.unit ?? 'Not Set';
            const vendor = enriched?.preferred_vendor ?? 'Not Set';
            const sdsUrl = row.sds_url ?? enriched?.sds_url ?? null;
            const imageUrl = enriched?.image_url ?? null;
            const supplyId = enriched?.id ?? null;
            const qtyKey = supplyId ? `${row.site_id}:${supplyId}` : '';
            const lastCountQty = qtyKey ? lastQtyBySiteSupply[qtyKey] : undefined;
            return (
              <TableRow key={row.id}>
                <TableCell>
                  <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/30">
                    {imageUrl ? (
                      <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${imageUrl})` }} />
                    ) : (
                      <Package2 className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="w-full font-medium">
                  {enriched?.code ? (
                    <Link
                      href={`/inventory/supplies/${encodeURIComponent(enriched.code)}`}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {row.name}
                    </Link>
                  ) : (
                    <Link
                      href={`/inventory?tab=supplies&search=${encodeURIComponent(row.name)}`}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {row.name}
                    </Link>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{category}</TableCell>
                <TableCell className="text-muted-foreground">{unit}</TableCell>
                <TableCell className="text-muted-foreground">{vendor}</TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {lastCountQty != null ? lastCountQty.toLocaleString() : 'Not Counted'}
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDateLabel(row.created_at)}</TableCell>
                <TableCell>
                  {sdsUrl ? (
                    <a
                      href={sdsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      View SDS
                    </a>
                  ) : (
                    <span className="text-muted-foreground">Not Set</span>
                  )}
                </TableCell>
                <TableCell>
                  <button
                    type="button"
                    disabled={removingId === row.id}
                    onClick={() => setRemoveTarget(row)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground',
                      removingId === row.id && 'opacity-50'
                    )}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button size="sm" onClick={openAssignModal}>
          <Plus className="h-4 w-4" /> Assign Supply
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Select
          label="Site"
          value={siteFilter}
          onChange={(event) => setSiteFilter(event.target.value)}
          options={[
            { value: 'all', label: 'All Sites' },
            ...sites.map((site) => ({ value: site.id, label: `${site.name} (${site.site_code})` })),
          ]}
        />
        <Select
          label="Category"
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          options={[
            { value: 'all', label: 'All Categories' },
            ...categoryOptions.map((value) => ({ value, label: value })),
          ]}
        />
        <Select
          label="Type"
          value={unitFilter}
          onChange={(event) => setUnitFilter(event.target.value)}
          options={[
            { value: 'all', label: 'All Types' },
            ...unitOptions.map((value) => ({ value, label: value })),
          ]}
        />
        <Select
          label="Vendor"
          value={vendorFilter}
          onChange={(event) => setVendorFilter(event.target.value)}
          options={[
            { value: 'all', label: 'All Vendors' },
            ...vendorOptions.map((value) => ({ value, label: value })),
          ]}
        />
      </div>

	      {siteFilter !== 'all' && selectedSite ? (
	        <div className="rounded-lg border border-border bg-card p-4">
	          <p className="text-sm font-semibold text-foreground">
	            Currently viewing: {selectedSite.name} ({selectedSite.site_code})
	          </p>
	          <p className="mt-1 text-xs text-muted-foreground">{filtered.length} supplies assigned.</p>
	          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" />
              Last count: {formatDateLabel(selectedSiteLastCount?.countDate)}
            </span>
            {selectedSiteLastCount?.countedBy && <span>Counted by: {selectedSiteLastCount.countedBy}</span>}
	            <span
              className={cn(
                'rounded-full px-2 py-0.5 font-medium',
                dueBadgeLabel(selectedSiteLastCount?.countDate).tone === 'green' && 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
                dueBadgeLabel(selectedSiteLastCount?.countDate).tone === 'yellow' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
                dueBadgeLabel(selectedSiteLastCount?.countDate).tone === 'red' && 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
                dueBadgeLabel(selectedSiteLastCount?.countDate).tone === 'gray' && 'bg-muted text-muted-foreground'
              )}
	            >
	              {dueBadgeLabel(selectedSiteLastCount?.countDate).label}
	            </span>
              {selectedSiteLastCount?.countCode ? (
                <Link
                  href={`/inventory/counts/${encodeURIComponent(selectedSiteLastCount.countCode)}`}
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  View Full Count
                </Link>
              ) : null}
              <Link
                href={`/inventory?tab=counts&action=create-count&site=${encodeURIComponent(selectedSite.site_code)}`}
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                Start New Count
              </Link>
	          </div>
	        </div>
	      ) : null}

      {filtered.length === 0 ? (
        <>
          {renderRows([])}
          <EmptyState
            icon={<MapPin className="h-12 w-12" />}
            title={siteFilter === 'all' ? 'No site assignments yet' : 'No assignments for this site'}
            description={search
              ? 'Try a different search term.'
              : siteFilter === 'all'
                ? 'Assign supplies to sites to manage inventory by location.'
                : 'Assign supplies to this site to start tracking usage and counts.'}
            actionLabel={search ? undefined : '+ Assign Supply'}
            onAction={search ? undefined : openAssignModal}
          />
        </>
      ) : siteFilter === 'all' ? (
        <div className="space-y-4">
          {groupedBySite.map(([siteCode, siteRows]) => {
            const siteName = siteRows[0]?.site?.name ?? 'Unassigned Site';
            const siteId = siteRows[0]?.site_id ?? '';
            const lastCount = siteId ? latestCountBySite[siteId] : null;
            const due = dueBadgeLabel(lastCount?.countDate);
            return (
              <div key={siteCode} className="rounded-xl border border-border bg-card p-4">
                <p className="mb-3 text-sm font-semibold text-foreground">
                  {siteCode !== 'UNASSIGNED' && siteRows[0]?.site?.site_code ? (
                    <Link
                      href={`/crm/sites/${siteRows[0].site.site_code}`}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {siteName} ({siteRows[0].site.site_code})
                    </Link>
                  ) : siteName}
                </p>
                <p className="mb-3 text-xs text-muted-foreground">
                  Last count: {formatDateLabel(lastCount?.countDate)}
                  {lastCount?.countedBy ? ` · Counted by ${lastCount.countedBy}` : ''}
                  <span
                    className={cn(
                      'ml-2 rounded-full px-2 py-0.5 font-medium',
                      due.tone === 'green' && 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
                      due.tone === 'yellow' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
                      due.tone === 'red' && 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
                      due.tone === 'gray' && 'bg-muted text-muted-foreground'
                    )}
                  >
                    {due.label}
                  </span>
                </p>
                {renderRows(siteRows)}
              </div>
            );
          })}
        </div>
      ) : (
        renderRows(filtered)
      )}

	      <SlideOver
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Assign Supplies to Site"
        subtitle="Choose a site, select supplies from the catalog, and confirm."
        wide
      >
        <div className="space-y-4">
          <Select
            label="Site"
            value={assignSiteId}
            onChange={(event) => setAssignSiteId(event.target.value)}
            options={[
              { value: '', label: 'Select a site...' },
              ...sites.map((site) => ({ value: site.id, label: `${site.name} (${site.site_code})` })),
            ]}
          />
          <Input
            label="Search Supplies"
            value={assignSupplySearch}
            onChange={(event) => setAssignSupplySearch(event.target.value)}
            placeholder="Search by name, code, or category..."
          />

          <div className="max-h-[360px] overflow-y-auto rounded-lg border border-border">
            {assignmentSupplyOptions.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No supplies match this search.</div>
            ) : (
              <ul className="divide-y divide-border">
                {assignmentSupplyOptions.map((supply) => (
                  <li key={supply.id} className="p-3">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedSupplyIds.includes(supply.id)}
                        onChange={() => toggleSelectedSupply(supply.id)}
                        className="mt-1 h-4 w-4 rounded border-border"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {supply.name}
                          <span className="ml-2 font-mono text-xs text-muted-foreground">{supply.code}</span>
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {supply.category ?? 'Uncategorized'} · {supply.unit} · {supply.preferred_vendor ?? 'No preferred vendor'}
                        </p>
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button variant="secondary" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button loading={assigning} onClick={handleAssignSupplies}>
              Assign Selected ({selectedSupplyIds.length})
            </Button>
          </div>
        </div>
	      </SlideOver>

      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => {
          if (removingId) return;
          setRemoveTarget(null);
        }}
        onConfirm={handleRemoveAssignment}
        title={`Remove ${removeTarget?.name ?? 'assignment'}?`}
        description={`This removes the supply assignment from ${removeTarget?.site?.name ?? 'the selected site'} and can be re-added later.`}
        confirmLabel="Remove Assignment"
        loading={!!removingId}
        variant="danger"
      />
	    </div>
	  );
	}
