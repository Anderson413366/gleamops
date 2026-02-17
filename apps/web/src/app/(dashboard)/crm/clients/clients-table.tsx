'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Pagination, TableSkeleton, ExportButton, ViewToggle, StatusDot, statusRowAccentClass, cn, Button,
} from '@gleamops/ui';
import type { Client } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { useViewPreference } from '@/hooks/use-view-preference';
import { ClientsCardGrid, type ClientCardMeta } from './clients-card-grid';
import { ClientForm } from '@/components/forms/client-form';

// UX requirement: default to Active, show Active first, and move All to the end.
const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'PROSPECT', 'ON_HOLD', 'CANCELED', 'all'] as const;

interface ClientsTableProps {
  search: string;
}

interface SiteLite {
  id: string;
  client_id: string;
  status: string | null;
  address: { city?: string; state?: string } | null;
}

interface JobLite {
  site_id: string;
  status: string | null;
  billing_amount: number | null;
}

interface ContactLite {
  id: string;
  client_id: string | null;
  name: string | null;
  is_primary: boolean | null;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercent(value: number) {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

function isFilled(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return true;
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).some(isFilled);
  return false;
}

function clientProfilePercent(client: Client): number {
  const trackedFields: unknown[] = [
    client.name,
    client.status,
    client.client_type,
    client.industry,
    client.website,
    client.primary_contact_id,
    client.bill_to_name,
    client.payment_terms,
    client.invoice_frequency,
    client.credit_limit,
    client.tax_id,
    client.contract_start_date,
    client.contract_end_date,
    client.billing_address?.city,
    client.billing_address?.state,
  ];
  const completed = trackedFields.filter(isFilled).length;
  return (completed / trackedFields.length) * 100;
}

export default function ClientsTable({ search }: ClientsTableProps) {
  const router = useRouter();
  const [rows, setRows] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [cardMetaByClientId, setCardMetaByClientId] = useState<Record<string, ClientCardMeta>>({});
  const { view, setView } = useViewPreference('clients');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .is('archived_at', null)
      .order('name');

    if (error || !data) {
      setRows([]);
      setCardMetaByClientId({});
      setLoading(false);
      return;
    }

    const clients = data as unknown as Client[];
    setRows(clients);

    if (clients.length === 0) {
      setCardMetaByClientId({});
      setLoading(false);
      return;
    }

    const clientIds = clients.map((c) => c.id);

    const { data: sitesData } = await supabase
      .from('sites')
      .select('id, client_id, status, address')
      .is('archived_at', null)
      .in('client_id', clientIds);

    const sites = (sitesData ?? []) as unknown as SiteLite[];
    const siteIds = sites.map((s) => s.id);
    const siteToClient = new Map<string, string>(sites.map((s) => [s.id, s.client_id]));

    let jobs: JobLite[] = [];
    if (siteIds.length > 0) {
      const { data: jobsData } = await supabase
        .from('site_jobs')
        .select('site_id, status, billing_amount')
        .is('archived_at', null)
        .in('site_id', siteIds);
      jobs = (jobsData ?? []) as unknown as JobLite[];
    }

    const { data: contactsData } = await supabase
      .from('contacts')
      .select('id, client_id, name, is_primary')
      .is('archived_at', null)
      .in('client_id', clientIds)
      .order('name', { ascending: true });

    const contacts = (contactsData ?? []) as unknown as ContactLite[];

    const contactsByClient = new Map<string, ContactLite[]>();
    for (const c of contacts) {
      if (!c.client_id) continue;
      const list = contactsByClient.get(c.client_id) ?? [];
      list.push(c);
      contactsByClient.set(c.client_id, list);
    }

    const sitesByClient = new Map<string, SiteLite[]>();
    for (const site of sites) {
      const list = sitesByClient.get(site.client_id) ?? [];
      list.push(site);
      sitesByClient.set(site.client_id, list);
    }

    const monthlyRevenueByClient = new Map<string, number>();
    const activeJobsByClient = new Map<string, number>();
    for (const job of jobs) {
      if ((job.status ?? '').toUpperCase() !== 'ACTIVE') continue;
      const clientId = siteToClient.get(job.site_id);
      if (!clientId) continue;
      monthlyRevenueByClient.set(clientId, (monthlyRevenueByClient.get(clientId) ?? 0) + (job.billing_amount ?? 0));
      activeJobsByClient.set(clientId, (activeJobsByClient.get(clientId) ?? 0) + 1);
    }

    const nextMeta: Record<string, ClientCardMeta> = {};
    for (const client of clients) {
      const clientSites = sitesByClient.get(client.id) ?? [];
      const activeSites = clientSites.filter((s) => (s.status ?? '').toUpperCase() === 'ACTIVE').length;
      const preferredContact = (contactsByClient.get(client.id) ?? []).find((c) => c.id === client.primary_contact_id)
        ?? (contactsByClient.get(client.id) ?? []).find((c) => c.is_primary)
        ?? (contactsByClient.get(client.id) ?? [])[0];

      const billingLocation = [client.billing_address?.city, client.billing_address?.state].filter(Boolean).join(', ');
      const siteLocation = clientSites
        .map((s) => [s.address?.city, s.address?.state].filter(Boolean).join(', '))
        .find(Boolean);

      nextMeta[client.id] = {
        activeSites,
        monthlyRevenue: monthlyRevenueByClient.get(client.id) ?? 0,
        location: billingLocation || siteLocation || null,
        primaryContactName: preferredContact?.name ?? null,
        activeJobs: activeJobsByClient.get(client.id) ?? 0,
        profilePercent: clientProfilePercent(client),
      };
    }

    setCardMetaByClientId(nextMeta);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: rows.length };
    for (const r of rows) {
      counts[r.status] = (counts[r.status] || 0) + 1;
    }
    return counts;
  }, [rows]);

  const filtered = useMemo(() => {
    let result = rows;
    if (statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.client_code.toLowerCase().includes(q) ||
          r.client_type?.toLowerCase().includes(q) ||
          r.industry?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [rows, search, statusFilter]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'name', 'asc'
  );
  const sortedRows = sorted as unknown as Client[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={8} cols={6} />;

  const handleRowClick = (row: Client) => {
    router.push(`/crm/clients/${row.client_code}`);
  };
  const handleAdd = () => setFormOpen(true);
  const selectedStatusLabel = statusFilter === 'all'
    ? 'all statuses'
    : statusFilter.toLowerCase().replace(/_/g, ' ');
  const emptyTitle = statusFilter === 'all'
    ? 'No clients yet'
    : `No ${selectedStatusLabel} clients`;
  const emptyDescription = search
    ? 'Try a different search term.'
    : statusFilter === 'all'
      ? 'Track every account, contract, and contact in one place.'
      : `There are currently no clients with ${selectedStatusLabel} status.`;
  const showGuidedEmptyState = !search && statusFilter === 'all';

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Button size="sm" onClick={handleAdd}>
          <Plus className="h-4 w-4" /> New Client
        </Button>
        <div className="flex items-center gap-3">
          <ViewToggle view={view} onChange={setView} />
          <ExportButton
            data={filtered.map((row) => ({
              ...row,
              industry_display: row.industry ?? 'Not Set',
              city_state: cardMetaByClientId[row.id]?.location ?? 'Not Set',
              active_sites: cardMetaByClientId[row.id]?.activeSites ?? 0,
              active_jobs: cardMetaByClientId[row.id]?.activeJobs ?? 0,
              monthly_revenue: cardMetaByClientId[row.id]?.monthlyRevenue ?? 0,
              profile_percent: Math.round(cardMetaByClientId[row.id]?.profilePercent ?? clientProfilePercent(row)),
            })) as unknown as Record<string, unknown>[]}
            filename="clients"
            columns={[
              { key: 'client_code', label: 'Code' },
              { key: 'name', label: 'Name' },
              { key: 'industry_display', label: 'Industry' },
              { key: 'city_state', label: 'City/State' },
              { key: 'active_jobs', label: 'Active Jobs' },
              { key: 'monthly_revenue', label: 'Monthly Revenue' },
              { key: 'profile_percent', label: 'Profile %' },
            ]}
            onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
          />
        </div>
      </div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              statusFilter === status
                ? 'bg-module-accent text-module-accent-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {status === 'all' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ')}
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
              statusFilter === status ? 'bg-white/20' : 'bg-background'
            )}>
              {statusCounts[status] || 0}
            </span>
          </button>
        ))}
      </div>
      {view === 'card' ? (
        filtered.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-12 w-12" />}
            title={emptyTitle}
            description={emptyDescription}
            actionLabel={showGuidedEmptyState ? '+ Add Your First Client' : undefined}
            onAction={showGuidedEmptyState ? handleAdd : undefined}
          >
            {showGuidedEmptyState && (
              <ul className="mx-auto max-w-lg list-disc space-y-1.5 pl-5 text-left text-sm text-muted-foreground">
                <li>Centralize billing, contract, and service records by client.</li>
                <li>See active sites and monthly revenue at a glance.</li>
                <li>Move faster with one-click drill-down to detail pages.</li>
              </ul>
            )}
          </EmptyState>
        ) : (
          <ClientsCardGrid rows={pag.page} onSelect={handleRowClick} metaByClientId={cardMetaByClientId} />
        )
      ) : (
        <>
          <div className="w-full overflow-x-auto">
            <Table className="w-full min-w-full">
              <TableHeader>
                <tr>
                  <TableHead sortable sorted={sortKey === 'client_code' && sortDir} onSort={() => onSort('client_code')}>Code</TableHead>
                  <TableHead sortable sorted={sortKey === 'name' && sortDir} onSort={() => onSort('name')}>Name</TableHead>
                  <TableHead sortable sorted={sortKey === 'industry' && sortDir} onSort={() => onSort('industry')}>Industry</TableHead>
                  <TableHead>City/State</TableHead>
                  <TableHead>Active Jobs</TableHead>
                  <TableHead>Monthly Revenue</TableHead>
                  <TableHead>Profile %</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {pag.page.map((row) => (
                  <TableRow
                    key={row.id}
                    onClick={() => handleRowClick(row)}
                    className={cn('cursor-pointer', statusRowAccentClass(row.status))}
                  >
                    <TableCell>
                      <div className="inline-flex max-w-[132px] items-center gap-2 rounded-md bg-muted px-2 py-1 font-mono text-xs text-foreground">
                        <span className="truncate" title={row.client_code}>{row.client_code}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <StatusDot status={row.status} />
                        <span className="max-w-[240px] truncate" title={row.name}>{row.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <span className="inline-block max-w-[220px] truncate" title={row.industry ?? 'Not Set'}>
                        {row.industry ?? 'Not Set'}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <span className="inline-block max-w-[200px] truncate" title={cardMetaByClientId[row.id]?.location ?? 'Not Set'}>
                        {cardMetaByClientId[row.id]?.location ?? 'Not Set'}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {cardMetaByClientId[row.id]?.activeJobs ?? 0}
                    </TableCell>
                    <TableCell className="tabular-nums font-medium">
                      {formatCurrency(cardMetaByClientId[row.id]?.monthlyRevenue ?? 0)}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {formatPercent(cardMetaByClientId[row.id]?.profilePercent ?? clientProfilePercent(row))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filtered.length === 0 && (
            <div className="mt-4">
              <EmptyState
                icon={<Building2 className="h-12 w-12" />}
                title={emptyTitle}
                description={emptyDescription}
                actionLabel={showGuidedEmptyState ? '+ Add Your First Client' : undefined}
                onAction={showGuidedEmptyState ? handleAdd : undefined}
              >
                {showGuidedEmptyState && (
                  <ul className="mx-auto max-w-lg list-disc space-y-1.5 pl-5 text-left text-sm text-muted-foreground">
                    <li>Centralize billing, contract, and service records by client.</li>
                    <li>See active sites and monthly revenue at a glance.</li>
                    <li>Move faster with one-click drill-down to detail pages.</li>
                  </ul>
                )}
              </EmptyState>
            </div>
          )}
        </>
      )}
      {filtered.length > 0 && (
        <Pagination
          currentPage={pag.currentPage} totalPages={pag.totalPages} totalItems={pag.totalItems}
          pageSize={pag.pageSize} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
          onNext={pag.nextPage} onPrev={pag.prevPage}
        />
      )}
      <ClientForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
