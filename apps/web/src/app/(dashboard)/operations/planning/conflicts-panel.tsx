'use client';

interface ScheduleConflictRow {
  id: string;
  conflict_type: string;
  severity: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  is_blocking: boolean;
  ticket_id: string | null;
  staff_id: string | null;
  created_at: string;
}

interface ConflictsPanelProps {
  conflicts: ScheduleConflictRow[];
}

function severityClass(severity: ScheduleConflictRow['severity']): string {
  if (severity === 'ERROR') return 'text-destructive';
  if (severity === 'WARNING') return 'text-warning';
  return 'text-muted-foreground';
}

export function ConflictsPanel({ conflicts }: ConflictsPanelProps) {
  if (conflicts.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-success">
        No conflicts detected for this schedule period.
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-3">
      {conflicts.map((conflict) => (
        <div key={conflict.id} className="rounded-lg border border-border p-2">
          <div className="flex items-center justify-between gap-3">
            <p className={`text-xs font-semibold ${severityClass(conflict.severity)}`}>
              {conflict.conflict_type} · {conflict.severity}
            </p>
            {conflict.is_blocking ? (
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">Blocking</span>
            ) : (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Warning</span>
            )}
          </div>
          <p className="mt-1 text-sm text-foreground">{conflict.message}</p>
        </div>
      ))}
    </div>
  );
}
