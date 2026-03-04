'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { ServiceTask } from '@gleamops/shared';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, ExportButton,
} from '@gleamops/ui';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

interface ServiceTaskRow extends ServiceTask {
  service?: { name: string; service_code: string } | null;
  task?: { name: string; code: string; category: string | null } | null;
}

interface Props {
  search: string;
}

export default function ServiceTaskMapping({ search }: Props) {
  const [rows, setRows] = useState<ServiceTaskRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    const { data, error } = await supabase
      .from('service_tasks')
      .select('id, service_id, task_id, sequence_order, frequency_default, is_required, estimated_minutes, quality_weight, priority_level, service:service_id(name, service_code), task:task_id(name, code, category)')
      .is('archived_at', null)
      .order('sequence_order', { ascending: true })
      .limit(500);

    if (error) {
      console.error('[ServiceTaskMapping] Fetch error:', error.message);
      toast.error('Failed to load task mappings');
    } else if (data) {
      setRows(data as unknown as ServiceTaskRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      (r.service?.name ?? '').toLowerCase().includes(q) ||
      (r.task?.name ?? '').toLowerCase().includes(q) ||
      (r.service?.service_code ?? '').toLowerCase().includes(q) ||
      (r.task?.code ?? '').toLowerCase().includes(q) ||
      (r.task?.category ?? '').toLowerCase().includes(q) ||
      (r.frequency_default ?? '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'sequence_order', 'asc',
  );
  const sortedRows = sorted as unknown as ServiceTaskRow[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={8} cols={5} />;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filtered.length} mapping{filtered.length !== 1 ? 's' : ''}
        </p>
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="task-mappings"
          columns={[
            { key: 'service', label: 'Service' },
            { key: 'task', label: 'Task' },
            { key: 'frequency_default', label: 'Frequency' },
            { key: 'sequence_order', label: 'Sequence' },
            { key: 'is_required', label: 'Required' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
      </div>

      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'service_id' && sortDir} onSort={() => onSort('service_id')}>Service</TableHead>
            <TableHead sortable sorted={sortKey === 'task_id' && sortDir} onSort={() => onSort('task_id')}>Task</TableHead>
            <TableHead>Category</TableHead>
            <TableHead sortable sorted={sortKey === 'frequency_default' && sortDir} onSort={() => onSort('frequency_default')}>Frequency</TableHead>
            <TableHead sortable sorted={sortKey === 'sequence_order' && sortDir} onSort={() => onSort('sequence_order')}>Seq #</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <span className="font-medium">{row.service?.name ?? '—'}</span>
                {row.service?.service_code && <span className="text-xs text-muted-foreground ml-2">{row.service.service_code}</span>}
              </TableCell>
              <TableCell>
                <span className="font-medium">{row.task?.name ?? '—'}</span>
                {row.task?.code && <span className="text-xs text-muted-foreground ml-2">{row.task.code}</span>}
              </TableCell>
              <TableCell>
                {row.task?.category ? (
                  <Badge color="gray">{row.task.category.replace(/_/g, ' ')}</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <Badge color="blue">{(row.frequency_default ?? '—').replace(/_/g, ' ')}</Badge>
              </TableCell>
              <TableCell className="tabular-nums text-muted-foreground">{row.sequence_order}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {filtered.length === 0 && (
        <div className="mt-4">
          <EmptyState
            icon={<Link2 className="h-10 w-10" />}
            title={search ? 'No matching mappings' : 'No mappings yet'}
            description={search ? 'Try a different search term.' : 'Service-to-task mappings will appear here. Add tasks to services via the Service Definitions tab.'}
          />
        </div>
      )}

      {filtered.length > 0 && (
        <Pagination
          currentPage={pag.currentPage} totalPages={pag.totalPages}
          totalItems={pag.totalItems} pageSize={pag.pageSize}
          hasNext={pag.hasNext} hasPrev={pag.hasPrev}
          onNext={pag.nextPage} onPrev={pag.prevPage} onGoTo={pag.goToPage}
        />
      )}
    </div>
  );
}
