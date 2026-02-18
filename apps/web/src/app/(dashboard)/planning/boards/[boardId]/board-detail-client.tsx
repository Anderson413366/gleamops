'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Calendar, Users, CheckCircle } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { fetchJsonWithSupabaseAuth } from '@/lib/supabase/authenticated-fetch';
import {
  Badge, Button, Skeleton, StatCard, EmptyState, Card, CardContent,
} from '@gleamops/ui';
import type {
  PlanningBoard, PlanningBoardItem, PlanningItemProposal,
  BoardStatus, BoardItemSyncState,
} from '@gleamops/shared';
import { ItemCard } from './item-card';
import { CreateItemForm } from './create-item-form';
import { ProposalForm } from './proposal-form';
import { ApplyWorkflow } from './apply-workflow';
import { DriftResolutionModal } from './drift-resolution-modal';

interface ItemWithProposals extends PlanningBoardItem {
  proposals: Pick<PlanningItemProposal, 'id' | 'apply_state' | 'proposed_staff_id' | 'proposed_subcontractor_id'>[];
}

const STATUS_COLORS: Record<BoardStatus, 'blue' | 'green' | 'gray' | 'yellow'> = {
  DRAFT: 'yellow',
  ACTIVE: 'blue',
  COMPLETE: 'green',
  ARCHIVED: 'gray',
};

const SYNC_COLORS: Record<BoardItemSyncState, 'green' | 'yellow' | 'blue' | 'red' | 'gray'> = {
  synced: 'green',
  draft_change: 'yellow',
  applied: 'blue',
  conflict: 'red',
  dismissed: 'gray',
};

export default function BoardDetailClient() {
  const { boardId } = useParams<{ boardId: string }>();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [board, setBoard] = useState<PlanningBoard | null>(null);
  const [items, setItems] = useState<ItemWithProposals[]>([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [createItemOpen, setCreateItemOpen] = useState(false);
  const [proposalItem, setProposalItem] = useState<ItemWithProposals | null>(null);
  const [applyItem, setApplyItem] = useState<{ item: ItemWithProposals; proposalId: string } | null>(null);
  const [driftItem, setDriftItem] = useState<ItemWithProposals | null>(null);

  const fetchBoard = useCallback(async () => {
    if (!boardId) return;
    setLoading(true);
    try {
      const [boardRes, itemsRes] = await Promise.all([
        fetchJsonWithSupabaseAuth<{ success: boolean; data: PlanningBoard[] }>(
          supabase,
          `/api/planning/boards?date=`,
        ),
        fetchJsonWithSupabaseAuth<{ success: boolean; data: ItemWithProposals[] }>(
          supabase,
          `/api/planning/boards/${boardId}/items`,
        ),
      ]);
      const found = boardRes.data.find((b) => b.id === boardId) ?? null;
      setBoard(found);
      setItems(itemsRes.data);
    } catch {
      // no-op
    } finally {
      setLoading(false);
    }
  }, [boardId, supabase]);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.push('/planning')}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Planning
        </button>
        <EmptyState title="Board not found" description="This planning board does not exist." />
      </div>
    );
  }

  const syncCounts: Record<string, number> = {};
  for (const item of items) {
    syncCounts[item.sync_state] = (syncCounts[item.sync_state] ?? 0) + 1;
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push('/planning')}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Planning
      </button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{board.title}</h1>
          <div className="flex items-center gap-3 mt-1">
            <Badge color={STATUS_COLORS[board.status]}>{board.status}</Badge>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> {board.board_date}
            </span>
            <span className="text-sm text-muted-foreground">{board.workspace_scope}</span>
          </div>
        </div>
        <Button onClick={() => setCreateItemOpen(true)}>
          <Plus className="h-4 w-4" /> Add Item
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Items" value={items.length} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Synced" value={syncCounts.synced ?? 0} icon={<CheckCircle className="h-5 w-5" />} />
        <StatCard label="Applied" value={syncCounts.applied ?? 0} icon={<CheckCircle className="h-5 w-5" />} />
        <StatCard label="Conflicts" value={syncCounts.conflict ?? 0} icon={<CheckCircle className="h-5 w-5" />} />
      </div>

      {board.notes && (
        <p className="text-sm text-muted-foreground">{board.notes}</p>
      )}

      {/* Item cards */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              title="No items yet"
              description="Add tickets, notes, or tasks to this board."
              actionLabel="Add Item"
              onAction={() => setCreateItemOpen(true)}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              syncColor={SYNC_COLORS[item.sync_state]}
              onPropose={() => setProposalItem(item)}
              onApply={(proposalId) => setApplyItem({ item, proposalId })}
              onResolveDrift={() => setDriftItem(item)}
            />
          ))}
        </div>
      )}

      {/* Forms / Modals */}
      <CreateItemForm
        open={createItemOpen}
        onClose={() => setCreateItemOpen(false)}
        boardId={boardId}
        onSuccess={() => { setCreateItemOpen(false); fetchBoard(); }}
      />

      {proposalItem && (
        <ProposalForm
          open={!!proposalItem}
          onClose={() => setProposalItem(null)}
          item={proposalItem}
          onSuccess={() => { setProposalItem(null); fetchBoard(); }}
        />
      )}

      {applyItem && (
        <ApplyWorkflow
          open={!!applyItem}
          onClose={() => setApplyItem(null)}
          boardId={boardId}
          item={applyItem.item}
          proposalId={applyItem.proposalId}
          onSuccess={() => { setApplyItem(null); fetchBoard(); }}
        />
      )}

      {driftItem && (
        <DriftResolutionModal
          open={!!driftItem}
          onClose={() => setDriftItem(null)}
          item={driftItem}
          boardId={boardId}
          onSuccess={() => { setDriftItem(null); fetchBoard(); }}
        />
      )}
    </div>
  );
}
