'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Clock, LogIn, LogOut } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, Button,
} from '@gleamops/ui';
import { TIME_ENTRY_STATUS_COLORS } from '@gleamops/shared';
import type { TimeEntry } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

interface EntryWithRelations extends TimeEntry {
  staff?: { staff_code: string; full_name: string } | null;
  ticket?: { ticket_code: string } | null;
  site?: { name: string } | null;
}

interface TimeEntriesTableProps {
  search: string;
  onRefresh?: () => void;
}

export default function TimeEntriesTable({ search, onRefresh }: TimeEntriesTableProps) {
  const [rows, setRows] = useState<EntryWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        *,
        staff:staff_id(staff_code, full_name),
        ticket:ticket_id(ticket_code),
        site:site_id(name)
      `)
      .is('archived_at', null)
      .order('start_at', { ascending: false })
      .limit(200);
    if (!error && data) setRows(data as unknown as EntryWithRelations[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCheckIn = async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Find the staff record for the logged-in user
    const { data: staffRow } = await supabase
      .from('staff')
      .select('id, tenant_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!staffRow) return;

    const now = new Date().toISOString();

    // Create CHECK_IN event
    await supabase.from('time_events').insert({
      tenant_id: staffRow.tenant_id,
      staff_id: staffRow.id,
      event_type: 'CHECK_IN',
      recorded_at: now,
    });

    // Create open time entry
    await supabase.from('time_entries').insert({
      tenant_id: staffRow.tenant_id,
      staff_id: staffRow.id,
      start_at: now,
      status: 'OPEN',
    });

    fetchData();
    onRefresh?.();
  };

  const handleCheckOut = async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: staffRow } = await supabase
      .from('staff')
      .select('id, tenant_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!staffRow) return;

    const now = new Date().toISOString();

    // Create CHECK_OUT event
    await supabase.from('time_events').insert({
      tenant_id: staffRow.tenant_id,
      staff_id: staffRow.id,
      event_type: 'CHECK_OUT',
      recorded_at: now,
    });

    // Close the most recent open entry
    const { data: openEntry } = await supabase
      .from('time_entries')
      .select('id, start_at')
      .eq('staff_id', staffRow.id)
      .eq('status', 'OPEN')
      .is('archived_at', null)
      .order('start_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (openEntry) {
      const startMs = new Date(openEntry.start_at).getTime();
      const endMs = new Date(now).getTime();
      const durationMinutes = Math.round((endMs - startMs) / 60000);

      await supabase
        .from('time_entries')
        .update({
          end_at: now,
          duration_minutes: durationMinutes,
          status: 'CLOSED',
        })
        .eq('id', openEntry.id);
    }

    fetchData();
    onRefresh?.();
  };

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.staff?.full_name?.toLowerCase().includes(q) ||
        r.staff?.staff_code?.toLowerCase().includes(q) ||
        r.ticket?.ticket_code?.toLowerCase().includes(q) ||
        r.site?.name?.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'start_at', 'asc'
  );
  const sortedRows = sorted as unknown as EntryWithRelations[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={6} cols={7} />;

  return (
    <div>
      {/* Check In / Out Actions */}
      <div className="flex items-center gap-3 mb-4">
        <Button size="sm" onClick={handleCheckIn}>
          <LogIn className="h-4 w-4 mr-1" />
          Check In
        </Button>
        <Button size="sm" variant="secondary" onClick={handleCheckOut}>
          <LogOut className="h-4 w-4 mr-1" />
          Check Out
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Clock className="h-12 w-12" />}
          title="No time entries"
          description={search ? 'Try a different search term.' : 'Clock in to start tracking time.'}
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <tr>
                <TableHead sortable sorted={sortKey === 'start_at' && sortDir} onSort={() => onSort('start_at')}>Date</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Ticket</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {pag.page.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{new Date(row.start_at).toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium">{row.staff?.full_name ?? '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{row.ticket?.ticket_code ?? '—'}</TableCell>
                  <TableCell className="text-muted">{row.site?.name ?? '—'}</TableCell>
                  <TableCell className="text-xs">{new Date(row.start_at).toLocaleTimeString()}</TableCell>
                  <TableCell className="text-xs">{row.end_at ? new Date(row.end_at).toLocaleTimeString() : '—'}</TableCell>
                  <TableCell>
                    {row.duration_minutes != null
                      ? `${Math.floor(row.duration_minutes / 60)}h ${row.duration_minutes % 60}m`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge color={TIME_ENTRY_STATUS_COLORS[row.status] ?? 'gray'}>{row.status}</Badge>
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
    </div>
  );
}
