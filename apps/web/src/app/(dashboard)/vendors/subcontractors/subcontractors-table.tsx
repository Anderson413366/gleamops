'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { HardHat } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Subcontractor } from '@gleamops/shared';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Pagination, TableSkeleton, ExportButton, ViewToggle, Badge, StatusDot, statusRowAccentClass, cn,
} from '@gleamops/ui';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { useViewPreference } from '@/hooks/use-view-preference';
import { SubcontractorsCardGrid } from './subcontractors-card-grid';

// Per product rule: default to ACTIVE; ACTIVE first; ALL last.
const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'PENDING', 'all'] as const;

interface Props {
  search: string;
}

interface AssignmentSummaryLite {
  subcontractor_id: string;
  status: string | null;
  billing_rate: number | null;
}

function servicesText(row: Subcontractor): string {
  const legacy = row as Subcontractor & { services?: string | null };
  return row.services_provided ?? legacy.services ?? '';
}

function formatCurrency(n: number | null) {
  if (n == null) return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
}

function formatRate(n: number | null) {
  if (n == null) return '$0/hr';
  return `${formatCurrency(n)}/hr`;
}

function expiryStatusColor(value: string | null | undefined): 'green' | 'yellow' | 'red' {
  if (!value) return 'red';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'red';
  const diffDays = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'red';
  if (diffDays <= 30) return 'yellow';
  return 'green';
}

function complianceColor(row: Subcontractor): 'green' | 'yellow' | 'red' {
  const hasW9 = row.w9_on_file === true;
  const license = expiryStatusColor(row.license_expiry ?? null);
  const insurance = expiryStatusColor(row.insurance_expiry ?? null);
  if (!hasW9 || license === 'red' || insurance === 'red') return 'red';
  if (license === 'yellow' || insurance === 'yellow') return 'yellow';
  return 'green';
}

function complianceLabel(row: Subcontractor): string {
  const color = complianceColor(row);
  if (color === 'green') return 'Compliant';
  if (color === 'yellow') return 'Review Soon';
  return 'Needs Attention';
}

