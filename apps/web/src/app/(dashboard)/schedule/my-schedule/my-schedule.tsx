'use client';

import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, List } from 'lucide-react';
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
        .select('ticket:work_tickets!ticket_assignments_ticket_id_fkey(id, scheduled_date, start_time, end_time, status, position_code, site:sites!work_tickets_site_id_fkey(name, site_code))')
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

      {/* Shifts */}
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

      {/* Time Off */}
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
    </div>
  );
}
