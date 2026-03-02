'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquareWarning, Plus } from 'lucide-react';
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
  Button,
  cn,
} from '@gleamops/ui';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { useViewPreference } from '@/hooks/use-view-preference';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ComplaintForm } from '@/components/forms/complaint-form';
import { ComplaintCardGrid, type ComplaintCardItem } from './complaint-card-grid';

interface ComplaintsTableProps {
  search: string;
}

type ComplaintRow = ComplaintCardItem & {
  customer_original_message: string | null;
};

const STATUS_OPTIONS = ['all', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED', 'CLOSED'] as const;
const PRIORITY_OPTIONS = ['all', 'LOW', 'NORMAL', 'HIGH', 'CRITICAL'] as const;

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
    case 'CLOSED':
      return 'green';
    case 'IN_PROGRESS':
      return 'blue';
    case 'ESCALATED':
      return 'red';
    case 'ASSIGNED':
      return 'yellow';
    default:
      return 'orange';
  }
}

function priorityColor(priority: string): 'green' | 'yellow' | 'red' | 'orange' | 'blue' | 'gray' {
  switch (priority) {
    case 'CRITICAL':
      return 'red';
    case 'HIGH':
      return 'orange';
    case 'NORMAL':
      return 'yellow';
    case 'LOW':
      return 'green';
    default:
      return 'gray';
  }
}

export default function ComplaintsTable({ search }: ComplaintsTableProps) {
  const router = useRouter();
  const [rows, setRows] = useState<ComplaintRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('OPEN');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const { view, setView } = useViewPreference('operations-complaints');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);

      const response = await fetch(`/api/operations/complaints?${params.toString()}`, {
        headers: await authHeaders(),
        cache: 'no-store',
      });

      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.data) {
        throw new Error(body?.detail ?? body?.title ?? 'Failed to load complaints.');
      }

      setRows((body.data ?? []) as ComplaintRow[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load complaints.');
    } finally {
      setLoading(false);
    }
  }, [priorityFilter, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((row) =>
      row.complaint_code.toLowerCase().includes(query)
      || (row.site?.name ?? '').toLowerCase().includes(query)
      || (row.site?.site_code ?? '').toLowerCase().includes(query)
      || (row.customer_original_message ?? '').toLowerCase().includes(query)
      || (row.assigned_staff?.full_name ?? '').toLowerCase().includes(query)
      || row.status.toLowerCase().includes(query)
      || row.priority.toLowerCase().includes(query),
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
  const sortedRows = sorted as unknown as ComplaintRow[];
  const pag = usePagination(sortedRows, 25);

  if (loading) {
    return <TableSkeleton rows={6} cols={7} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          New Complaint
        </Button>

        <div className="flex items-center gap-3">
          <ViewToggle view={view} onChange={setView} />
          <ExportButton
            data={filtered as unknown as Record<string, unknown>[]}
            filename="complaints"
            columns={[
              { key: 'complaint_code', label: 'Complaint' },
              { key: 'status', label: 'Status' },
              { key: 'priority', label: 'Priority' },
              { key: 'category', label: 'Category' },
              { key: 'created_at', label: 'Created' },
            ]}
          />
        </div>
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
            <span
              className={cn(
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
        <label className="mb-1 block text-xs font-semibold tracking-wide text-muted-foreground">Priority</label>
        <select
          value={priorityFilter}
          onChange={(event) => setPriorityFilter(event.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm sm:w-72"
        >
          {PRIORITY_OPTIONS.map((priority) => (
            <option key={priority} value={priority}>
              {priority === 'all' ? 'All Priorities' : priority}
            </option>
          ))}
        </select>
      </div>

      {view === 'card' ? (
        filtered.length === 0 ? (
          <EmptyState
            icon={<MessageSquareWarning className="h-12 w-12" />}
            title="No complaints"
            description="Create a complaint to start intake and route resolution."
            actionLabel="Create Complaint"
            onAction={() => setFormOpen(true)}
          />
        ) : (
          <ComplaintCardGrid rows={pag.page} onSelect={(row) => router.push(`/operations/complaints/${encodeURIComponent(row.complaint_code)}`)} />
        )
      ) : (
        <>
          <div className="w-full overflow-x-auto">
            <Table className="w-full min-w-full">
              <TableHeader>
                <tr>
                  <TableHead sortable sorted={sortKey === 'complaint_code' && sortDir} onSort={() => onSort('complaint_code')}>Code</TableHead>
                  <TableHead sortable sorted={sortKey === 'created_at' && sortDir} onSort={() => onSort('created_at')}>Reported</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Assigned</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {pag.page.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/operations/complaints/${encodeURIComponent(row.complaint_code)}`)}
                  >
                    <TableCell className="font-mono text-xs">{row.complaint_code}</TableCell>
                    <TableCell>{new Date(row.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{row.site?.name ?? row.site?.site_code ?? 'Unknown site'}</TableCell>
                    <TableCell>
                      <Badge color={statusColor(row.status)}>{row.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge color={priorityColor(row.priority)}>{row.priority}</Badge>
                    </TableCell>
                    <TableCell>{row.category}</TableCell>
                    <TableCell>{row.assigned_staff?.full_name ?? row.assigned_staff?.staff_code ?? 'Unassigned'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<MessageSquareWarning className="h-12 w-12" />}
              title="No complaints"
              description="Create a complaint to start intake and route resolution."
              actionLabel="Create Complaint"
              onAction={() => setFormOpen(true)}
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

      <ComplaintForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={async () => {
          setFormOpen(false);
          await load();
        }}
      />
    </div>
  );
}
