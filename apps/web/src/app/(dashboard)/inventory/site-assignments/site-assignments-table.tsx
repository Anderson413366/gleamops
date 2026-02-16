'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { MapPin, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { SiteSupply } from '@gleamops/shared';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, TableSkeleton, Button, SlideOver, Select, Input, cn,
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

export default function SiteAssignmentsTable({ search }: Props) {
  const searchParams = useSearchParams();
  const siteQueryCode = searchParams.get('site');

  const [rows, setRows] = useState<SiteSupplyRow[]>([]);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [catalogRows, setCatalogRows] = useState<SupplyOption[]>([]);
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const [assignRes, sitesRes, catalogRes] = await Promise.all([
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
        .select('id, code, name, category, unit, preferred_vendor, sds_url')
        .is('archived_at', null)
        .order('name'),
    ]);

    if (assignRes.error) toast.error(assignRes.error.message);
    if (sitesRes.error) toast.error(sitesRes.error.message);
    if (catalogRes.error) toast.error(catalogRes.error.message);

    setRows((assignRes.data as unknown as SiteSupplyRow[]) ?? []);
    setSites((sitesRes.data as unknown as SiteOption[]) ?? []);
    setCatalogRows((catalogRes.data as unknown as SupplyOption[]) ?? []);
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

  const handleRemoveAssignment = async (row: SiteSupplyRow) => {
    const confirmed = window.confirm(`Remove "${row.name}" from ${row.site?.name ?? 'this site'}?`);
    if (!confirmed) return;
    setRemovingId(row.id);
    const supabase = getSupabaseBrowserClient();
    const { data: authData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('site_supplies')
      .update({
        archived_at: new Date().toISOString(),
        archived_by: authData.user?.id ?? null,
        archive_reason: 'Removed from site assignments directory',
      })
      .eq('id', row.id)
      .is('archived_at', null);

    if (error) {
      toast.error(error.message);
      setRemovingId(null);
      return;
    }
    toast.success('Assignment removed.');
    setRemovingId(null);
    await fetchData();
  };

  if (loading) return <TableSkeleton rows={8} cols={7} />;

  const renderRows = (targetRows: SiteSupplyRow[]) => (
    <Table>
      <TableHeader>
        <tr>
          <TableHead>Supply</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Vendor</TableHead>
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
          return (
            <TableRow key={row.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/inventory?tab=supplies&search=${encodeURIComponent(row.name)}`}
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  {row.name}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{category}</TableCell>
              <TableCell className="text-muted-foreground">{unit}</TableCell>
              <TableCell className="text-muted-foreground">{vendor}</TableCell>
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
                  onClick={() => handleRemoveAssignment(row)}
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
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <>
          {renderRows([])}
          <EmptyState
            icon={<MapPin className="h-12 w-12" />}
            title="No site assignments yet"
            description="Assign supplies to sites to manage inventory by location."
          />
        </>
      ) : siteFilter === 'all' ? (
        <div className="space-y-4">
          {groupedBySite.map(([siteCode, siteRows]) => {
            const siteName = siteRows[0]?.site?.name ?? 'Unassigned Site';
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
    </div>
  );
}
