'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link2 } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { ServiceTask } from '@gleamops/shared';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton
} from '@gleamops/ui';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

interface ServiceTaskRow extends ServiceTask {
  service?: { name: string; service_code: string } | null;
  task?: { name: string; task_code: string } | null;
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
      .select('*, service:service_id(name, service_code), task:task_id(name, task_code)')
      .is('archived_at', null)
      .order('created_at', { ascending: false });
    if (!error && data) setRows(data as unknown as ServiceTaskRow[]);
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
      (r.task?.task_code ?? '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted } = useTableSort(filtered as unknown as Record<string, unknown>[], 'created_at', 'asc');
  const sortedRows = sorted as unknown as ServiceTaskRow[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={8} cols={4} />;
  if (filtered.length === 0) return <EmptyState icon={<Link2 className="h-10 w-10" />} title="No mappings found" description="Service-to-task mappings will appear here." />;

  return (
    <div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead>Service</TableHead>
            <TableHead>Task</TableHead>
            <TableHead>Default Frequency</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <div>
                  <span className="font-medium">{row.service?.name ?? '—'}</span>
                  <span className="text-xs text-muted-foreground ml-2">{row.service?.service_code}</span>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <span className="font-medium">{row.task?.name ?? '—'}</span>
                  <span className="text-xs text-muted-foreground ml-2">{row.task?.task_code}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge color="blue">{(row.frequency_default ?? '—').replace(/_/g, ' ')}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        currentPage={pag.currentPage} totalPages={pag.totalPages}
        totalItems={pag.totalItems} pageSize={pag.pageSize}
        hasNext={pag.hasNext} hasPrev={pag.hasPrev}
        onNext={pag.nextPage} onPrev={pag.prevPage} onGoTo={pag.goToPage}
      />
    </div>
  );
}
