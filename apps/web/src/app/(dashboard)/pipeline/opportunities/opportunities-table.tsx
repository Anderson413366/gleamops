'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Target, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, ExportButton, StatusDot, statusRowAccentClass, cn, ViewToggle, Button,
} from '@gleamops/ui';
import { OPPORTUNITY_STAGE_COLORS } from '@gleamops/shared';
import type { SalesOpportunity } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { OpportunityForm } from '@/components/forms/opportunity-form';
import { PipelineFlowHint } from '@/components/empty-states/pipeline-flow-hint';
import { useViewPreference } from '@/hooks/use-view-preference';
import { OpportunitiesCardGrid } from './opportunities-card-grid';
import { EntityLink } from '@/components/links/entity-link';

interface OpportunityWithProspect extends SalesOpportunity {
  prospect?: { company_name: string; prospect_code: string } | null;
  probability_pct?: number | null;
}

interface OpportunitiesTableProps {
  search: string;
}

const STATUS_OPTIONS = [
  'QUALIFIED',
  'WALKTHROUGH_SCHEDULED',
  'WALKTHROUGH_COMPLETE',
  'BID_IN_PROGRESS',
  'PROPOSAL_SENT',
  'NEGOTIATION',
  'WON',
  'LOST',
  'all',
] as const;

