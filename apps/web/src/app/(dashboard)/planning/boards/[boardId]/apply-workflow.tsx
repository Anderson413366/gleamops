'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle, AlertTriangle, XCircle, ShieldCheck } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getSupabaseAuthHeader } from '@/lib/supabase/authenticated-fetch';
import { SlideOver, Badge, Button, Textarea } from '@gleamops/ui';
import { useRole } from '@/hooks/use-role';
import type { PlanningBoardItem } from '@gleamops/shared';

interface BlockingConflict {
  conflict_type: string;
  description: string;
  staff_id: string | null;
  ticket_id: string | null;
}

interface ApplyResponse {
  board_item_id: string;
  sync_state: string;
  ticket_id: string;
  new_assignment: {
    staff_id: string | null;
    subcontractor_id: string | null;
    staff_name: string | null;
  };
}

type Step = 'idle' | 'blocked' | 'ack_required' | 'locked_override' | 'success';

interface ApplyWorkflowProps {
  open: boolean;
  onClose: () => void;
  boardId: string;
  item: PlanningBoardItem;
  proposalId: string;
  onSuccess: () => void;
}

export function ApplyWorkflow({ open, onClose, boardId, item, proposalId, onSuccess }: ApplyWorkflowProps) {
  const supabase = getSupabaseBrowserClient();
  const { isAtLeast } = useRole();
  const canOverride = isAtLeast('MANAGER');

  const [step, setStep] = useState<Step>('idle');
  const [busy, setBusy] = useState(false);
  const [blockingConflicts, setBlockingConflicts] = useState<BlockingConflict[]>([]);
  const [warningIds, setWarningIds] = useState<string[]>([]);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());
  const [overrideReason, setOverrideReason] = useState('');
  const [result, setResult] = useState<ApplyResponse | null>(null);

  const callApply = async (
    acknowledgedWarningIds: string[] = [],
    overrideLocked = false,
    reason: string | null = null,
  ) => {
    setBusy(true);
    try {
      const authHeader = await getSupabaseAuthHeader(supabase);
      const res = await fetch(
        `/api/planning/boards/${boardId}/items/${item.id}/apply`,
        {
          method: 'POST',
          headers: { ...authHeader, 'content-type': 'application/json' },
          body: JSON.stringify({
            proposal_id: proposalId,
            acknowledged_warning_ids: acknowledgedWarningIds,
            override_locked_period: overrideLocked,
            override_reason: reason,
          }),
        },
      );

      if (res.status === 409) {
        const body = await res.json();
        if (body.code === 'PLANNING_APPLY_BLOCKED') {
          const conflicts = body.blocking_conflicts as BlockingConflict[];
          const isLocked = conflicts.some((c) => c.conflict_type === 'locked_period');
          if (isLocked && canOverride) {
            setBlockingConflicts(conflicts);
            setStep('locked_override');
          } else {
            setBlockingConflicts(conflicts);
            setStep('blocked');
          }
          return;
        }
        if (body.code === 'PLANNING_ACK_REQUIRED') {
          setWarningIds(body.warning_conflict_ids);
          setStep('ack_required');
          return;
        }
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as Record<string, unknown>).detail as string ?? `Apply failed (${res.status})`);
      }

      const data = (await res.json()) as ApplyResponse;
      setResult(data);
      setStep('success');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Apply failed');
    } finally {
      setBusy(false);
    }
  };

  const handleInitialApply = () => callApply();

  const handleAckAndApply = () => {
    callApply(Array.from(acknowledgedIds));
  };

  const handleOverrideApply = () => {
    if (!overrideReason.trim()) {
      toast.error('Override reason is required.');
      return;
    }
    callApply([], true, overrideReason.trim());
  };

  const toggleAck = (id: string) => {
    setAcknowledgedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <SlideOver open={open} onClose={onClose} title="Apply Proposal" subtitle={item.title}>
      <div className="space-y-6">
        {/* Step: idle */}
        {step === 'idle' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Apply the selected proposal to update the ticket assignment.
            </p>
            <Button onClick={handleInitialApply} disabled={busy} loading={busy}>
              Apply Now
            </Button>
          </div>
        )}

        {/* Step: blocked */}
        {step === 'blocked' && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-destructive">Blocked</p>
                <p className="text-xs text-destructive">Cannot apply due to blocking conflicts:</p>
              </div>
            </div>
            <div className="space-y-2">
              {blockingConflicts.map((c, i) => (
                <div key={i} className="p-3 rounded-lg border border-destructive/30 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge color="red">{c.conflict_type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{c.description}</p>
                </div>
              ))}
            </div>
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        )}

        {/* Step: ack_required */}
        {step === 'ack_required' && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-warning">Warnings</p>
                <p className="text-xs text-warning">Acknowledge all warnings to proceed.</p>
              </div>
            </div>
            <div className="space-y-2">
              {warningIds.map((id) => (
                <label key={id} className="flex items-center gap-2 p-2 rounded-lg border border-warning/30 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acknowledgedIds.has(id)}
                    onChange={() => toggleAck(id)}
                    className="rounded border-border"
                  />
                  <span className="text-muted-foreground">Warning {id.slice(0, 8)}...</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleAckAndApply}
                disabled={busy || acknowledgedIds.size < warningIds.length}
                loading={busy}
              >
                Apply Anyway
              </Button>
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Step: locked_override */}
        {step === 'locked_override' && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
              <ShieldCheck className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-warning">Locked Period</p>
                <p className="text-xs text-warning">This ticket belongs to a locked schedule period. Override requires a reason.</p>
              </div>
            </div>
            <Textarea
              label="Override Reason"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleOverrideApply}
                disabled={busy || !overrideReason.trim()}
                loading={busy}
              >
                Override and Apply
              </Button>
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Step: success */}
        {step === 'success' && result && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-success/10 border border-success/30">
              <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-success">Applied Successfully</p>
                <p className="text-xs text-success">
                  {result.new_assignment.staff_name
                    ? `Assigned to ${result.new_assignment.staff_name}`
                    : 'Assignment updated'}
                </p>
              </div>
            </div>
            <Button onClick={onSuccess}>Done</Button>
          </div>
        )}
      </div>
    </SlideOver>
  );
}
