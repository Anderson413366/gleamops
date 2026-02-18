'use client';

import { SlideOver, Button } from '@gleamops/ui';

interface SchedulePeriodRow {
  id: string;
  period_name: string | null;
  period_start: string;
  period_end: string;
  status: 'DRAFT' | 'PUBLISHED' | 'LOCKED' | 'ARCHIVED';
}

interface PublishDrawerProps {
  open: boolean;
  period: SchedulePeriodRow | null;
  blockingConflicts: number;
  onClose: () => void;
  onValidate: () => Promise<void>;
  onPublish: () => Promise<void>;
  onLock: () => Promise<void>;
  busy: boolean;
}

export function PublishDrawer({
  open,
  period,
  blockingConflicts,
  onClose,
  onValidate,
  onPublish,
  onLock,
  busy,
}: PublishDrawerProps) {
  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={period ? (period.period_name ?? `${period.period_start} to ${period.period_end}`) : 'Schedule Period'}
      subtitle={period ? `Status: ${period.status}` : undefined}
    >
      {period ? (
        <div className="space-y-4 text-sm">
          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <p><span className="text-muted-foreground">Start:</span> {new Date(period.period_start).toLocaleDateString()}</p>
            <p><span className="text-muted-foreground">End:</span> {new Date(period.period_end).toLocaleDateString()}</p>
            <p><span className="text-muted-foreground">Blocking conflicts:</span> {blockingConflicts}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={busy} onClick={() => void onValidate()}>
              Validate
            </Button>
            <Button
              disabled={busy || period.status !== 'DRAFT' || blockingConflicts > 0}
              onClick={() => void onPublish()}
            >
              Publish
            </Button>
            <Button
              variant="secondary"
              disabled={busy || period.status !== 'PUBLISHED'}
              onClick={() => void onLock()}
            >
              Lock
            </Button>
          </div>
        </div>
      ) : null}
    </SlideOver>
  );
}