export default function SubcontractorsTable({ search }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [activeJobsBySubcontractor, setActiveJobsBySubcontractor] = useState<Record<string, number>>({});
  const { view, setView } = useViewPreference('subcontractors');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('subcontractors')
      .select('*')
      .is('archived_at', null)
      .not('subcontractor_code', 'like', 'VEN-%')
      .order('company_name');
    if (!error && data) {
      const subcontractorRows = data as Subcontractor[];
      setRows(subcontractorRows);
      if (subcontractorRows.length > 0) {
        const ids = subcontractorRows.map((row) => row.id);
        const { data: assignments } = await supabase
          .from('v_subcontractor_job_assignments')
          .select('subcontractor_id, status, billing_rate')
          .in('subcontractor_id', ids);

        const activeCounts: Record<string, number> = {};
        for (const assignment of (assignments ?? []) as unknown as AssignmentSummaryLite[]) {
          const status = (assignment.status ?? '').toUpperCase();
          if (status !== 'ACTIVE' && status !== 'IN_PROGRESS') continue;
          activeCounts[assignment.subcontractor_id] = (activeCounts[assignment.subcontractor_id] ?? 0) + 1;
        }
        setActiveJobsBySubcontractor(activeCounts);
      } else {
        setActiveJobsBySubcontractor({});
      }
    }
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
      result = result.filter((r) =>
        r.company_name.toLowerCase().includes(q) ||
        r.subcontractor_code.toLowerCase().includes(q) ||
        (r.contact_name ?? '').toLowerCase().includes(q) ||
        servicesText(r).toLowerCase().includes(q)
      );
    }
    return result;
  }, [rows, search, statusFilter]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(filtered as unknown as Record<string, unknown>[], 'company_name', 'asc');
  const sortedRows = sorted as unknown as Subcontractor[];
  const pag = usePagination(sortedRows, 25);
  const selectedStatusLabel = statusFilter === 'all'
    ? 'all statuses'
    : statusFilter.toLowerCase().replace(/_/g, ' ');
  const emptyTitle = statusFilter === 'all'
    ? 'No subcontractors yet'
    : `No ${selectedStatusLabel} subcontractors`;
  const emptyDescription = search
    ? 'Try a different search term.'
    : statusFilter === 'all'
      ? 'Manage partner crews, compliance, and rates in one directory.'
      : `There are currently no subcontractors with ${selectedStatusLabel} status.`;
  const showGuidedEmptyState = !search && statusFilter === 'all';

  const openDetail = useCallback((row: Subcontractor) => {
    router.push(`/vendors/subcontractors/${encodeURIComponent(row.subcontractor_code)}`);
  }, [router]);

  if (loading) return <TableSkeleton rows={8} cols={7} />;

  return (
    <div>
      <div className="flex items-center justify-end gap-3 mb-4">
        <ViewToggle view={view} onChange={setView} />
        <ExportButton
          data={filtered.map((row) => ({
            ...row,
            active_jobs: activeJobsBySubcontractor[row.id] ?? 0,
            rate_display: formatRate(row.hourly_rate ?? null),
            w9_status: row.w9_on_file ? 'On File' : 'Missing',
            compliance: complianceLabel(row),
          })) as unknown as Record<string, unknown>[]}
          filename="subcontractors"
          columns={[
            { key: 'subcontractor_code', label: 'Code' },
            { key: 'company_name', label: 'Company' },
            { key: 'contact_name', label: 'Contact' },
            { key: 'active_jobs', label: 'Active Jobs' },
            { key: 'rate_display', label: 'Rate' },
            { key: 'w9_status', label: 'W-9 Status' },
            { key: 'compliance', label: 'Compliance' },
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
            {status === 'all' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
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
            icon={<HardHat className="h-10 w-10" />}
            title={emptyTitle}
            description={emptyDescription}
            actionLabel={showGuidedEmptyState ? '+ Add Your First Subcontractor' : undefined}
            onAction={showGuidedEmptyState ? () => router.push('/vendors?tab=subcontractors') : undefined}
          >
            {showGuidedEmptyState && (
              <ul className="mx-auto max-w-lg list-disc space-y-1.5 pl-5 text-left text-sm text-muted-foreground">
                <li>Track compliance status across W-9, insurance, and license dates.</li>
                <li>See active assignment load and billing rate at a glance.</li>
                <li>Open details quickly to manage contacts and documentation.</li>
              </ul>
            )}
          </EmptyState>
        ) : (
          <SubcontractorsCardGrid rows={pag.page} onSelect={openDetail} />
        )
      ) : (
        <>
          <Table>
            <TableHeader>
              <tr>
                <TableHead sortable sorted={sortKey === 'subcontractor_code' && sortDir} onSort={() => onSort('subcontractor_code')}>Code</TableHead>
                <TableHead sortable sorted={sortKey === 'company_name' && sortDir} onSort={() => onSort('company_name')}>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Active Jobs</TableHead>
                <TableHead sortable sorted={sortKey === 'hourly_rate' && sortDir} onSort={() => onSort('hourly_rate')}>Rate</TableHead>
                <TableHead>W-9 Status</TableHead>
                <TableHead>Compliance</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {pag.page.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => openDetail(row)}
                  className={cn('cursor-pointer', statusRowAccentClass(row.status))}
                >
                  <TableCell className="font-mono text-xs">
                    <div className="inline-flex max-w-[132px] rounded-md bg-muted px-2 py-1">
                      <span className="truncate" title={row.subcontractor_code}>{row.subcontractor_code}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <StatusDot status={row.status} />
                      <span className="inline-block max-w-[220px] truncate" title={row.company_name}>{row.company_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-block max-w-[180px] truncate text-muted-foreground" title={row.contact_name ?? 'Not Set'}>
                      {row.contact_name ?? 'Not Set'}
                    </span>
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">{activeJobsBySubcontractor[row.id] ?? 0}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{formatRate(row.hourly_rate ?? null)}</TableCell>
                  <TableCell>
                    {row.w9_on_file ? (
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">✓ On File</span>
                    ) : (
                      <span className="text-sm font-medium text-red-700 dark:text-red-300">✗ Missing</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge color={complianceColor(row)}>
                      {complianceLabel(row)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filtered.length === 0 && (
            <div className="mt-4">
              <EmptyState
                icon={<HardHat className="h-10 w-10" />}
                title={emptyTitle}
                description={emptyDescription}
                actionLabel={showGuidedEmptyState ? '+ Add Your First Subcontractor' : undefined}
                onAction={showGuidedEmptyState ? () => router.push('/vendors?tab=subcontractors') : undefined}
              >
                {showGuidedEmptyState && (
                  <ul className="mx-auto max-w-lg list-disc space-y-1.5 pl-5 text-left text-sm text-muted-foreground">
                    <li>Track compliance status across W-9, insurance, and license dates.</li>
                    <li>See active assignment load and billing rate at a glance.</li>
                    <li>Open details quickly to manage contacts and documentation.</li>
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
    </div>
  );
}
