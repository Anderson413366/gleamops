'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, Button, ExportButton,
} from '@gleamops/ui';
import { EXCEPTION_SEVERITY_COLORS } from '@gleamops/shared';
import type { TimeException } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('time_exceptions')
      .select(`
        *,
        staff:staff_id(staff_code, full_name)
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
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'created_at' && sortDir} onSort={() => onSort('created_at')}>Date</TableHead>
            <TableHead>Staff</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{new Date(row.created_at).toLocaleDateString()}</TableCell>
              <TableCell className="font-medium">{row.staff?.full_name ?? '—'}</TableCell>
              <TableCell>
                <span className="text-xs">{EXCEPTION_TYPE_LABELS[row.exception_type] ?? row.exception_type}</span>
              </TableCell>
              <TableCell>
                <Badge color={EXCEPTION_SEVERITY_COLORS[row.severity] ?? 'gray'}>{row.severity}</Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{row.description ?? '—'}</TableCell>
              <TableCell>
                {row.resolved_at ? (
                  <span className="inline-flex items-center gap-1 text-success text-xs">
                    <CheckCircle className="h-3 w-3" />
                    Resolved
                  </span>
                ) : (
                  <Badge color="red">Open</Badge>
                )}
              </TableCell>
              <TableCell>
                {!row.resolved_at && (
                  <Button size="sm" variant="secondary" onClick={() => handleResolve(row.id)}>
                    Resolve
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        currentPage={pag.currentPage} totalPages={pag.totalPages} totalItems={pag.totalItems}
        pageSize={pag.pageSize} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
        onNext={pag.nextPage} onPrev={pag.prevPage}
      />
    </div>
  );
}
