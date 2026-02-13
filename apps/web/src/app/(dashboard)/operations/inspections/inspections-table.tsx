'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { ClipboardCheck, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, Button, ExportButton,
} from '@gleamops/ui';
import { INSPECTION_STATUS_COLORS } from '@gleamops/shared';
import type { Inspection } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

interface InspectionWithRelations extends Inspection {
  site?: { name: string; site_code: string } | null;
  inspector?: { full_name: string; staff_code: string } | null;
  template?: { name: string } | null;
  ticket?: { ticket_code: string } | null;
}

interface InspectionsTableProps {
  search: string;
  onSelect?: (inspection: InspectionWithRelations) => void;
  onCreateNew?: () => void;
}

export default function InspectionsTable({ search, onSelect, onCreateNew }: InspectionsTableProps) {
  const [rows, setRows] = useState<InspectionWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('inspections')
      .select(`
        *,
        site:site_id(name, site_code),
        inspector:inspector_id(full_name, staff_code),
        template:template_id(name),
        ticket:ticket_id(ticket_code)
      `)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(200);
    if (!error && data) setRows(data as unknown as InspectionWithRelations[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.inspection_code.toLowerCase().includes(q) ||
        r.site?.name?.toLowerCase().includes(q) ||
        r.inspector?.full_name?.toLowerCase().includes(q) ||
        r.template?.name?.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'created_at', 'asc'
  );
  const sortedRows = sorted as unknown as InspectionWithRelations[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={6} cols={7} />;

  return (
    <div>
      <div className="flex items-center justify-end gap-3 mb-4">
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="inspections"
          columns={[
            { key: 'inspection_code', label: 'Code' },
            { key: 'status', label: 'Status' },
            { key: 'score_pct', label: 'Score %' },
            { key: 'created_at', label: 'Date' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
        <Button size="sm" onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-1" />
          New Inspection
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="h-12 w-12" />}
          title="No inspections"
          description={search ? 'Try a different search term.' : 'Create your first inspection to start tracking quality.'}
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <tr>
                <TableHead sortable sorted={sortKey === 'inspection_code' && sortDir} onSort={() => onSort('inspection_code')}>Code</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Inspector</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead sortable sorted={sortKey === 'created_at' && sortDir} onSort={() => onSort('created_at')}>Date</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {pag.page.map((row) => (
                <TableRow key={row.id} onClick={() => onSelect?.(row)}>
                  <TableCell className="font-mono text-xs">{row.inspection_code}</TableCell>
                  <TableCell className="text-sm">{row.template?.name ?? '—'}</TableCell>
                  <TableCell className="font-medium">{row.site?.name ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{row.inspector?.full_name ?? '—'}</TableCell>
                  <TableCell>
                    {row.score_pct != null ? (
                      <span className={`text-sm font-medium ${Number(row.score_pct) >= 80 ? 'text-green-600' : Number(row.score_pct) >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {Number(row.score_pct).toFixed(0)}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge color={INSPECTION_STATUS_COLORS[row.status] ?? 'gray'}>{row.status}</Badge>
                  </TableCell>
                  <TableCell>{new Date(row.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