function formatCurrency(n: number | null) {
  if (n == null) return '\u2014';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string | null) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function OpportunitiesTable({ search }: OpportunitiesTableProps) {
  const router = useRouter();
  const [rows, setRows] = useState<OpportunityWithProspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('QUALIFIED');
  const { view, setView } = useViewPreference('opportunities');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('sales_opportunities')
      .select('*, prospect:prospect_id(company_name, prospect_code)')
      .is('archived_at', null)
      .order('created_at', { ascending: false });
    if (!error && data) setRows(data as unknown as OpportunityWithProspect[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: rows.length };
    for (const row of rows) {
      const stage = row.stage_code ?? 'QUALIFIED';
      counts[stage] = (counts[stage] || 0) + 1;
    }
    return counts;
  }, [rows]);

  const filtered = useMemo(() => {
    let result = rows;
    if (statusFilter !== 'all') {
      result = result.filter((r) => (r.stage_code ?? 'QUALIFIED') === statusFilter);
    }
    if (!search) return result;
    const q = search.toLowerCase();
    return result.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.opportunity_code.toLowerCase().includes(q) ||
        r.prospect?.company_name?.toLowerCase().includes(q) ||
        r.stage_code.toLowerCase().includes(q)
    );
  }, [rows, statusFilter, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'name', 'asc'
  );
  const sortedRows = sorted as unknown as OpportunityWithProspect[];
  const pag = usePagination(sortedRows, 25);

  const handleRowClick = (row: OpportunityWithProspect) => {
    router.push(`/pipeline/opportunities/${encodeURIComponent(row.opportunity_code)}`);
  };

  const handleAdd = () => {
    setFormOpen(true);
  };

  if (loading) return <TableSkeleton rows={6} cols={7} />;

  const selectedStatusLabel = statusFilter === 'all'
    ? 'all statuses'
    : statusFilter.toLowerCase().replace(/_/g, ' ');
  const emptyTitle = statusFilter === 'all'
    ? 'No opportunities yet'
    : `No ${selectedStatusLabel} opportunities`;
  const emptyDescription = search
    ? 'Try a different search term.'
    : statusFilter === 'all'
      ? 'Turn qualified leads into active opportunities.'
      : 'All opportunities are currently in other stages.';

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Button size="sm" onClick={handleAdd}>
          <Plus className="h-4 w-4" /> New Opportunity
        </Button>
        <div className="flex items-center gap-3">
          <ViewToggle view={view} onChange={setView} />
          <ExportButton
            data={filtered as unknown as Record<string, unknown>[]}
            filename="opportunities"
            columns={[
              { key: 'opportunity_code', label: 'Code' },
              { key: 'name', label: 'Name' },
              { key: 'stage_code', label: 'Stage' },
              { key: 'estimated_monthly_value', label: 'Est. Monthly Value' },
              { key: 'probability_pct', label: 'Probability (%)' },
              { key: 'expected_close_date', label: 'Close Date' },
            ]}
            onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
          />
        </div>
      </div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              statusFilter === status
                ? 'bg-module-accent text-module-accent-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {status === 'all' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ')}
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
              statusFilter === status ? 'bg-white/20' : 'bg-background'
            )}>
              {statusCounts[status] || 0}
            </span>
          </button>
        ))}
      </div>
      {view === 'card' ? (
        filtered.length === 0 ? null : <OpportunitiesCardGrid rows={pag.page} onSelect={handleRowClick} />
      ) : (
        <Table>
          <TableHeader>
            <tr>
              <TableHead sortable sorted={sortKey === 'opportunity_code' && sortDir} onSort={() => onSort('opportunity_code')}>Code</TableHead>
              <TableHead sortable sorted={sortKey === 'name' && sortDir} onSort={() => onSort('name')}>Name</TableHead>
              <TableHead>Prospect</TableHead>
              <TableHead sortable sorted={sortKey === 'stage_code' && sortDir} onSort={() => onSort('stage_code')}>Stage</TableHead>
              <TableHead sortable sorted={sortKey === 'estimated_monthly_value' && sortDir} onSort={() => onSort('estimated_monthly_value')}>Est. Value</TableHead>
              <TableHead sortable sorted={sortKey === 'probability_pct' && sortDir} onSort={() => onSort('probability_pct')}>Probability</TableHead>
              <TableHead sortable sorted={sortKey === 'expected_close_date' && sortDir} onSort={() => onSort('expected_close_date')}>Close Date</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {pag.page.map((row) => (
              <TableRow
                key={row.id}
                onClick={() => handleRowClick(row)}
                className={cn('cursor-pointer', statusRowAccentClass(row.stage_code))}
              >
                <TableCell className="font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <StatusDot status={row.stage_code} />
                    <span>{row.opportunity_code}</span>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {row.prospect?.prospect_code ? (
                    <EntityLink
                      entityType="prospect"
                      code={row.prospect.prospect_code}
                      name={row.prospect.company_name}
                      showCode={false}
                      stopPropagation
                      className="inline-block max-w-[220px] truncate align-middle"
                    />
                  ) : (
                    '\u2014'
                  )}
                </TableCell>
                <TableCell>
                  <Badge color={OPPORTUNITY_STAGE_COLORS[row.stage_code] ?? 'gray'}>
                    {row.stage_code.replace(/_/g, ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatCurrency(row.estimated_monthly_value)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {row.probability_pct != null ? `${row.probability_pct}%` : '\u2014'}
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(row.expected_close_date)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {filtered.length === 0 && (
        <div className="mt-4">
          <EmptyState
            icon={(
              <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
                <Target className="h-10 w-10" />
                <Sparkles className="absolute -right-1 -top-1 h-4 w-4" />
              </div>
            )}
            title={emptyTitle}
            description={emptyDescription}
            actionLabel={search || statusFilter !== 'all' ? undefined : '+ Add Your First Opportunity'}
            onAction={search || statusFilter !== 'all' ? undefined : handleAdd}
          >
            {!search && statusFilter === 'all' && (
              <div className="space-y-4 text-left">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>Estimate monthly value and close timing for every deal.</li>
                  <li>Prioritize opportunities by stage so reps know what to do next.</li>
                  <li>Keep your revenue forecast visible and up to date.</li>
                </ul>
                <PipelineFlowHint />
              </div>
            )}
          </EmptyState>
        </div>
      )}
      {filtered.length > 0 && (
        <Pagination
          currentPage={pag.currentPage} totalPages={pag.totalPages} totalItems={pag.totalItems}
          pageSize={pag.pageSize} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
          onNext={pag.nextPage} onPrev={pag.prevPage}
        />
      )}

      <OpportunityForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
