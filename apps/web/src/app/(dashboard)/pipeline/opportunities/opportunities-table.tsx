'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Target } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, ExportButton,
} from '@gleamops/ui';
import { OPPORTUNITY_STAGE_COLORS } from '@gleamops/shared';
import type { SalesOpportunity } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { OpportunityForm } from '@/components/forms/opportunity-form';

interface OpportunityWithProspect extends SalesOpportunity {
  prospect?: { company_name: string; prospect_code: string } | null;
}

interface OpportunitiesTableProps {
  search: string;
  onSelect?: (opportunity: OpportunityWithProspect) => void;
}

function formatCurrency(n: number | null) {
  if (n == null) return '\u2014';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string | null) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function OpportunitiesTable({ search, onSelect }: OpportunitiesTableProps) {
  const [rows, setRows] = useState<OpportunityWithProspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<SalesOpportunity | null>(null);

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

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.opportunity_code.toLowerCase().includes(q) ||
        r.prospect?.company_name?.toLowerCase().includes(q) ||
        r.stage_code.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'name', 'asc'
  );
  const sortedRows = sorted as unknown as OpportunityWithProspect[];
  const pag = usePagination(sortedRows, 25);

  const handleRowClick = (row: OpportunityWithProspect) => {
    if (onSelect) {
      onSelect(row);
    } else {
      setEditItem(row);
      setFormOpen(true);
    }
  };

  if (loading) return <TableSkeleton rows={6} cols={7} />;

  if (filtered.length === 0) {
    return (
      <>
        <EmptyState
          icon={<Target className="h-12 w-12" />}
          title="No opportunities"
          description={search ? 'Try a different search term.' : 'Create your first opportunity to start tracking the pipeline.'}
        />
        <OpportunityForm
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
          filename="opportunities"
          columns={[
            { key: 'opportunity_code', label: 'Code' },
            { key: 'name', label: 'Name' },
            { key: 'stage_code', label: 'Stage' },
            { key: 'estimated_monthly_value', label: 'Est. Monthly Value' },
            { key: 'expected_close_date', label: 'Close Date' },
          ]}
          onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
        />
      </div>
      <Table>
        <TableHeader>
          <tr>
            <TableHead sortable sorted={sortKey === 'opportunity_code' && sortDir} onSort={() => onSort('opportunity_code')}>Code</TableHead>
            <TableHead sortable sorted={sortKey === 'name' && sortDir} onSort={() => onSort('name')}>Name</TableHead>
            <TableHead>Prospect</TableHead>
            <TableHead sortable sorted={sortKey === 'stage_code' && sortDir} onSort={() => onSort('stage_code')}>Stage</TableHead>
            <TableHead sortable sorted={sortKey === 'estimated_monthly_value' && sortDir} onSort={() => onSort('estimated_monthly_value')}>Est. Value</TableHead>
            <TableHead>Probability</TableHead>
            <TableHead sortable sorted={sortKey === 'expected_close_date' && sortDir} onSort={() => onSort('expected_close_date')}>Close Date</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {pag.page.map((row) => (
            <TableRow key={row.id} onClick={() => handleRowClick(row)} className="cursor-pointer">
              <TableCell className="font-mono text-xs">{row.opportunity_code}</TableCell>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {row.prospect ? `${row.prospect.company_name}` : '\u2014'}
              </TableCell>
              <TableCell>
                <Badge color={OPPORTUNITY_STAGE_COLORS[row.stage_code] ?? 'gray'}>
                  {row.stage_code.replace(/_/g, ' ')}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{formatCurrency(row.estimated_monthly_value)}</TableCell>
              <TableCell className="text-muted-foreground">{'\u2014'}</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(row.expected_close_date)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        currentPage={pag.currentPage} totalPages={pag.totalPages} totalItems={pag.totalItems}
        pageSize={pag.pageSize} hasNext={pag.hasNext} hasPrev={pag.hasPrev}
        onNext={pag.nextPage} onPrev={pag.prevPage}
      />

      <OpportunityForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditItem(null); }}
        initialData={editItem}
        onSuccess={fetchData}
      />
    </div>
  );
}
