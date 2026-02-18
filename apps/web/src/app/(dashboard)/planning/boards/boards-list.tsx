'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Calendar } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { fetchJsonWithSupabaseAuth } from '@/lib/supabase/authenticated-fetch';
import {
  Badge, Button, Card, CardContent, EmptyState, Skeleton,
} from '@gleamops/ui';
import type { PlanningBoard, BoardStatus } from '@gleamops/shared';
import { CreateBoardForm } from './create-board-form';

const STATUS_COLORS: Record<BoardStatus, 'blue' | 'green' | 'gray' | 'yellow'> = {
  DRAFT: 'yellow',
  ACTIVE: 'blue',
  COMPLETE: 'green',
  ARCHIVED: 'gray',
};

const STATUS_FILTERS: BoardStatus[] = ['DRAFT', 'ACTIVE', 'COMPLETE', 'ARCHIVED'];

interface BoardsListProps {
  search: string;
}

export default function BoardsList({ search }: BoardsListProps) {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [boards, setBoards] = useState<PlanningBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<BoardStatus | 'all'>('all');
  const [formOpen, setFormOpen] = useState(false);

  const fetchBoards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchJsonWithSupabaseAuth<{ success: boolean; data: PlanningBoard[] }>(
        supabase,
        '/api/planning/boards',
      );
      setBoards(res.data);
    } catch {
      // no-op
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { fetchBoards(); }, [fetchBoards]);

  const filtered = useMemo(() => {
    let result = boards;
    if (statusFilter !== 'all') {
      result = result.filter((b) => b.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((b) =>
        b.title.toLowerCase().includes(q) ||
        b.board_date.includes(q)
      );
    }
    return result;
  }, [boards, statusFilter, search]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: boards.length };
    for (const b of boards) {
      counts[b.status] = (counts[b.status] ?? 0) + 1;
    }
    return counts;
  }, [boards]);

  return (
    <div className="space-y-4">
      {/* Filters + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            All ({statusCounts.all ?? 0})
          </button>
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {s} ({statusCounts[s] ?? 0})
            </button>
          ))}
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" /> New Board
        </Button>
      </div>

      {/* Board cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              title="No planning boards"
              description={statusFilter !== 'all' ? `No ${statusFilter} boards found.` : 'Create your first planning board.'}
              actionLabel="New Board"
              onAction={() => setFormOpen(true)}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((board) => (
            <div
              key={board.id}
              onClick={() => router.push(`/planning/boards/${board.id}`)}
              className="rounded-lg border border-border bg-card p-4 shadow-sm hover:shadow-md cursor-pointer transition-shadow space-y-3"
            >
              <div className="flex items-center justify-between">
                <Badge color={STATUS_COLORS[board.status]}>{board.status}</Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {board.board_date}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-foreground line-clamp-2">{board.title}</h3>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{board.workspace_scope}</span>
                <span>{new Date(board.created_at).toLocaleDateString()}</span>
              </div>
              {board.notes && (
                <p className="text-xs text-muted-foreground line-clamp-2">{board.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <CreateBoardForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={() => { setFormOpen(false); fetchBoards(); }}
      />
    </div>
  );
}
