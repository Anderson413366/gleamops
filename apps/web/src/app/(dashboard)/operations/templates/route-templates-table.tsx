'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Route } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
  EmptyState,
  Badge,
  ExportButton,
  ViewToggle,
  Pagination,
  Button,
  cn,
} from '@gleamops/ui';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { useViewPreference } from '@/hooks/use-view-preference';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { RouteTemplateForm } from '@/components/forms/route-template-form';
import { RouteTemplateCardGrid, type RouteTemplateListItem } from './route-template-card-grid';
import { RouteTemplateDetail } from './route-template-detail';

interface RouteTemplatesTableProps {
  search: string;
}

const STATUS_OPTIONS = ['all', 'ACTIVE', 'INACTIVE'] as const;

async function authHeaders() {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export default function RouteTemplatesTable({ search }: RouteTemplatesTableProps) {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<RouteTemplateListItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const { view, setView } = useViewPreference('route-templates');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await authHeaders();
      const response = await fetch('/api/operations/route-templates', {
        headers,
        cache: 'no-store',
      });

      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.data) {
        throw new Error(body?.detail ?? body?.title ?? 'Failed to load route templates.');
      }

      setTemplates((body.data ?? []) as RouteTemplateListItem[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load route templates.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    let rows = templates;

    if (statusFilter === 'ACTIVE') {
      rows = rows.filter((row) => row.is_active);
    } else if (statusFilter === 'INACTIVE') {
      rows = rows.filter((row) => !row.is_active);
    }

    const query = search.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((row) => {
      return row.template_code.toLowerCase().includes(query)
        || row.label.toLowerCase().includes(query)
        || row.weekday.toLowerCase().includes(query)
        || (row.assigned_staff?.full_name ?? '').toLowerCase().includes(query)
        || (row.assigned_staff?.staff_code ?? '').toLowerCase().includes(query)
        || (row.default_vehicle?.name ?? '').toLowerCase().includes(query)
        || (row.default_vehicle?.vehicle_code ?? '').toLowerCase().includes(query);
    });
  }, [templates, statusFilter, search]);

  const statusCounts = useMemo(() => {
    const active = templates.filter((row) => row.is_active).length;
    const inactive = templates.length - active;
    return {
      all: templates.length,
      ACTIVE: active,
      INACTIVE: inactive,
    };
  }, [templates]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[],
    'template_code',
    'asc',
  );
  const sortedRows = sorted as unknown as RouteTemplateListItem[];
  const pag = usePagination(sortedRows, 25);

  if (selectedTemplateId) {
    return (
      <RouteTemplateDetail
        templateId={selectedTemplateId}
        onBack={() => setSelectedTemplateId(null)}
        onRefresh={load}
      />
    );
  }

  if (loading) {
    return <TableSkeleton rows={6} cols={7} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          New Template
        </Button>

        <div className="flex items-center gap-3">
          <ViewToggle view={view} onChange={setView} />
          <ExportButton
            data={filtered as unknown as Record<string, unknown>[]}
            filename="route-templates"
            columns={[
              { key: 'template_code', label: 'Template Code' },
              { key: 'label', label: 'Label' },
              { key: 'weekday', label: 'Weekday' },
              { key: 'stop_count', label: 'Stops' },
              { key: 'is_active', label: 'Active' },
            ]}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 ease-in-out',
              statusFilter === status
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {status}
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
              statusFilter === status ? 'bg-primary-foreground/20' : 'bg-background',
            )}
            >
              {statusCounts[status]}
            </span>
          </button>
        ))}
      </div>

      {view === 'card' ? (
        filtered.length === 0 ? (
          <EmptyState
            icon={<Route className="h-12 w-12" />}
            title="No route templates"
            description="Create a template to auto-generate daily floater routes."
            actionLabel="Create Template"
            onAction={() => setFormOpen(true)}
          />
        ) : (
          <RouteTemplateCardGrid rows={pag.page} onSelect={(item) => setSelectedTemplateId(item.id)} />
        )
      ) : (
        <>
          <div className="w-full overflow-x-auto">
            <Table className="w-full min-w-full">
              <TableHeader>
                <tr>
                  <TableHead sortable sorted={sortKey === 'template_code' && sortDir} onSort={() => onSort('template_code')}>Code</TableHead>
                  <TableHead sortable sorted={sortKey === 'label' && sortDir} onSort={() => onSort('label')}>Label</TableHead>
                  <TableHead sortable sorted={sortKey === 'weekday' && sortDir} onSort={() => onSort('weekday')}>Weekday</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead sortable sorted={sortKey === 'stop_count' && sortDir} onSort={() => onSort('stop_count')}>Stops</TableHead>
                  <TableHead>Status</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {pag.page.map((row) => (
                  <TableRow key={row.id} className="cursor-pointer" onClick={() => setSelectedTemplateId(row.id)}>
                    <TableCell className="font-mono text-xs">{row.template_code}</TableCell>
                    <TableCell className="font-medium text-foreground">{row.label}</TableCell>
                    <TableCell>{row.weekday}</TableCell>
                    <TableCell>{row.assigned_staff?.full_name ?? row.assigned_staff?.staff_code ?? 'Unassigned'}</TableCell>
                    <TableCell>{row.default_vehicle?.name ?? row.default_vehicle?.vehicle_code ?? 'None'}</TableCell>
                    <TableCell>{row.stop_count}</TableCell>
                    <TableCell>
                      <Badge color={row.is_active ? 'green' : 'gray'}>
                        {row.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Route className="h-12 w-12" />}
              title="No route templates"
              description="Create a template to auto-generate daily floater routes."
              actionLabel="Create Template"
              onAction={() => setFormOpen(true)}
            />
          ) : null}
        </>
      )}

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

      <RouteTemplateForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={async () => {
          setFormOpen(false);
          await load();
        }}
      />
    </div>
  );
}
