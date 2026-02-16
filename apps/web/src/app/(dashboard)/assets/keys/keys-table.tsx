'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton,
  ExportButton, StatusDot, statusRowAccentClass, cn,
} from '@gleamops/ui';
import type { KeyInventory } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { KeyForm } from '@/components/forms/key-form';

interface KeyWithRelations extends KeyInventory {
  site?: { name: string; site_code: string } | null;
  assigned?: { full_name: string; staff_code: string } | null;
}

interface KeysTableProps {
  search: string;
  formOpen?: boolean;
  onFormClose?: () => void;
  onRefresh?: () => void;
}

export default function KeysTable({ search, formOpen, onFormClose, onRefresh }: KeysTableProps) {
  const [rows, setRows] = useState<KeyWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const router = useRouter();

  const supabase = getSupabaseBrowserClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('key_inventory')
      .select('*, site:site_id(name, site_code), assigned:assigned_to(full_name, staff_code)')
      .is('archived_at', null)
      .order('key_code');
    if (!error && data) setRows(data as unknown as KeyWithRelations[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Handle external form open trigger (New Key button from parent)
  useEffect(() => {
    if (formOpen) {
      setCreateOpen(true);
    }
  }, [formOpen]);

  const handleCreateClose = () => {
    setCreateOpen(false);
    onFormClose?.();
  };

  const handleCreateSuccess = () => {
    fetchData();
    onRefresh?.();
  };

  const handleRowClick = (row: KeyWithRelations) => {
    router.push(`/assets/keys/${row.key_code}`);
  };

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.key_code.toLowerCase().includes(q) ||
        (r.label?.toLowerCase().includes(q) ?? false) ||
        r.key_type.toLowerCase().includes(q) ||
        (r.site?.name?.toLowerCase().includes(q) ?? false) ||
        (r.assigned?.full_name?.toLowerCase().includes(q) ?? false)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'key_code', 'asc'
  );
  const sortedRows = sorted as unknown as KeyWithRelations[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={6} cols={6} />;

  if (filtered.length === 0) {
    return (
      <>
        <EmptyState
          icon={<KeyRound className="h-12 w-12" />}
          title="No keys found"
          description={search ? 'Try a different search term.' : 'Add your first key to get started.'}
        />
        <KeyForm
          open={createOpen}
          onClose={handleCreateClose}
          onSuccess={handleCreateSuccess}
        />
      </>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="keys"
          columns={[
            { key: 'key_code', label: 'Code' },
            { key: 'label', label: 'Label' },
            { key: 'key_type', label: 'Type' },
            { key: 'total_count', label: 'Count' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
      </div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'key_code' && sortDir} onSort={() => onSort('key_code')}>Code</TableHead>
            <TableHead sortable sorted={sortKey === 'label' && sortDir} onSort={() => onSort('label')}>Label</TableHead>
            <TableHead sortable sorted={sortKey === 'key_type' && sortDir} onSort={() => onSort('key_type')}>Type</TableHead>
            <TableHead>Site</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead sortable sorted={sortKey === 'total_count' && sortDir} onSort={() => onSort('total_count')}>Count</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow
              key={row.id}
              onClick={() => handleRowClick(row)}
              className={cn(statusRowAccentClass(row.status))}
            >
              <TableCell className="font-mono text-xs">
                <div className="flex items-center gap-2">
                  <StatusDot status={row.status} />
                  <span>{row.key_code}</span>
                </div>
              </TableCell>
              <TableCell className="font-medium">{row.label ?? '—'}</TableCell>
              <TableCell>
                <Badge color="blue">{row.key_type}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {row.site?.name ?? '—'}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {row.assigned?.full_name ?? '—'}
              </TableCell>
              <TableCell className="text-muted-foreground">{row.total_count ?? 0}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        currentPage={pag.currentPage} totalPages={pag.totalPages} totalItems={pag.totalItems}
        pageSize={pag.pageSize} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
        onNext={pag.nextPage} onPrev={pag.prevPage}
      />

      <KeyForm
        open={createOpen}
        onClose={handleCreateClose}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
