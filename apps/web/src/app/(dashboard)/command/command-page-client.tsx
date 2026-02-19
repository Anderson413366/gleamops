'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChipTabs, SearchInput, Badge, EmptyState, Table, TableHeader, TableHead, TableBody, TableRow, TableCell, Pagination, TableSkeleton } from '@gleamops/ui';
import { Inbox, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { useSyncedTab } from '@/hooks/use-synced-tab';
import type { WorkTicket } from '@gleamops/shared';

interface QueueTicket extends WorkTicket {
  site?: { name: string; site_code: string; client?: { name: string } | null } | null;
  assignments?: { staff?: { full_name: string; staff_code: string } | null; subcontractor?: { company_name: string } | null }[];
}

const TABS = [
  { key: 'my-queue', label: 'My Queue', icon: <Inbox className="h-4 w-4" /> },
  { key: 'team-queue', label: 'Team Queue', icon: <Users className="h-4 w-4" /> },
  { key: 'escalations', label: 'Escalations', icon: <AlertTriangle className="h-4 w-4" /> },
  { key: 'done-today', label: 'Done Today', icon: <CheckCircle className="h-4 w-4" /> },
];

const STATUS_COLORS: Record<string, 'blue' | 'yellow' | 'green' | 'red' | 'gray' | 'orange' | 'purple'> = {
  SCHEDULED: 'blue',
  IN_PROGRESS: 'yellow',
  COMPLETED: 'green',
  CANCELLED: 'red',
  ON_HOLD: 'orange',
};

export default function CommandPageClient() {
  const router = useRouter();
  const [tab, setTab] = useSyncedTab({
    tabKeys: TABS.map((t) => t.key),
    defaultTab: 'my-queue',
  });
  const [search, setSearch] = useState('');
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from('work_tickets')
        .select('*, site:sites(name, site_code, client:clients(name)), assignments:ticket_assignments(staff:staff(full_name, staff_code), subcontractor:subcontractors(company_name))')
        .order('scheduled_date', { ascending: true });
      if (!cancelled) {
        setTickets((data ?? []) as QueueTicket[]);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const todayStr = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    let result = tickets;

    // Tab-based filtering
    if (tab === 'my-queue') {
      result = result.filter(
        (t) => ['SCHEDULED', 'IN_PROGRESS'].includes(t.status ?? '')
      );
    } else if (tab === 'team-queue') {
      result = result.filter((t) => ['SCHEDULED', 'IN_PROGRESS'].includes(t.status ?? ''));
    } else if (tab === 'escalations') {
      result = result.filter(
        (t) => t.status === 'ON_HOLD'
      );
    } else if (tab === 'done-today') {
      result = result.filter(
        (t) =>
          t.status === 'COMPLETED' &&
          t.updated_at?.slice(0, 10) === todayStr
      );
    }

    // Search filtering
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.ticket_code?.toLowerCase().includes(s) ||
          t.site?.name?.toLowerCase().includes(s) ||
          t.site?.client?.name?.toLowerCase().includes(s) ||
          t.assignments?.some((a) => a.staff?.full_name?.toLowerCase().includes(s))
      );
    }

    return result;
  }, [tickets, tab, search, todayStr]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[],
    'scheduled_date',
    'asc'
  );
  const pag = usePagination(sorted, 25);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Command Center</h1>
        <p className="text-sm text-muted-foreground mt-1">
          My Queue, Team Queue, Escalations, Done Today
        </p>
      </div>

      <ChipTabs tabs={TABS} active={tab} onChange={setTab} />
      <SearchInput value={search} onChange={setSearch} placeholder="Search tickets..." />

      {loading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : pag.page.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-10 w-10" />}
          title={tab === 'done-today' ? 'Nothing completed yet today' : 'Queue is empty'}
          description={
            tab === 'my-queue'
              ? 'No tickets assigned to you right now.'
              : tab === 'team-queue'
                ? 'No active tickets for the team.'
                : tab === 'escalations'
                  ? 'No escalated or on-hold tickets.'
                  : 'Check back later for completed work.'
          }
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => onSort('ticket_code')} className="cursor-pointer">
                  Ticket {sortKey === 'ticket_code' && (sortDir === 'asc' ? '\u2191' : '\u2193')}
                </TableHead>
                <TableHead onClick={() => onSort('site')} className="cursor-pointer">Site</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead onClick={() => onSort('scheduled_date')} className="cursor-pointer">
                  Date {sortKey === 'scheduled_date' && (sortDir === 'asc' ? '\u2191' : '\u2193')}
                </TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(pag.page as unknown as QueueTicket[]).map((t) => (
                <TableRow
                  key={t.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/operations/tickets/${t.ticket_code}`)}
                >
                  <TableCell className="font-medium">{t.ticket_code}</TableCell>
                  <TableCell>{t.site?.name ?? '-'}</TableCell>
                  <TableCell>
                    {t.assignments?.[0]?.staff?.full_name ??
                      t.assignments?.[0]?.subcontractor?.company_name ??
                      '-'}
                  </TableCell>
                  <TableCell>{t.scheduled_date ?? '-'}</TableCell>
                  <TableCell>
                    <Badge color={STATUS_COLORS[t.status ?? ''] ?? 'gray'}>
                      {t.status ?? '-'}
                    </Badge>
                  </TableCell>
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
            onGoTo={pag.goToPage}
          />
        </>
      )}
    </div>
  );
}
