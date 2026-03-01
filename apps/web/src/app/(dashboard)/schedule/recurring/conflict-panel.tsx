'use client';

import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { CollapsibleCard, Badge, EmptyState } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface ScheduleConflict {
  id: string;
  period_id: string | null;
  ticket_id: string | null;
  staff_id: string | null;
  conflict_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string | null;
  is_blocking: boolean;
  resolved_at: string | null;
  staff: { full_name: string | null; staff_code: string } | null;
  ticket: { ticket_code: string; scheduled_date: string } | null;
}

const SEVERITY_BADGE: Record<string, 'gray' | 'yellow' | 'orange' | 'red'> = {
  LOW: 'gray',
  MEDIUM: 'yellow',
  HIGH: 'orange',
  CRITICAL: 'red',
};

const CONFLICT_TYPE_LABEL: Record<string, string> = {
  COVERAGE_GAP: 'Coverage Gap',
  DOUBLE_BOOKING: 'Double Booking',
  RULE_VIOLATION: 'Rule Violation',
  OVERTIME: 'Overtime',
};

export function ConflictPanel() {
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConflicts = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from('schedule_conflicts')
        .select(`
          id, period_id, ticket_id, staff_id,
          conflict_type, severity, message, is_blocking, resolved_at,
          staff:staff_id!schedule_conflicts_staff_id_fkey(full_name, staff_code),
          ticket:ticket_id!schedule_conflicts_ticket_id_fkey(ticket_code, scheduled_date)
        `)
        .is('resolved_at', null)
        .order('severity', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);
      setConflicts((data as unknown as ScheduleConflict[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchConflicts(); }, [fetchConflicts]);

  const blockingCount = conflicts.filter((c) => c.is_blocking).length;
  const criticalCount = conflicts.filter((c) => c.severity === 'CRITICAL' || c.severity === 'HIGH').length;

  return (
    <CollapsibleCard
      id="schedule-conflicts"
      title={
        <span className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-destructive" aria-hidden />
          Schedule Conflicts
          {conflicts.length > 0 && (
            <Badge color={criticalCount > 0 ? 'red' : 'yellow'}>
              {conflicts.length} unresolved
            </Badge>
          )}
          {blockingCount > 0 && <Badge color="red">{blockingCount} blocking</Badge>}
        </span>
      }
      defaultOpen={criticalCount > 0}
    >
      {loading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Loading conflicts...</p>
      ) : conflicts.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle className="h-10 w-10" />}
          title="No schedule conflicts"
          description="All clear — no unresolved scheduling conflicts detected."
        />
      ) : (
        <div className="space-y-2">
          {conflicts.map((conflict) => (
            <div
              key={conflict.id}
              className={`rounded-lg border p-3 text-sm space-y-1 ${
                conflict.is_blocking
                  ? 'border-destructive/40 bg-destructive/5'
                  : 'border-border'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge color={SEVERITY_BADGE[conflict.severity] ?? 'gray'}>
                    {conflict.severity}
                  </Badge>
                  <span className="text-xs font-medium text-foreground">
                    {CONFLICT_TYPE_LABEL[conflict.conflict_type] ?? conflict.conflict_type}
                  </span>
                  {conflict.is_blocking && (
                    <Badge color="red" className="text-[10px]">Blocking</Badge>
                  )}
                </div>
                {conflict.ticket && (
                  <span className="text-[11px] text-muted-foreground">
                    {conflict.ticket.ticket_code} · {conflict.ticket.scheduled_date}
                  </span>
                )}
              </div>
              {conflict.staff && (
                <p className="text-xs text-muted-foreground">
                  Staff: {conflict.staff.full_name ?? conflict.staff.staff_code}
                </p>
              )}
              {conflict.message && (
                <p className="text-xs text-muted-foreground">{conflict.message}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </CollapsibleCard>
  );
}
