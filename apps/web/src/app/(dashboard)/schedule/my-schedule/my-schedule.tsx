'use client';

import { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, EmptyState, Badge } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';

interface MyShift {
  id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  site_name: string;
  site_code: string | null;
  position_code: string | null;
  status: string;
}

interface MyLeave {
  id: string;
  start_date: string;
  end_date: string;
  leave_type: string;
  status: string;
}

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function normalizeTime(value: string | null | undefined) {
  if (!value) return '00:00';
  return value.slice(0, 5);
}

export function MySchedule() {
  const { user } = useAuth();
  const [shifts, setShifts] = useState<MyShift[]>([]);
  const [leaves, setLeaves] = useState<MyLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [rangeWeeks, setRangeWeeks] = useState<'1w' | '2w' | '4w' | '1m'>('2w');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const supabase = getSupabaseBrowserClient();

      // Get current user's staff record
      const { data: staffData } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user?.id ?? '')
        .is('archived_at', null)
        .limit(1);

      const staffId = staffData?.[0]?.id;
      if (!staffId) {
        setShifts([]);
        setLeaves([]);
        setLoading(false);
        return;
      }

      const today = new Date();
      const rangeEnd = new Date(today);
      if (rangeWeeks === '1w') rangeEnd.setDate(rangeEnd.getDate() + 7);
      else if (rangeWeeks === '2w') rangeEnd.setDate(rangeEnd.getDate() + 14);
      else if (rangeWeeks === '4w') rangeEnd.setDate(rangeEnd.getDate() + 28);
      else rangeEnd.setMonth(rangeEnd.getMonth() + 1);

      const startISO = today.toISOString().slice(0, 10);
      const endISO = rangeEnd.toISOString().slice(0, 10);

      // Fetch shifts assigned to this staff member
      const { data: ticketData } = await supabase
        .from('ticket_assignments')
        .select('ticket:ticket_id(id, scheduled_date, start_time, end_time, status, position_code, site:site_id(name, site_code))')
        .eq('staff_id', staffId)
        .eq('assignment_status', 'ASSIGNED');

      const myShifts: MyShift[] = [];
      for (const row of (ticketData ?? []) as Array<Record<string, unknown>>) {
        const ticket = row.ticket as Record<string, unknown> | null;
        if (!ticket) continue;
        const scheduledDate = ticket.scheduled_date as string;
        if (scheduledDate < startISO || scheduledDate > endISO) continue;
        const site = ticket.site as { name?: string; site_code?: string } | null;
        myShifts.push({
          id: ticket.id as string,
          scheduled_date: scheduledDate,
          start_time: normalizeTime(ticket.start_time as string | null),
          end_time: normalizeTime(ticket.end_time as string | null),
          site_name: site?.name ?? 'Unassigned',
          site_code: site?.site_code ?? null,
          position_code: ticket.position_code as string | null,
          status: (ticket.status as string) ?? 'SCHEDULED',
        });
      }

      myShifts.sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date) || a.start_time.localeCompare(b.start_time));
      setShifts(myShifts);

      // Fetch leave (one-off unavailable rules)
      const { data: leaveData } = await supabase
        .from('staff_availability_rules')
        .select('id, one_off_start, one_off_end, notes')
        .eq('staff_id', staffId)
        .eq('rule_type', 'ONE_OFF')
        .eq('availability_type', 'UNAVAILABLE')
        .is('archived_at', null);

      const myLeaves: MyLeave[] = (leaveData ?? []).map((r: Record<string, unknown>) => {
        const notes = (r.notes as string) ?? '';
        const leaveType = notes.startsWith('[') ? notes.slice(1, notes.indexOf(']')) : 'Time Off';
        return {
          id: r.id as string,
          start_date: (r.one_off_start as string) ?? '',
          end_date: (r.one_off_end as string) ?? '',
          leave_type: leaveType,
          status: 'Approved',
        };
      });

      setLeaves(myLeaves);
      setLoading(false);
    }

    fetchData();
  }, [user?.id, rangeWeeks]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">Loading my schedule...</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">My Schedule</h2>
        <div className="flex items-center gap-2">
          {/* Range toggle */}
          <div className="inline-flex items-center rounded-lg border border-border bg-muted p-0.5">
            {(['1w', '2w', '4w', '1m'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setRangeWeeks(opt)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  rangeWeeks === opt ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt === '1m' ? 'Month' : opt.toUpperCase()}
              </button>
            ))}
          </div>
          {/* View toggle */}
          <div className="inline-flex items-center rounded-lg border border-border bg-muted p-0.5">
            <button
              type="button"
              onClick={() => setView('list')}
              className={`rounded-md p-1.5 transition-colors ${view === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView('calendar')}
              className={`rounded-md p-1.5 transition-colors ${view === 'calendar' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
            >
              <CalendarIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {view === 'list' ? (
        <ListView shifts={shifts} leaves={leaves} />
      ) : (
        <CalendarView shifts={shifts} leaves={leaves} />
      )}
    </div>
  );
}

