'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Inbox } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  EmptyState,
  Badge,
  Pagination,
  TableSkeleton,
  ExportButton,
  ViewToggle,
  cn,
} from '@gleamops/ui';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { useViewPreference } from '@/hooks/use-view-preference';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { FieldReportsCardGrid, type FieldReportCardItem } from './field-reports-card-grid';

interface FieldReportsTableProps {
  search: string;
}

type FieldReportRow = FieldReportCardItem & {
  description: string;
};

const STATUS_OPTIONS = ['all', 'OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED'] as const;
const TYPE_OPTIONS = ['all', 'SUPPLY_REQUEST', 'MAINTENANCE', 'DAY_OFF', 'INCIDENT', 'GENERAL'] as const;

async function authHeaders() {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function statusColor(status: string): 'green' | 'yellow' | 'red' | 'orange' | 'blue' | 'gray' {
  switch (status) {
    case 'RESOLVED':
      return 'green';
    case 'DISMISSED':
      return 'gray';
    case 'IN_PROGRESS':
      return 'blue';
    case 'ACKNOWLEDGED':
      return 'yellow';
    default:
      return 'orange';
  }
}

function priorityColor(priority: string): 'green' | 'yellow' | 'red' | 'orange' | 'blue' | 'gray' {
  switch (priority) {
    case 'URGENT':
      return 'red';
    case 'HIGH':
      return 'orange';
    case 'LOW':
      return 'green';
    default:
      return 'yellow';
  }
}

export default function FieldReportsTable({ search }: FieldReportsTableProps) {
  const router = useRouter();
  const [rows, setRows] = useState<FieldReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('OPEN');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const { view, setView } = useViewPreference('workforce-field-reports');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('report_type', typeFilter);

      const response = await fetch(`/api/operations/field-reports?${params.toString()}`, {
        headers: await authHeaders(),
        cache: 'no-store',
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.data) {
        throw new Error(body?.detail ?? body?.title ?? 'Failed to load field reports.');
      }
      setRows((body.data ?? []) as FieldReportRow[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load field reports.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((row) =>
      row.report_code.toLowerCase().includes(query)
      || row.report_type.toLowerCase().includes(query)
      || row.status.toLowerCase().includes(query)
      || row.priority.toLowerCase().includes(query)
      || row.description.toLowerCase().includes(query)
      || (row.site?.name ?? '').toLowerCase().includes(query)
      || (row.site?.site_code ?? '').toLowerCase().includes(query)
      || (row.reporter?.full_name ?? '').toLowerCase().includes(query),
    );
  }, [rows, search]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: rows.length };
    for (const row of rows) {
      counts[row.status] = (counts[row.status] ?? 0) + 1;
    }
    return counts;
  }, [rows]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[],
    'created_at',
    'desc',
  );
  const sortedRows = sorted as unknown as FieldReportRow[];
  const pag = usePagination(sortedRows, 25);

  if (loading) {
    return <TableSkeleton rows={6} cols={7} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-3">
        <ViewToggle view={view} onChange={setView} />
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="field-reports"
          columns={[
            { key: 'report_code', label: 'Code' },
            { key: 'report_type', label: 'Type' },
            { key: 'status', label: 'Status' },
            { key: 'priority', label: 'Priority' },
            { key: 'created_at', label: 'Created' },
          ]}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 ease-in-out',
              statusFilter === status
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {status}
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
              statusFilter === status ? 'bg-primary-foreground/20' : 'bg-background',
            )}
            >
              {statusCounts[status] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold tracking-wide text-muted-foreground">Type</label>
        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm sm:w-72"
        >
          {TYPE_OPTIONS.map((type) => (
            <option key={type} value={type}>
              {type === 'all' ? 'All Types' : type}
            </option>
          ))}
        </select>
      </div>

      {view === 'card' ? (
        filtered.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-12 w-12" />}
            title="No field reports"
            description="Field reports submitted by specialists and floaters will appear here."
          />
        ) : (
          <FieldReportsCardGrid
            rows={pag.page}
            onSelect={(row) => router.push(`/workforce/field-reports/${encodeURIComponent(row.report_code)}`)}
          />
        )
      ) : (
        <>
          <div className="w-full overflow-x-auto">
            <Table className="w-full min-w-full">
              <TableHeader>
                <tr>
                  <TableHead sortable sorted={sortKey === 'report_code' && sortDir} onSort={() => onSort('report_code')}>Code</TableHead>
                  <TableHead sortable sorted={sortKey === 'created_at' && sortDir} onSort={() => onSort('created_at')}>Submitted</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Reported By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {pag.page.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/workforce/field-reports/${encodeURIComponent(row.report_code)}`)}
                  >
                    <TableCell className="font-mono text-xs">{row.report_code}</TableCell>
                    <TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>
                    <TableCell>{row.report_type}</TableCell>
                    <TableCell>{row.site?.name ?? row.site?.site_code ?? 'No site'}</TableCell>
                    <TableCell>{row.reporter?.full_name ?? row.reporter?.staff_code ?? 'Unknown'}</TableCell>
                    <TableCell>
                      <Badge color={statusColor(row.status)}>{row.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge color={priorityColor(row.priority)}>{row.priority}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-12 w-12" />}
              title="No field reports"
              description="Field reports submitted by specialists and floaters will appear here."
            />
          ) : null}
        </>
      )}

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
    </div>
  );
}

