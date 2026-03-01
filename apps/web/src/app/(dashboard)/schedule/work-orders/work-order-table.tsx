'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BriefcaseBusiness, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { WorkTicket } from '@gleamops/shared';
import {
  Badge,
  Button,
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
  ViewToggle,
} from '@gleamops/ui';
import { EntityLink } from '@/components/links/entity-link';
import { usePagination } from '@/hooks/use-pagination';
import { useTableSort } from '@/hooks/use-table-sort';
import { useViewPreference } from '@/hooks/use-view-preference';
import { formatDate } from '@/lib/utils/date';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { WorkOrderForm, type WorkOrderCreateResult } from '@/components/forms/work-order-form';
import { WorkOrderCardGrid } from './work-order-card-grid';
import { WorkOrderCalendar } from './work-order-calendar';
import { WorkOrderCompletion } from './work-order-completion';

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

export interface WorkOrderTableRow extends WorkOrderTicket {
  site_name: string;
  assigned_crew: string;
}

interface WorkOrderTableProps {
  search: string;
  openCreateToken?: number;
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

export function WorkOrderTable({ search, openCreateToken = 0 }: WorkOrderTableProps) {
  const router = useRouter();
  const { view, setView } = useViewPreference('schedule-work-orders', { allowCalendar: true });
  const [rows, setRows] = useState<WorkOrderTableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [completionRow, setCompletionRow] = useState<WorkOrderTableRow | null>(null);
  const [workOrderFormOpen, setWorkOrderFormOpen] = useState(false);
  const [workOrderFormInitialValues, setWorkOrderFormInitialValues] = useState<{ scheduledDate?: string }>({});

  const openWorkOrderForm = useCallback((initialValues?: { scheduledDate?: string }) => {
    setWorkOrderFormInitialValues(initialValues ?? {});
    setWorkOrderFormOpen(true);
  }, []);

  const closeWorkOrderForm = useCallback(() => {
    setWorkOrderFormOpen(false);
    setWorkOrderFormInitialValues({});
  }, []);

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

  useEffect(() => {
    if (openCreateToken > 0) {
      openWorkOrderForm();
    }
  }, [openCreateToken, openWorkOrderForm]);

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
      <div className="space-y-4">
        <div className="flex items-center justify-end">
          <Button type="button" onClick={() => openWorkOrderForm()}>
            <Plus className="h-4 w-4" />
            New Work Order
          </Button>
        </div>
        <EmptyState
          icon={<BriefcaseBusiness className="h-12 w-12" />}
          title="No work orders found"
          description={search ? 'Try a different search term.' : 'Create and schedule your first project work order.'}
        />
        <WorkOrderForm
          open={workOrderFormOpen}
          onClose={closeWorkOrderForm}
          initialValues={workOrderFormInitialValues}
          onSuccess={(created: WorkOrderCreateResult) => {
            void fetchRows();
            router.push(`/schedule/work-orders/work-order-detail?ticket=${encodeURIComponent(created.ticketCode)}`);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-3">
        <Button type="button" onClick={() => openWorkOrderForm()}>
          <Plus className="h-4 w-4" />
          New Work Order
        </Button>
        <ViewToggle view={view} onChange={setView} allowCalendar />
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

      {view === 'calendar' ? (
        <WorkOrderCalendar
          rows={filtered}
          onSelect={(row) => router.push(`/schedule/work-orders/work-order-detail?ticket=${encodeURIComponent(row.ticket_code)}`)}
          onCreateAtDate={(date) => openWorkOrderForm({ scheduledDate: date })}
        />
      ) : view === 'card' ? (
        <WorkOrderCardGrid
          rows={pagination.page}
          onSelect={(row) => router.push(`/schedule/work-orders/work-order-detail?ticket=${encodeURIComponent(row.ticket_code)}`)}
        />
      ) : (
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
                <TableHead className="text-right">Action</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {pagination.page.map((row) => {
                const crew = crewNames(row);
                return (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/schedule/work-orders/work-order-detail?ticket=${encodeURIComponent(row.ticket_code)}`)}
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
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={(event) => {
                          event.stopPropagation();
                          setCompletionRow(row);
                        }}
                      >
                        Complete
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {view !== 'calendar' ? (
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
      ) : null}

      <WorkOrderCompletion
        open={Boolean(completionRow)}
        row={completionRow}
        onClose={() => setCompletionRow(null)}
        onCompleted={() => {
          void fetchRows();
        }}
      />

      <WorkOrderForm
        open={workOrderFormOpen}
        onClose={closeWorkOrderForm}
        initialValues={workOrderFormInitialValues}
        onSuccess={(created: WorkOrderCreateResult) => {
          void fetchRows();
          router.push(`/schedule/work-orders/work-order-detail?ticket=${encodeURIComponent(created.ticketCode)}`);
        }}
      />
    </div>
  );
}
