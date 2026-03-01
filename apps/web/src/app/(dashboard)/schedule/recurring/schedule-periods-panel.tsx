'use client';

import { useEffect, useState, useCallback } from 'react';
import { CalendarClock, Lock, Send, ShieldCheck } from 'lucide-react';
import { CollapsibleCard, Badge, Button, EmptyState } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRole } from '@/hooks/use-role';
import { normalizeRoleCode } from '@gleamops/shared';

interface SchedulePeriod {
  id: string;
  site_id: string | null;
  period_name: string;
  period_start: string;
  period_end: string;
  status: 'DRAFT' | 'LOCKED' | 'PUBLISHED';
  period_type: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  payroll_anchor_date: string | null;
  published_at: string | null;
  locked_at: string | null;
  site: { name: string | null; site_code: string | null } | null;
}

const STATUS_BADGE: Record<string, 'yellow' | 'blue' | 'green'> = {
  DRAFT: 'yellow',
  LOCKED: 'blue',
  PUBLISHED: 'green',
};

function formatDateRange(start: string, end: string): string {
  const s = new Date(`${start}T12:00:00`);
  const e = new Date(`${end}T12:00:00`);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
}

export function SchedulePeriodsPanel() {
  const { role } = useRole();
  const normalizedRole = normalizeRoleCode(role);
  const canPublish = normalizedRole === 'OWNER_ADMIN' || normalizedRole === 'MANAGER';
  const [periods, setPeriods] = useState<SchedulePeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<{ periodId: string; conflicts: number } | null>(null);

  const fetchPeriods = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from('schedule_periods')
        .select(`
          id, site_id, period_name, period_start, period_end,
          status, period_type, payroll_anchor_date, published_at, locked_at,
          site:site_id(name, site_code)
        `)
        .is('archived_at', null)
        .order('period_start', { ascending: false })
        .limit(50);
      setPeriods((data as unknown as SchedulePeriod[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchPeriods(); }, [fetchPeriods]);

  const periodAction = useCallback(async (periodId: string, action: string) => {
    setActionLoading(periodId);
    try {
      if (action === 'validate') {
        const resp = await fetch(`/api/operations/schedule/periods/${periodId}/validate`, { method: 'POST' });
        if (resp.ok) {
          const result = await resp.json();
          const conflicts = result?.conflicts?.length ?? 0;
          setValidationResult({ periodId, conflicts });
        }
      } else {
        const resp = await fetch(`/api/operations/schedule/periods/${periodId}/${action}`, { method: 'POST' });
        if (resp.ok) await fetchPeriods();
      }
    } finally {
      setActionLoading(null);
    }
  }, [fetchPeriods]);

  const draftCount = periods.filter((p) => p.status === 'DRAFT').length;

  return (
    <CollapsibleCard
      id="schedule-periods"
      title={
        <span className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" aria-hidden />
          Schedule Periods
          {periods.length > 0 && <Badge color="blue">{periods.length}</Badge>}
          {draftCount > 0 && <Badge color="yellow">{draftCount} draft</Badge>}
        </span>
      }
    >
      {loading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Loading periods...</p>
      ) : periods.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="h-10 w-10" />}
          title="No schedule periods"
          description="Schedule periods help you organize, validate, and publish employee schedules."
        />
      ) : (
        <div className="space-y-2">
          {periods.map((period) => (
            <div key={period.id} className="rounded-lg border border-border p-3 text-sm space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{period.period_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateRange(period.period_start, period.period_end)}
                    {period.period_type !== 'WEEKLY' && <span> · {period.period_type}</span>}
                    {period.site && <span> · {period.site.name ?? period.site.site_code}</span>}
                  </p>
                </div>
                <Badge color={STATUS_BADGE[period.status] ?? 'gray'}>{period.status}</Badge>
              </div>

              {validationResult?.periodId === period.id && (
                <div className={`text-xs px-2 py-1.5 rounded ${
                  validationResult.conflicts === 0
                    ? 'bg-success/10 text-success'
                    : 'bg-destructive/10 text-destructive'
                }`}>
                  {validationResult.conflicts === 0
                    ? 'Validation passed — no conflicts found'
                    : `${validationResult.conflicts} conflict${validationResult.conflicts !== 1 ? 's' : ''} found`
                  }
                </div>
              )}

              {canPublish && (
                <div className="flex items-center gap-2 pt-1">
                  {period.status === 'DRAFT' && (
                    <>
                      <Button size="sm" variant="secondary" className="h-7 text-xs gap-1"
                        disabled={actionLoading === period.id}
                        onClick={() => periodAction(period.id, 'validate')}>
                        <ShieldCheck className="h-3 w-3" /> Validate
                      </Button>
                      <Button size="sm" variant="secondary" className="h-7 text-xs gap-1"
                        disabled={actionLoading === period.id}
                        onClick={() => periodAction(period.id, 'lock')}>
                        <Lock className="h-3 w-3" /> Lock
                      </Button>
                    </>
                  )}
                  {period.status === 'LOCKED' && (
                    <Button size="sm" className="h-7 text-xs gap-1"
                      disabled={actionLoading === period.id}
                      onClick={() => periodAction(period.id, 'publish')}>
                      <Send className="h-3 w-3" /> Publish
                    </Button>
                  )}
                  {period.status === 'PUBLISHED' && period.published_at && (
                    <p className="text-[11px] text-muted-foreground">
                      Published {new Date(period.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </CollapsibleCard>
  );
}
