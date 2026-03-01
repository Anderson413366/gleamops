'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { MessageSquare, Plus } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Pagination, TableSkeleton, Button,
} from '@gleamops/ui';
import type { BadgeColor } from '@gleamops/ui';
import type { MessageThread } from '@gleamops/shared';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';
import { formatRelative } from '@/lib/utils/date';

interface ThreadWithPreview extends MessageThread {
  latest_message?: { body: string; created_at: string; sender_id: string } | null;
  member_count?: number;
  unread_count?: number;
}

const THREAD_TYPE_COLORS: Record<string, BadgeColor> = {
  DIRECT: 'blue',
  GROUP: 'purple',
  TICKET_CONTEXT: 'orange',
};

const THREAD_TYPE_LABELS: Record<string, string> = {
  DIRECT: 'Direct',
  GROUP: 'Group',
  TICKET_CONTEXT: 'Ticket',
};

const TYPE_FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'DIRECT', label: 'Direct' },
  { key: 'GROUP', label: 'Group' },
  { key: 'TICKET_CONTEXT', label: 'Ticket' },
];

interface MessagesListProps {
  search: string;
  onSelectThread: (thread: ThreadWithPreview) => void;
  onNewThread: () => void;
}

export default function MessagesList({ search, onSelectThread, onNewThread }: MessagesListProps) {
  const [rows, setRows] = useState<ThreadWithPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('ALL');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    // Fetch threads
    const { data: threads, error } = await supabase
      .from('message_threads')
      .select('*')
      .is('archived_at', null)
      .order('updated_at', { ascending: false });

    if (error || !threads) {
      setLoading(false);
      return;
    }

    // For each thread, fetch latest message and member count
    const enriched: ThreadWithPreview[] = await Promise.all(
      (threads as unknown as MessageThread[]).map(async (thread) => {
        const [latestRes, membersRes] = await Promise.all([
          supabase
            .from('messages')
            .select('body, created_at, sender_id')
            .eq('thread_id', thread.id)
            .is('archived_at', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('message_thread_members')
            .select('id', { count: 'exact', head: true })
            .eq('thread_id', thread.id),
        ]);

        return {
          ...thread,
          latest_message: latestRes.data as ThreadWithPreview['latest_message'],
          member_count: membersRes.count ?? 0,
          unread_count: 0, // Placeholder -- real unread logic requires comparing last_read_at
        };
      })
    );

    setRows(enriched);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    let result = rows;

    // Type filter
    if (typeFilter !== 'ALL') {
      result = result.filter((r) => r.thread_type === typeFilter);
    }

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.subject.toLowerCase().includes(q) ||
          r.latest_message?.body?.toLowerCase().includes(q) ||
          r.thread_type.toLowerCase().includes(q)
      );
    }

    return result;
  }, [rows, search, typeFilter]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered as unknown as Record<string, unknown>[], 'updated_at', 'desc'
  );
  const sortedRows = sorted as unknown as ThreadWithPreview[];
  const pag = usePagination(sortedRows, 25);

  if (loading) return <TableSkeleton rows={6} cols={5} />;

  return (
    <div>
      {/* Type filter chips + New button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setTypeFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                typeFilter === f.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={onNewThread}>
          <Plus className="h-4 w-4 mr-1" />
          New Thread
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-12 w-12" />}
          title="No message threads"
          description={search ? 'Try a different search term.' : 'Start a new thread to begin messaging.'}
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <tr>
                <TableHead sortable sorted={sortKey === 'subject' && sortDir} onSort={() => onSort('subject')}>Subject</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Last Message</TableHead>
                <TableHead>Members</TableHead>
                <TableHead sortable sorted={sortKey === 'updated_at' && sortDir} onSort={() => onSort('updated_at')}>Updated</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {pag.page.map((row) => (
                <TableRow key={row.id} onClick={() => onSelectThread(row)}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-[200px]">{row.subject}</span>
                      {(row.unread_count ?? 0) > 0 && (
                        <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold">
                          {row.unread_count}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge color={THREAD_TYPE_COLORS[row.thread_type] ?? 'gray'}>
                      {THREAD_TYPE_LABELS[row.thread_type] ?? row.thread_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    <span className="truncate block max-w-[250px]">
                      {row.latest_message?.body
                        ? row.latest_message.body.length > 60
                          ? row.latest_message.body.slice(0, 60) + '...'
                          : row.latest_message.body
                        : 'No messages yet'}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.member_count ?? 0}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatRelative(row.updated_at)}
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
