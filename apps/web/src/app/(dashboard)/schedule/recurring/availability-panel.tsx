'use client';

import { useEffect, useState, useCallback } from 'react';
import { CalendarDays, Clock4, Trash2 } from 'lucide-react';
import { CollapsibleCard, Badge, Button, EmptyState } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface AvailabilityRule {
  id: string;
  staff_id: string;
  rule_type: 'WEEKLY_RECURRING' | 'ONE_OFF';
  availability_type: 'AVAILABLE' | 'UNAVAILABLE';
  weekday: string | null;
  start_time: string | null;
  end_time: string | null;
  one_off_start: string | null;
  one_off_end: string | null;
  valid_from: string | null;
  valid_to: string | null;
  notes: string | null;
  staff: { full_name: string | null; staff_code: string } | null;
}

const WEEKDAY_LABELS: Record<string, string> = {
  MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday',
  THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday', SUN: 'Sunday',
};

function formatTime12(value: string | null): string {
  if (!value) return '';
  const [h, m] = value.split(':');
  const hour = Number(h);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${suffix}`;
}

export function AvailabilityPanel() {
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from('staff_availability_rules')
        .select(`
          id, staff_id, rule_type, availability_type,
          weekday, start_time, end_time,
          one_off_start, one_off_end,
          valid_from, valid_to, notes,
          staff:staff!staff_availability_rules_staff_id_fkey(full_name, staff_code)
        `)
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(100);
      setRules((data as unknown as AvailabilityRule[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchRules(); }, [fetchRules]);

  const archiveRule = useCallback(async (ruleId: string) => {
    setArchiving(ruleId);
    try {
      const resp = await fetch(`/api/operations/schedule/availability/${ruleId}/archive`, { method: 'POST' });
      if (resp.ok) await fetchRules();
    } finally {
      setArchiving(null);
    }
  }, [fetchRules]);

  const unavailableCount = rules.filter((r) => r.availability_type === 'UNAVAILABLE').length;

  return (
    <CollapsibleCard
      id="availability-rules"
      title={
        <span className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" aria-hidden />
          Staff Availability
          {rules.length > 0 && <Badge color="blue">{rules.length} rule{rules.length !== 1 ? 's' : ''}</Badge>}
          {unavailableCount > 0 && <Badge color="red">{unavailableCount} unavailable</Badge>}
        </span>
      }
    >
      {loading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Loading availability rules...</p>
      ) : rules.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-10 w-10" />}
          title="No availability rules"
          description="Staff availability preferences will appear here when configured."
        />
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div key={rule.id} className="rounded-lg border border-border p-3 text-sm flex items-start gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-foreground text-xs">
                    {rule.staff?.full_name ?? rule.staff?.staff_code ?? 'Unknown Staff'}
                  </span>
                  <Badge color={rule.availability_type === 'AVAILABLE' ? 'green' : 'red'} className="text-[10px]">
                    {rule.availability_type}
                  </Badge>
                  <Badge color={rule.rule_type === 'WEEKLY_RECURRING' ? 'blue' : 'purple'} className="text-[10px]">
                    {rule.rule_type === 'WEEKLY_RECURRING' ? 'Weekly' : 'One-off'}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock4 className="h-3 w-3 shrink-0" aria-hidden />
                  {rule.rule_type === 'WEEKLY_RECURRING' ? (
                    <span>
                      {WEEKDAY_LABELS[rule.weekday ?? ''] ?? rule.weekday}
                      {rule.start_time && rule.end_time && ` · ${formatTime12(rule.start_time)} – ${formatTime12(rule.end_time)}`}
                    </span>
                  ) : (
                    <span>
                      {rule.one_off_start} — {rule.one_off_end}
                    </span>
                  )}
                </div>
                {(rule.valid_from || rule.valid_to) && (
                  <p className="text-[11px] text-muted-foreground">
                    Valid: {rule.valid_from ?? '...'} to {rule.valid_to ?? '...'}
                  </p>
                )}
                {rule.notes && (
                  <p className="text-[11px] text-muted-foreground italic truncate">&ldquo;{rule.notes}&rdquo;</p>
                )}
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="h-7 text-xs shrink-0"
                disabled={archiving === rule.id}
                onClick={() => archiveRule(rule.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </CollapsibleCard>
  );
}
