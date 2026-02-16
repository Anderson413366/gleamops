'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Pagination, TableSkeleton, ExportButton, ViewToggle, StatusDot, statusRowAccentClass, cn,
} from '@gleamops/ui';
import type { Client } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { useViewPreference } from '@/hooks/use-view-preference';
import { ClientsCardGrid, type ClientCardMeta } from './clients-card-grid';

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

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ClientsTable({ search }: ClientsTableProps) {
  const router = useRouter();
  const [rows, setRows] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
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
    for (const job of jobs) {
      if ((job.status ?? '').toUpperCase() !== 'ACTIVE') continue;
      const clientId = siteToClient.get(job.site_id);
      if (!clientId) continue;
      monthlyRevenueByClient.set(clientId, (monthlyRevenueByClient.get(clientId) ?? 0) + (job.billing_amount ?? 0));
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

  if (loading) return <TableSkeleton rows={8} cols={7} />;

  const handleRowClick = (row: Client) => {
    router.push(`/crm/clients/${row.client_code}`);
  };

  return (
    <div>
      <div className="flex items-center justify-end gap-3 mb-4">
        <ViewToggle view={view} onChange={setView} />
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="clients"
          columns={[
            { key: 'client_code', label: 'Code' },
            { key: 'name', label: 'Name' },
            { key: 'status', label: 'Status' },
            { key: 'client_type', label: 'Type' },
            { key: 'industry', label: 'Industry' },
            { key: 'payment_terms', label: 'Payment Terms' },
            { key: 'contract_start_date', label: 'Contract Start' },
            { key: 'contract_end_date', label: 'Contract End' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
      </div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setStatusFilter(status);
            }}
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
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-12 w-12" />}
          title="No clients found"
          description={search ? 'Try a different search term.' : 'Create your first client to get started.'}
        />
      ) : (
        <>
          {view === 'card' ? (
            <ClientsCardGrid rows={pag.page} onSelect={handleRowClick} metaByClientId={cardMetaByClientId} />
          ) : (
          <Table>
            <TableHeader>
              <tr>
                <TableHead sortable sorted={sortKey === 'client_code' && sortDir} onSort={() => onSort('client_code')}>Code</TableHead>
                <TableHead sortable sorted={sortKey === 'name' && sortDir} onSort={() => onSort('name')}>Name</TableHead>
                <TableHead sortable sorted={sortKey === 'client_type' && sortDir} onSort={() => onSort('client_type')}>Type</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Payment Terms</TableHead>
                <TableHead sortable sorted={sortKey === 'contract_end_date' && sortDir} onSort={() => onSort('contract_end_date')}>Contract End</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {pag.page.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => handleRowClick(row)}
                  className={cn('cursor-pointer', statusRowAccentClass(row.status))}
                >
                  <TableCell className="font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <StatusDot status={row.status} />
                      <span>{row.client_code}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-muted-foreground">{row.client_type ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{row.industry ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.billing_address
                      ? [row.billing_address.city, row.billing_address.state].filter(Boolean).join(', ')
                      : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.payment_terms ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(row.contract_end_date ?? null)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
          <Pagination
            currentPage={pag.currentPage} totalPages={pag.totalPages} totalItems={pag.totalItems}
            pageSize={pag.pageSize} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
            onNext={pag.nextPage} onPrev={pag.prevPage}
          />
        </>
      )}
    </div>
  );
}
