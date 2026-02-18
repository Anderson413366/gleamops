'use client';

import { Badge, Button } from '@gleamops/ui';
import type { BadgeColor } from '@gleamops/ui';
import type { PlanningBoardItem, PlanningItemProposal, BoardItemKind } from '@gleamops/shared';
import { AssigneeBadge } from '@/components/assignee-badge';
import { AlertTriangle, FileText, CheckCircle, ClipboardList } from 'lucide-react';

interface ItemWithProposals extends PlanningBoardItem {
  proposals: Pick<PlanningItemProposal, 'id' | 'apply_state' | 'proposed_staff_id' | 'proposed_subcontractor_id'>[];
}

interface ItemCardProps {
  item: ItemWithProposals;
  syncColor: BadgeColor;
  onPropose: () => void;
  onApply: (proposalId: string) => void;
  onResolveDrift: () => void;
}

const KIND_ICONS: Record<BoardItemKind, React.ElementType> = {
  TICKET: ClipboardList,
  NOTE: FileText,
  TASK: CheckCircle,
};

export function ItemCard({ item, syncColor, onPropose, onApply, onResolveDrift }: ItemCardProps) {
  const Icon = KIND_ICONS[item.item_kind];
  const hasAssignee = !!(item.current_assignee_staff_id || item.current_assignee_subcontractor_id);
  const latestProposal = item.proposals.find((p) => p.apply_state === 'draft' || p.apply_state === 'validated');
  const isConflict = item.sync_state === 'conflict';

  return (
    <div className={`rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md ${
      isConflict ? 'border-destructive/50' : 'border-border'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="mt-0.5">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge color={syncColor}>{item.sync_state}</Badge>
              <span className="text-xs text-muted-foreground uppercase">{item.item_kind}</span>
            </div>
            <h4 className="text-sm font-medium text-foreground mt-1 line-clamp-2">{item.title}</h4>

            {/* Current assignee */}
            {hasAssignee && (
              <div className="mt-2">
                {item.current_assignee_staff_id && (
                  <AssigneeBadge type="staff" name={item.current_assignee_staff_id.slice(0, 8)} />
                )}
                {item.current_assignee_subcontractor_id && (
                  <AssigneeBadge type="subcontractor" name={item.current_assignee_subcontractor_id.slice(0, 8)} />
                )}
              </div>
            )}

            {/* Proposal summary */}
            {latestProposal && (
              <div className="mt-2 text-xs text-muted-foreground">
                Proposal: {latestProposal.proposed_staff_id ? 'Staff' : 'Subcontractor'} ({latestProposal.apply_state})
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 shrink-0">
          {isConflict && (
            <Button size="sm" variant="secondary" onClick={onResolveDrift}>
              <AlertTriangle className="h-3 w-3" /> Resolve
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={onPropose}>
            Propose
          </Button>
          {latestProposal && (
            <Button size="sm" onClick={() => onApply(latestProposal.id)}>
              Apply
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
