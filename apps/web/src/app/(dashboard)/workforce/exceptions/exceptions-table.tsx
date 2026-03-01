'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, Button, ExportButton, SlideOver,
} from '@gleamops/ui';
import { EXCEPTION_SEVERITY_COLORS } from '@gleamops/shared';
import type { TimeException } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { EntityLink } from '@/components/links/entity-link';

interface ExceptionWithStaff extends TimeException {
  staff?: { staff_code: string; full_name: string } | null;
}

interface ExceptionsTableProps {
  search: string;
}

const EXCEPTION_TYPE_LABELS: Record<string, string> = {
  OUT_OF_GEOFENCE: 'Out of Geofence',
  LATE_ARRIVAL: 'Late Arrival',
  EARLY_DEPARTURE: 'Early Departure',
  MISSING_CHECKOUT: 'Missing Checkout',
  MANUAL_OVERRIDE: 'Manual Override',
};

export default function ExceptionsTable({ search }: ExceptionsTableProps) {
  const [rows, setRows] = useState<ExceptionWithStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ExceptionWithStaff | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('time_exceptions')
      .select(`
        *,
        staff:staff!time_exceptions_staff_id_fkey(staff_code, full_name)
      `)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(200);
    if (!error && data) setRows(data as unknown as ExceptionWithStaff[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleResolve = async (exceptionId: string) => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('time_exceptions')
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
        resolution_notes: 'Resolved by supervisor',
      })
      .eq('id', exceptionId);

    fetchData();
  };

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.staff?.full_name?.toLowerCase().includes(q) ||
        r.staff?.staff_code?.toLowerCase().includes(q) ||
        r.exception_type.toLowerCase().includes(q) ||
        r.severity.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'created_at', 'asc'
  );
  const sortedRows = sorted as unknown as ExceptionWithStaff[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={6} cols={6} />;

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-12 w-12" />}
        title="No exceptions"
        description={search ? 'Try a different search term.' : 'No time exceptions recorded.'}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="time-exceptions"
          columns={[
            { key: 'created_at', label: 'Date' },
            { key: 'exception_type', label: 'Type' },
            { key: 'severity', label: 'Severity' },
            { key: 'description', label: 'Description' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
      </div>
      <div className="w-full overflow-x-auto">
        <Table className="w-full min-w-full">
          <TableHeader>
            <tr>
              <TableHead sortable sorted={sortKey === 'created_at' && sortDir} onSort={() => onSort('created_at')}>Date</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Actions</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {pag.page.map((row) => (
              <TableRow key={row.id} className="cursor-pointer" onClick={() => setSelected(row)}>
                <TableCell>{new Date(row.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="font-medium">
                  {row.staff?.staff_code ? (
                    <EntityLink
                      entityType="staff"
                      code={row.staff.staff_code}
                      name={row.staff.full_name ?? row.staff.staff_code}
                      showCode={false}
                      stopPropagation
                    />
                  ) : (
                    row.staff?.full_name ?? '—'
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-xs">{EXCEPTION_TYPE_LABELS[row.exception_type] ?? row.exception_type}</span>
                </TableCell>
                <TableCell>
                  <Badge color={EXCEPTION_SEVERITY_COLORS[row.severity] ?? 'gray'}>{row.severity}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{row.description ?? '—'}</TableCell>
                <TableCell>
                  {!row.resolved_at && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleResolve(row.id);
                      }}
                    >
                      Resolve
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination
        currentPage={pag.currentPage} totalPages={pag.totalPages} totalItems={pag.totalItems}
        pageSize={pag.pageSize} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
        onNext={pag.nextPage} onPrev={pag.prevPage}
      />

      <SlideOver
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Exception ${selected.staff?.full_name ?? ''}`.trim() : 'Exception'}
        subtitle={selected ? (EXCEPTION_TYPE_LABELS[selected.exception_type] ?? selected.exception_type) : undefined}
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Severity</span>
              <Badge color={EXCEPTION_SEVERITY_COLORS[selected.severity] ?? 'gray'}>{selected.severity}</Badge>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Status</span>
              {selected.resolved_at ? (
                <span className="inline-flex items-center gap-1 text-success">
                  <CheckCircle className="h-4 w-4" />
                  Resolved
                </span>
              ) : (
                <Badge color="red">Open</Badge>
              )}
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Created</span>
              <span className="font-medium text-right">{new Date(selected.created_at).toLocaleString()}</span>
            </div>
            {selected.description && (
              <div>
                <div className="text-muted-foreground mb-1">Description</div>
                <div className="rounded-lg border border-border bg-muted/30 p-3 whitespace-pre-wrap">
                  {selected.description}
                </div>
              </div>
            )}
            {selected.resolved_at && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Resolved</span>
                <span className="font-medium text-right">{new Date(selected.resolved_at).toLocaleString()}</span>
              </div>
            )}
            {!selected.resolved_at && (
              <div className="pt-2">
                <Button variant="secondary" onClick={() => handleResolve(selected.id)}>
                  Resolve Exception
                </Button>
              </div>
            )}
          </div>
        )}
      </SlideOver>
    </div>
  );
}
