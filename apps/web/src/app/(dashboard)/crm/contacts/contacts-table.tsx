'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Star, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, ExportButton, ViewToggle, Button,
} from '@gleamops/ui';
import type { Contact } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { useViewPreference } from '@/hooks/use-view-preference';
import { ContactsCardGrid } from './contacts-card-grid';
import { ContactForm } from '@/components/forms/contact-form';
import { EntityLink } from '@/components/links/entity-link';

const CONTACT_TYPE_COLORS: Record<string, 'blue' | 'green' | 'purple' | 'orange' | 'gray'> = {
  PRIMARY: 'blue',
  BILLING: 'green',
  OPERATIONS: 'purple',
  EMERGENCY: 'orange',
  OTHER: 'gray',
};

interface ContactWithParent extends Contact {
  client?: { name: string; client_code: string } | null;
  site?: { name: string; site_code: string } | null;
}

interface ContactsTableProps {
  search: string;
}

export default function ContactsTable({ search }: ContactsTableProps) {
  const router = useRouter();
  const [rows, setRows] = useState<ContactWithParent[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const { view, setView } = useViewPreference('contacts');

  const handleRowClick = useCallback((row: ContactWithParent) => {
    router.push(`/crm/contacts/${encodeURIComponent(row.contact_code)}`);
  }, [router]);

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

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.contact_code.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.phone?.toLowerCase().includes(q) ||
        r.client?.name?.toLowerCase().includes(q) ||
        r.contact_type?.toLowerCase().includes(q) ||
        r.company_name?.toLowerCase().includes(q) ||
        r.first_name?.toLowerCase().includes(q) ||
        r.last_name?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'name', 'asc'
  );
  const sortedRows = sorted as unknown as ContactWithParent[];
  const pag = usePagination(sortedRows, 25);
  const handleAdd = () => setFormOpen(true);

  if (loading) return <TableSkeleton rows={8} cols={8} />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Button size="sm" onClick={handleAdd}>
          <Plus className="h-4 w-4" /> New Contact
        </Button>
        <div className="flex items-center gap-3">
          <ViewToggle view={view} onChange={setView} />
          <ExportButton
            data={filtered as unknown as Record<string, unknown>[]}
            filename="contacts"
            columns={[
              { key: 'contact_code', label: 'Code' },
              { key: 'name', label: 'Name' },
              { key: 'contact_type', label: 'Type' },
              { key: 'role', label: 'Role' },
              { key: 'company_name', label: 'Company' },
              { key: 'email', label: 'Email' },
              { key: 'phone', label: 'Phone' },
              { key: 'preferred_contact_method', label: 'Preferred Method' },
            ]}
            onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
          />
        </div>
      </div>
      {view === 'card' ? (
        filtered.length === 0 ? (
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title="No contacts yet"
            description={search ? 'Try a different search term.' : 'Add primary contacts so teams always know who to call.'}
            actionLabel={search ? undefined : '+ Add Your First Contact'}
            onAction={search ? undefined : handleAdd}
          />
        ) : (
          <ContactsCardGrid rows={pag.page} onSelect={handleRowClick} />
        )
      ) : (
        <>
          <div className="w-full overflow-x-auto">
            <Table className="w-full min-w-full">
              <TableHeader>
                <tr>
                  <TableHead sortable sorted={sortKey === 'contact_code' && sortDir} onSort={() => onSort('contact_code')}>Code</TableHead>
                  <TableHead sortable sorted={sortKey === 'name' && sortDir} onSort={() => onSort('name')}>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Client / Site</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {pag.page.map((row) => (
                  <TableRow key={row.id} onClick={() => handleRowClick(row)} className="cursor-pointer">
                    <TableCell className="font-mono text-xs">{row.contact_code}</TableCell>
                    <TableCell>
                      <span className="font-medium">{row.name}</span>
                      {row.is_primary && (
                        <Star className="inline ml-1.5 h-3.5 w-3.5 text-warning fill-warning" />
                      )}
                    </TableCell>
                    <TableCell>
                      {row.contact_type ? (
                        <Badge color={CONTACT_TYPE_COLORS[row.contact_type] ?? 'gray'}>{row.contact_type}</Badge>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.role_title ?? row.role ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{row.company_name ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex flex-col gap-1">
                        {row.client?.client_code && (
                          <EntityLink
                            entityType="client"
                            code={row.client.client_code}
                            name={row.client.name ?? row.client.client_code}
                            showCode={false}
                            stopPropagation
                          />
                        )}
                        {row.site?.site_code && (
                          <EntityLink
                            entityType="site"
                            code={row.site.site_code}
                            name={row.site.name ?? row.site.site_code}
                            showCode={false}
                            stopPropagation
                          />
                        )}
                        {!row.client?.client_code && !row.site?.site_code && (
                          <span className="text-muted-foreground">Not Set</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.email ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{row.mobile_phone ?? row.phone ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filtered.length === 0 && (
            <div className="mt-4">
              <EmptyState
                icon={<Users className="h-12 w-12" />}
                title="No contacts yet"
                description={search ? 'Try a different search term.' : 'Add primary contacts so teams always know who to call.'}
                actionLabel={search ? undefined : '+ Add Your First Contact'}
                onAction={search ? undefined : handleAdd}
              />
            </div>
          )}
        </>
      )}
      {filtered.length > 0 && (
        <Pagination
          currentPage={pag.currentPage} totalPages={pag.totalPages} totalItems={pag.totalItems}
          pageSize={pag.pageSize} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
          onNext={pag.nextPage} onPrev={pag.prevPage}
        />
      )}
      <ContactForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
