'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BriefcaseBusiness } from 'lucide-react';
import { toast } from 'sonner';
import type { WorkTicket } from '@gleamops/shared';
import {
  Badge,
  EmptyState,
  ExportButton,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
} from '@gleamops/ui';
import { EntityLink } from '@/components/links/entity-link';
import { usePagination } from '@/hooks/use-pagination';
import { useTableSort } from '@/hooks/use-table-sort';
import { formatDate } from '@/lib/utils/date';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface WorkOrderTicket extends WorkTicket {
  job?: { job_code: string; job_name?: string | null } | null;
  site?: {
    site_code?: string | null;
    name?: string | null;
    client?: { name?: string | null; client_code?: string | null } | null;
  } | null;
  assignments?: Array<{
    assignment_status?: string | null;
    staff?: { full_name?: string | null } | null;
  }> | null;
}

interface WorkOrderTableRow extends WorkOrderTicket {
  site_name: string;
  assigned_crew: string;
}

interface WorkOrderTableProps {
  search: string;
}

const STATUS_BADGE_COLORS: Record<string, 'green' | 'blue' | 'yellow' | 'gray' | 'red'> = {
  SCHEDULED: 'blue',
  IN_PROGRESS: 'yellow',
  COMPLETED: 'green',
  VERIFIED: 'green',
  CANCELED: 'red',
};

function crewNames(row: WorkOrderTicket): string[] {
  return (row.assignments ?? [])
    .filter((assignment) => !assignment.assignment_status || assignment.assignment_status === 'ASSIGNED')
    .map((assignment) => assignment.staff?.full_name?.trim())
    .filter((name): name is string => Boolean(name));
}

function getSiteName(row: WorkOrderTicket): string {
  return row.site?.name?.trim() || row.site?.site_code?.trim() || '—';
}

function normalizeRows(rows: WorkOrderTicket[]): WorkOrderTableRow[] {
  return rows.map((row) => ({
    ...row,
    site_name: getSiteName(row),
    assigned_crew: crewNames(row).join(', '),
  }));
}

export function WorkOrderTable({ search }: WorkOrderTableProps) {
  const router = useRouter();
  const [rows, setRows] = useState<WorkOrderTableRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    const { data, error } = await supabase
      .from('work_tickets')
      .select(`
        *,
        job:job_id(job_code, job_name),
        site:site_id(site_code, name, client:client_id(name, client_code)),
        assignments:ticket_assignments(assignment_status, staff:staff_id(full_name))
      `)
      .is('archived_at', null)
      .order('scheduled_date', { ascending: true });

    if (error) {
      toast.error('Unable to load work orders right now.');
      setLoading(false);
      return;
    }

    const typedRows = (data ?? []) as unknown as WorkOrderTicket[];
    setRows(normalizeRows(typedRows));
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((row) => {
      const assignedCrew = row.assigned_crew.toLowerCase();
      return (
        row.ticket_code.toLowerCase().includes(query)
        || (row.job?.job_code ?? '').toLowerCase().includes(query)
        || (row.job?.job_name ?? '').toLowerCase().includes(query)
        || row.site_name.toLowerCase().includes(query)
        || (row.site?.client?.name ?? '').toLowerCase().includes(query)
        || assignedCrew.includes(query)
        || row.status.toLowerCase().includes(query)
      );
    });
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[],
    'scheduled_date',
    'asc'
  );
  const sortedRows = sorted as unknown as WorkOrderTableRow[];
  const pagination = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={8} cols={6} />;

  if (!filtered.length) {
    return (
      <EmptyState
        icon={<BriefcaseBusiness className="h-12 w-12" />}
        title="No work orders found"
        description={search ? 'Try a different search term.' : 'Create and schedule your first project work order.'}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="work-orders"
          columns={[
            { key: 'ticket_code', label: 'Work Order' },
            { key: 'site_name', label: 'Site' },
            { key: 'assigned_crew', label: 'Assigned Crew' },
            { key: 'scheduled_date', label: 'Scheduled Date' },
            { key: 'status', label: 'Status' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
      </div>

      <div className="w-full overflow-x-auto">
        <Table>
          <TableHeader>
            <tr>
              <TableHead sortable sorted={sortKey === 'ticket_code' && sortDir} onSort={() => onSort('ticket_code')}>
                Work Order
              </TableHead>
              <TableHead sortable sorted={sortKey === 'site_name' && sortDir} onSort={() => onSort('site_name')}>
                Site
              </TableHead>
              <TableHead>Assigned Crew</TableHead>
              <TableHead sortable sorted={sortKey === 'scheduled_date' && sortDir} onSort={() => onSort('scheduled_date')}>
                Date
              </TableHead>
              <TableHead sortable sorted={sortKey === 'status' && sortDir} onSort={() => onSort('status')}>
                Status
              </TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {pagination.page.map((row) => {
              const crew = crewNames(row);
              return (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/operations/tickets/${encodeURIComponent(row.ticket_code)}`)}
                >
                  <TableCell className="font-mono text-xs">{row.ticket_code}</TableCell>
                  <TableCell className="font-medium">
                    {row.site?.site_code ? (
                      <EntityLink
                        entityType="site"
                        code={row.site.site_code}
                        name={row.site_name}
                        showCode={false}
                        stopPropagation
                      />
                    ) : (
                      row.site_name
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {crew.length ? `${crew.slice(0, 2).join(', ')}${crew.length > 2 ? ` +${crew.length - 2}` : ''}` : 'Unassigned'}
                  </TableCell>
                  <TableCell>{formatDate(row.scheduled_date)}</TableCell>
                  <TableCell>
                    <Badge color={STATUS_BADGE_COLORS[row.status] ?? 'gray'}>{row.status}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        pageSize={pagination.pageSize}
        hasNext={pagination.hasNext}
        hasPrev={pagination.hasPrev}
        onNext={pagination.nextPage}
        onPrev={pagination.prevPage}
      />
    </div>
  );
}
