'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import { Button, Card, CardContent, EmptyState, Badge } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { AvailabilityDetail } from './availability-detail';

interface AvailabilityRule {
  id: string;
  staff_id: string;
  staff_name: string;
  staff_code: string | null;
  rule_type: 'WEEKLY_RECURRING' | 'ONE_OFF';
  availability_type: 'AVAILABLE' | 'UNAVAILABLE';
  weekday: string | null;
  start_time: string | null;
  end_time: string | null;
  one_off_start: string | null;
  one_off_end: string | null;
  notes: string | null;
}

interface StaffAvailabilityRow {
  staff_id: string;
  staff_name: string;
  staff_code: string | null;
  days: Record<string, 'available' | 'unavailable' | 'not-submitted'>;
}

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekRange(start: Date) {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startLabel} – ${endLabel}`;
}

export function AvailabilityModule() {
  const [subView, setSubView] = useState<'requests' | 'weekly'>('weekly');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRule, setSelectedRule] = useState<AvailabilityRule | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [locations, setLocations] = useState<Array<{ id: string; name: string; site_code: string }>>([]);
  const [locationFilter, setLocationFilter] = useState<string[]>([]);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase
      .from('staff_availability_rules')
      .select('id, staff_id, rule_type, availability_type, weekday:day_of_week, start_time, end_time, one_off_start, one_off_end, notes, staff:staff!staff_availability_rules_staff_id_fkey(full_name, staff_code)')
      .is('archived_at', null)
      .order('staff_id');

    const { data: sitesData } = await supabase
      .from('sites')
      .select('id, name, site_code')
      .is('archived_at', null)
      .order('name')
      .limit(100);

    setLocations((sitesData ?? []) as Array<{ id: string; name: string; site_code: string }>);

    const mapped: AvailabilityRule[] = (data ?? []).map((r: Record<string, unknown>) => {
      const staff = r.staff as { full_name?: string; staff_code?: string } | null;
      return {
        id: r.id as string,
        staff_id: r.staff_id as string,
        staff_name: staff?.full_name ?? 'Unknown',
        staff_code: staff?.staff_code ?? null,
        rule_type: r.rule_type as 'WEEKLY_RECURRING' | 'ONE_OFF',
        availability_type: r.availability_type as 'AVAILABLE' | 'UNAVAILABLE',
        weekday: r.weekday !== null && r.weekday !== undefined ? String(r.weekday) : null,
        start_time: r.start_time as string | null,
        end_time: r.end_time as string | null,
        one_off_start: r.one_off_start as string | null,
        one_off_end: r.one_off_end as string | null,
        notes: r.notes as string | null,
      };
    });

    setRules(mapped);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  // Build staff availability grid
  const staffRows = useMemo((): StaffAvailabilityRow[] => {
    const staffMap = new Map<string, StaffAvailabilityRow>();

    for (const rule of rules) {
      if (!staffMap.has(rule.staff_id)) {
        staffMap.set(rule.staff_id, {
          staff_id: rule.staff_id,
          staff_name: rule.staff_name,
          staff_code: rule.staff_code,
          days: Object.fromEntries(WEEKDAYS.map((d) => [d, 'not-submitted' as const])),
        });
      }

      const row = staffMap.get(rule.staff_id)!;

      if (rule.rule_type === 'WEEKLY_RECURRING' && rule.weekday !== null) {
        const dayIndex = parseInt(rule.weekday, 10);
        const dayCode = WEEKDAYS[dayIndex];
        if (dayCode) {
          row.days[dayCode] = rule.availability_type === 'AVAILABLE' ? 'available' : 'unavailable';
        }
      }
    }

    return Array.from(staffMap.values()).sort((a, b) => a.staff_name.localeCompare(b.staff_name));
  }, [rules]);

  const pendingRequests = useMemo(() => rules.filter((r) => r.rule_type === 'ONE_OFF'), [rules]);

  const toggleSelectAll = () => {
    if (selected.size === pendingRequests.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingRequests.map((r) => r.id)));
    }
  };

  const stepWeek = (direction: -1 | 1) => {
    setWeekStart((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + direction * 7);
      return next;
    });
  };

  const jumpToToday = () => setWeekStart(startOfWeek(new Date()));

  const cellColor = (status: string) => {
    if (status === 'available') return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
    if (status === 'unavailable') return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
    return 'bg-gray-50 dark:bg-gray-800/30 text-gray-400 dark:text-gray-500';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">Loading availability...</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sub-nav toggle */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center rounded-lg border border-border bg-muted p-0.5">
          <button
            type="button"
            onClick={() => setSubView('requests')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              subView === 'requests' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Availability Requests
          </button>
          <button
            type="button"
            onClick={() => setSubView('weekly')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              subView === 'weekly' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Weekly View
          </button>
        </div>

        {subView === 'requests' && pendingRequests.length > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" className="border-red-300 text-red-700 hover:bg-red-50">
              <X className="h-3.5 w-3.5" /> Decline
            </Button>
            <Button variant="secondary" size="sm" className="border-green-300 text-green-700 hover:bg-green-50">
              <Check className="h-3.5 w-3.5" /> Approve
            </Button>
          </div>
        )}
      </div>

      {/* Week selector */}
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center rounded-lg border border-border bg-card">
          <button type="button" onClick={() => stepWeek(-1)} className="rounded-l-md px-2.5 py-1.5 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={jumpToToday} className="border-x border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted">
            Today
          </button>
          <button type="button" onClick={() => stepWeek(1)} className="rounded-r-md px-2.5 py-1.5 text-muted-foreground hover:text-foreground">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <span className="text-sm text-muted-foreground">{formatWeekRange(weekStart)}</span>
      </div>

      {subView === 'weekly' ? (
        <div className="flex gap-4">
          {/* Left sidebar with locations */}
          <div className="hidden lg:block w-48 shrink-0 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Locations</p>
            {locations.slice(0, 10).map((loc) => (
              <label key={loc.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={locationFilter.includes(loc.id)}
                  onChange={() => {
                    setLocationFilter((prev) =>
                      prev.includes(loc.id) ? prev.filter((id) => id !== loc.id) : [...prev, loc.id],
                    );
                  }}
                  className="rounded border-border"
                />
                <span className="truncate text-foreground">{loc.site_code} - {loc.name}</span>
              </label>
            ))}
          </div>

          {/* Main grid */}
          <div className="flex-1 overflow-x-auto">
            {staffRows.length === 0 ? (
              <EmptyState title="No Availability Data" description="No availability data found. Staff members can submit their availability." />
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-3 font-medium text-muted-foreground w-48">Employee</th>
                    {WEEKDAY_LABELS.map((label, i) => (
                      <th key={WEEKDAYS[i]} className="py-2 px-2 text-center font-medium text-muted-foreground w-20">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staffRows.map((row) => (
                    <tr key={row.staff_id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                            {row.staff_name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground truncate">{row.staff_name}</p>
                            <button
                              type="button"
                              className="text-xs text-module-accent hover:underline"
                              onClick={() => {
                                const rule = rules.find((r) => r.staff_id === row.staff_id);
                                if (rule) { setSelectedRule(rule); setDetailOpen(true); }
                              }}
                            >
                              View Availability
                            </button>
                          </div>
                        </div>
                      </td>
                      {WEEKDAYS.map((day) => (
                        <td key={day} className="py-2 px-1">
                          <div className={`rounded-md py-1 px-2 text-center text-xs font-medium ${cellColor(row.days[day])}`}>
                            {row.days[day] === 'available' ? 'Avail' : row.days[day] === 'unavailable' ? 'N/A' : '—'}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        /* Requests view */
        <div>
          {pendingRequests.length === 0 ? (
            <EmptyState title="No Pending Requests" description="No pending availability requests at this time." />
          ) : (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <input
                  type="checkbox"
                  checked={selected.size === pendingRequests.length && pendingRequests.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-border"
                />
                Select All
              </label>
              {pendingRequests.map((req) => (
                <div key={req.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <input
                    type="checkbox"
                    checked={selected.has(req.id)}
                    onChange={() => {
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(req.id)) next.delete(req.id);
                        else next.add(req.id);
                        return next;
                      });
                    }}
                    className="rounded border-border"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{req.staff_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {req.one_off_start && req.one_off_end
                        ? `${new Date(`${req.one_off_start}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(`${req.one_off_end}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                        : 'Recurring'}
                    </p>
                    {req.notes && <p className="text-xs text-muted-foreground italic">{req.notes}</p>}
                  </div>
                  <Badge color={req.availability_type === 'AVAILABLE' ? 'green' : 'red'}>
                    {req.availability_type}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detail panel */}
      <AvailabilityDetail
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setSelectedRule(null); }}
        rule={selectedRule}
        onSaved={() => { setDetailOpen(false); fetchRules(); }}
      />
    </div>
  );
}
