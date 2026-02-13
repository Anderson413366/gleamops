'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Users, Star } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
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
} from '@gleamops/ui';
import type { Contact } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

interface ContactWithParent extends Contact {
  client?: { name: string; client_code: string } | null;
  site?: { name: string; site_code: string } | null;
}

interface ContactsTableProps {
  search: string;
  onSelect?: (contact: ContactWithParent) => void;
}

export default function ContactsTable({ search, onSelect }: ContactsTableProps) {
  const [rows, setRows] = useState<ContactWithParent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('contacts')
      .select('*, client:client_id(name, client_code), site:site_id(name, site_code)')
      .is('archived_at', null)
      .order('name');
    if (!error && data) setRows(data as unknown as ContactWithParent[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.contact_code.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.phone?.toLowerCase().includes(q) ||
        r.client?.name?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[],
    'name',
    'asc'
  );
  const sortedRows = sorted as unknown as ContactWithParent[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={8} cols={6} />;

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-12 w-12" />}
        title="No contacts found"
        description={search ? 'Try a different search term.' : 'Add a contact to a client or site.'}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="contacts"
          columns={[
            { key: 'contact_code', label: 'Code' },
            { key: 'name', label: 'Name' },
            { key: 'role', label: 'Role' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
      </div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'contact_code' && sortDir} onSort={() => onSort('contact_code')}>
              Code
            </TableHead>
            <TableHead sortable sorted={sortKey === 'name' && sortDir} onSort={() => onSort('name')}>
              Name
            </TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id} onClick={() => onSelect?.(row)}>
              <TableCell className="font-mono text-xs">{row.contact_code}</TableCell>
              <TableCell>
                <span className="font-medium">{row.name}</span>
                {row.is_primary && (
                  <Star className="inline ml-1.5 h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                )}
              </TableCell>
              <TableCell>
                {row.role ? <Badge color="blue">{row.role}</Badge> : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-muted-foreground">{row.client?.name ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{row.email ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{row.phone ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
    </div>
  );
}
