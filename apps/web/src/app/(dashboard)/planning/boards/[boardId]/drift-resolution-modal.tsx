'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { GitBranch, ArrowRight } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { SlideOver, Button } from '@gleamops/ui';
import type { PlanningBoardItem } from '@gleamops/shared';
import type { DriftResolutionChoice } from '@/modules/planning/drift-reconcile';

interface DriftResolutionModalProps {
  open: boolean;
  onClose: () => void;
  item: PlanningBoardItem;
  boardId: string;
  onSuccess: () => void;
}

export function DriftResolutionModal({ open, onClose, item, boardId, onSuccess }: DriftResolutionModalProps) {
  const supabase = getSupabaseBrowserClient();
  const [busy, setBusy] = useState(false);

  const handleResolve = async (choice: DriftResolutionChoice) => {
    setBusy(true);
    try {
      const newSyncState = choice === 'use_board_version' ? 'draft_change' : 'dismissed';

      const { error } = await supabase
        .from('planning_board_items')
        .update({ sync_state: newSyncState })
        .eq('id', item.id)
        .eq('board_id', boardId);

      if (error) throw new Error(error.message);

      toast.success(
        choice === 'use_board_version'
          ? 'Board version kept — re-apply when ready.'
          : 'Schedule version accepted.',
      );
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resolve drift');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SlideOver open={open} onClose={onClose} title="Resolve Conflict" subtitle={item.title}>
      <div className="space-y-6">
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
          <GitBranch className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-destructive">Drift Detected</p>
            <p className="text-xs text-destructive">
              The live schedule has changed since this item was last synced. Choose how to resolve.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => handleResolve('use_board_version')}
            className="w-full flex items-center gap-3 p-4 rounded-lg border border-border bg-card text-left shadow-sm transition-shadow hover:shadow-md disabled:opacity-50"
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Use Board Version</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Keep the planning board&apos;s assignment. You can re-apply the proposal to push it to the schedule.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => handleResolve('accept_schedule_version')}
            className="w-full flex items-center gap-3 p-4 rounded-lg border border-border bg-card text-left shadow-sm transition-shadow hover:shadow-md disabled:opacity-50"
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Accept Schedule Version</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Dismiss this item&apos;s conflict and accept the current schedule assignment as-is.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        </div>

        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
      </div>
    </SlideOver>
  );
}
