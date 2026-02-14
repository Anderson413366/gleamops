'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { FileText, Plus, Pencil, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, Button, ExportButton,
} from '@gleamops/ui';
import type { InspectionTemplate } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { TemplateBuilder } from './template-builder';

interface TemplateWithItemCount extends InspectionTemplate {
  item_count?: number;
  service?: { name: string } | null;
}

interface TemplatesTableProps {
  search: string;
}

export default function TemplatesTable({ search }: TemplatesTableProps) {
  const [rows, setRows] = useState<TemplateWithItemCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editTemplateId, setEditTemplateId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    // Fetch templates with service name
    const { data, error } = await supabase
      .from('inspection_templates')
      .select(`
        *,
        service:service_id(name)
      `)
      .is('archived_at', null)
      .order('name');

    if (!error && data) {
      const templates = data as unknown as TemplateWithItemCount[];

      // Fetch item counts for each template
      const templateIds = templates.map((t) => t.id);
      if (templateIds.length > 0) {
        const { data: countData } = await supabase
          .from('inspection_template_items')
          .select('template_id')
          .in('template_id', templateIds)
          .is('archived_at', null);

        if (countData) {
          const counts = new Map<string, number>();
          for (const item of countData) {
            counts.set(item.template_id, (counts.get(item.template_id) || 0) + 1);
          }
          for (const t of templates) {
            t.item_count = counts.get(t.id) || 0;
          }
        }
      }

      setRows(templates);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.template_code.toLowerCase().includes(q) ||
        r.service?.name?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'name', 'asc'
  );
  const sortedRows = sorted as unknown as TemplateWithItemCount[];
  const pag = usePagination(sortedRows, 25);

  const handleToggleActive = async (template: TemplateWithItemCount) => {
    const supabase = getSupabaseBrowserClient();
    await supabase
      .from('inspection_templates')
      .update({ is_active: !template.is_active })
      .eq('id', template.id);
    fetchData();
  };

  if (loading) return <TableSkeleton rows={5} cols={6} />;

  return (
    <div>
      <div className="flex items-center justify-end gap-3 mb-4">
        <ExportButton
          data={filtered as unknown as Record<string, unknown>[]}
          filename="inspection-templates"
          columns={[
            { key: 'template_code', label: 'Code' },
            { key: 'name', label: 'Name' },
            { key: 'scoring_scale', label: 'Scale' },
            { key: 'pass_threshold', label: 'Pass %' },
            { key: 'is_active', label: 'Active' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
        <Button size="sm" onClick={() => { setEditTemplateId(null); setBuilderOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" />
          New Template
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="No templates"
          description={search ? 'Try a different search term.' : 'Create your first inspection template to standardize quality checks.'}
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <tr>
                <TableHead sortable sorted={sortKey === 'template_code' && sortDir} onSort={() => onSort('template_code')}>Code</TableHead>
                <TableHead sortable sorted={sortKey === 'name' && sortDir} onSort={() => onSort('name')}>Name</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Scale</TableHead>
                <TableHead>Pass %</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {pag.page.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">{row.template_code}</TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{row.service?.name ?? '—'}</TableCell>
                  <TableCell>
                    <Badge color="gray">{row.item_count ?? 0}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">0–{row.scoring_scale}</TableCell>
                  <TableCell className="text-sm font-medium">{row.pass_threshold}%</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleToggleActive(row); }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {row.is_active ? (
                        <ToggleRight className="h-5 w-5 text-success" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditTemplateId(row.id);
                        setBuilderOpen(true);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Button>
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
        </>
      )}

      <TemplateBuilder
        open={builderOpen}
        onClose={() => { setBuilderOpen(false); setEditTemplateId(null); }}
        templateId={editTemplateId}
        onSaved={fetchData}
      />
    </div>
  );
}