/* ─── List View ─── */
function ListView({ shifts, leaves }: { shifts: MyShift[]; leaves: MyLeave[] }) {
  return (
    <>
      {shifts.length === 0 ? (
        <EmptyState title="No Upcoming Shifts" description="No upcoming shifts found for your schedule." />
      ) : (
        <div className="space-y-2">
          {shifts.map((shift) => (
            <Card key={shift.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {shift.site_code ? `${shift.site_code} – ` : ''}{shift.site_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(shift.scheduled_date)} &middot; {shift.start_time} – {shift.end_time}
                    </p>
                    {shift.position_code && (
                      <p className="text-xs text-muted-foreground">{shift.position_code.replaceAll('_', ' ')}</p>
                    )}
                  </div>
                  <Badge color={shift.status === 'COMPLETED' ? 'green' : shift.status === 'IN_PROGRESS' ? 'yellow' : 'blue'}>
                    {shift.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {leaves.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Time Off</h3>
          {leaves.map((leave) => (
            <Card key={leave.id}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{leave.leave_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {leave.start_date && formatDate(leave.start_date)} – {leave.end_date && formatDate(leave.end_date)}
                    </p>
                  </div>
                  <Badge color="green">{leave.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

/* ─── Calendar View ─── */
const WEEKDAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function CalendarView({ shifts, leaves }: { shifts: MyShift[]; leaves: MyLeave[] }) {
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const shiftsByDate = useMemo(() => {
    const map = new Map<string, MyShift[]>();
    for (const s of shifts) {
      const existing = map.get(s.scheduled_date);
      if (existing) existing.push(s);
      else map.set(s.scheduled_date, [s]);
    }
    return map;
  }, [shifts]);

  const leaveDates = useMemo(() => {
    const set = new Set<string>();
    for (const l of leaves) {
      if (!l.start_date) continue;
      const start = new Date(`${l.start_date}T12:00:00`);
      const end = l.end_date ? new Date(`${l.end_date}T12:00:00`) : start;
      const cursor = new Date(start);
      while (cursor <= end) {
        set.add(cursor.toISOString().slice(0, 10));
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return set;
  }, [leaves]);

  const calendarDays = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{ date: string; day: number; inMonth: boolean }> = [];

    // Leading blanks
    for (let i = 0; i < firstDay; i++) {
      const d = new Date(year, month, -(firstDay - 1 - i));
      days.push({ date: d.toISOString().slice(0, 10), day: d.getDate(), inMonth: false });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month, d);
      days.push({ date: dt.toISOString().slice(0, 10), day: d, inMonth: true });
    }

    // Trailing blanks to complete final week
    const trailing = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= trailing; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d.toISOString().slice(0, 10), day: d.getDate(), inMonth: false });
    }

    return days;
  }, [calMonth]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const monthLabel = calMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold text-foreground">{monthLabel}</p>
        <button
          type="button"
          onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Grid */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/30">
          {WEEKDAY_HEADERS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((cell) => {
            const dayShifts = shiftsByDate.get(cell.date) ?? [];
            const isLeave = leaveDates.has(cell.date);
            const isToday = cell.date === todayStr;

            return (
              <div
                key={cell.date}
                className={`min-h-[5rem] border-b border-r border-border/50 p-1.5 ${
                  !cell.inMonth ? 'bg-muted/20' : ''
                } ${isToday ? 'bg-primary/5' : ''}`}
              >
                <p className={`text-xs font-medium mb-1 ${
                  !cell.inMonth ? 'text-muted-foreground/40' : isToday ? 'text-primary font-bold' : 'text-muted-foreground'
                }`}>
                  {cell.day}
                </p>

                {isLeave && cell.inMonth && (
                  <div className="mb-0.5 rounded bg-orange-100 px-1 py-0.5 text-[10px] font-medium text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 truncate">
                    Time Off
                  </div>
                )}

                {cell.inMonth && dayShifts.map((shift) => (
                  <div
                    key={shift.id}
                    className={`mb-0.5 rounded px-1 py-0.5 text-[10px] font-medium truncate ${
                      shift.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300'
                        : shift.status === 'IN_PROGRESS'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                    }`}
                    title={`${shift.site_name} · ${shift.start_time}–${shift.end_time} · ${shift.status}`}
                  >
                    {shift.start_time} {shift.site_code ?? shift.site_name}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
