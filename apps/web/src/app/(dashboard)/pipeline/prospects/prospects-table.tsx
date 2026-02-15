'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, ExportButton, cn,
} from '@gleamops/ui';
import { PROSPECT_STATUS_COLORS } from '@gleamops/shared';
import type { SalesProspect } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { ProspectForm } from '@/components/forms/prospect-form';

interface ProspectsTableProps {
  search: string;
  onSelect?: (prospect: SalesProspect) => void;
}

export default function ProspectsTable({ search, onSelect }: ProspectsTableProps) {
  const [rows, setRows] = useState<SalesProspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<SalesProspect | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('sales_prospects')
      .select('*')
      .is('archived_at', null)
      .order('created_at', { ascending: false });
    if (!error && data) setRows(data as unknown as SalesProspect[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const statusOptions = useMemo(
    () => ['all', ...Array.from(new Set(rows.map((r) => r.prospect_status_code).filter(Boolean)))],
    [rows],
  );

  const filtered = useMemo(() => {
    let result = rows;
    if (statusFilter !== 'all') {
      result = result.filter((r) => r.prospect_status_code === statusFilter);
    }
    if (!search) return result;
    const q = search.toLowerCase();
    return result.filter(
      (r) =>
        r.company_name.toLowerCase().includes(q) ||
        r.prospect_code.toLowerCase().includes(q) ||
        r.source?.toLowerCase().includes(q)
    );
  }, [rows, search, statusFilter]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'company_name', 'asc'
  );
  const sortedRows = sorted as unknown as SalesProspect[];
  const pag = usePagination(sortedRows, 25);

  const handleEdit = (item: SalesProspect) => {
    setEditItem(item);
    setFormOpen(true);
  };

  const handleRowSelect = (item: SalesProspect) => {
    if (onSelect) {
      onSelect(item);
      return;
    }
    handleEdit(item);
  };

  if (loading) return <TableSkeleton rows={6} cols={5} />;

  if (filtered.length === 0) {
    return (
      <>
        <EmptyState
          icon={<TrendingUp className="h-12 w-12" />}
          title="No prospects"
          description={search ? 'Try a different search term.' : 'Add your first prospect to build the pipeline.'}
        />
        <ProspectForm
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditItem(null); }}
          initialData={editItem}
          onSuccess={fetchData}
        />
      </>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="prospects"
          columns={[
            { key: 'prospect_code', label: 'Code' },
            { key: 'company_name', label: 'Company' },
            { key: 'prospect_status_code', label: 'Status' },
            { key: 'source', label: 'Source' },
            { key: 'created_at', label: 'Created' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {statusOptions.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              statusFilter === status ? 'bg-module-accent text-module-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {status === 'all' ? 'All statuses' : status}
          </button>
        ))}
      </div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'prospect_code' && sortDir} onSort={() => onSort('prospect_code')}>Code</TableHead>
            <TableHead sortable sorted={sortKey === 'company_name' && sortDir} onSort={() => onSort('company_name')}>Company</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Source</TableHead>
            <TableHead sortable sorted={sortKey === 'created_at' && sortDir} onSort={() => onSort('created_at')}>Created</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id} onClick={() => handleRowSelect(row)} className="cursor-pointer">
              <TableCell className="font-mono text-xs">{row.prospect_code}</TableCell>
              <TableCell className="font-medium">{row.company_name}</TableCell>
              <TableCell>
                <Badge color={PROSPECT_STATUS_COLORS[row.prospect_status_code] ?? 'gray'}>
                  {row.prospect_status_code}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{row.source ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        currentPage={pag.currentPage} totalPages={pag.totalPages} totalItems={pag.totalItems}
        pageSize={pag.pageSize} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
        onNext={pag.nextPage} onPrev={pag.prevPage}
      />

      <ProspectForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditItem(null); }}
        initialData={editItem}
        onSuccess={fetchData}
      />
    </div>
  );
}
