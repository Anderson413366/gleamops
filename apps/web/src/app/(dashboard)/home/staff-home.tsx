'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ClipboardList, FileText, ShieldAlert, Timer } from 'lucide-react';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface StaffContext {
  id: string;
  full_name: string;
  staff_code: string;
}

interface AssignmentRow {
  ticket_id: string;
  assignment_status: string | null;
}

interface ShiftRow {
  id: string;
  ticket_code: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  site: {
    name: string;
    site_code: string | null;
    janitorial_closet_location: string | null;
    supply_storage_location: string | null;
    entry_instructions: string | null;
    parking_instructions: string | null;
  } | null;
}

interface RawShiftRow {
  id: string;
  ticket_code: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  site:
    | {
        name: string;
        site_code: string | null;
        janitorial_closet_location: string | null;
        supply_storage_location: string | null;
        entry_instructions: string | null;
        parking_instructions: string | null;
      }
    | Array<{
        name: string;
        site_code: string | null;
        janitorial_closet_location: string | null;
        supply_storage_location: string | null;
        entry_instructions: string | null;
        parking_instructions: string | null;
      }>
    | null;
}

function localDateKey(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function formatTime(value: string | null): string {
  if (!value) return 'TBD';
  const [hourText, minuteText] = value.split(':');
  const hour = Number(hourText);
  if (!Number.isFinite(hour)) return value;
  const minute = minuteText ?? '00';
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${suffix}`;
}

function statusTone(status: string): 'green' | 'yellow' | 'red' | 'gray' {
  if (status === 'DONE' || status === 'COMPLETED') return 'green';
  if (status === 'ACTIVE' || status === 'IN_PROGRESS') return 'yellow';
  if (status === 'CANCELED') return 'red';
  return 'gray';
}

function relationOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default function StaffHome() {
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffContext | null>(null);
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [pendingChecklistCount, setPendingChecklistCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setStaff(null);
      setShifts([]);
      setPendingChecklistCount(0);
      setLoading(false);
      return;
    }

    const { data: staffRow } = await supabase
      .from('staff')
      .select('id, full_name, staff_code')
      .eq('user_id', user.id)
      .is('archived_at', null)
      .maybeSingle();

    if (!staffRow) {
      setStaff(null);
      setShifts([]);
      setPendingChecklistCount(0);
      setLoading(false);
      return;
    }

    const parsedStaff = staffRow as StaffContext;
    setStaff(parsedStaff);

    const { data: assignmentRowsData } = await supabase
      .from('ticket_assignments')
      .select('ticket_id, assignment_status')
      .eq('staff_id', parsedStaff.id)
      .is('archived_at', null);

    const ticketIds = Array.from(
      new Set(
        ((assignmentRowsData ?? []) as AssignmentRow[])
          .filter((row) => row.assignment_status !== 'CANCELED' && row.assignment_status !== 'REMOVED')
          .map((row) => row.ticket_id),
      ),
    );

    if (ticketIds.length === 0) {
      setShifts([]);
      setPendingChecklistCount(0);
      setLoading(false);
      return;
    }

    const today = localDateKey(new Date());

    const { data: shiftRowsData } = await supabase
      .from('work_tickets')
      .select(`
        id,
        ticket_code,
        scheduled_date,
        start_time,
        end_time,
        status,
        site:site_id(
          name,
          site_code,
          janitorial_closet_location,
          supply_storage_location,
          entry_instructions,
          parking_instructions
        )
      `)
      .in('id', ticketIds)
      .eq('scheduled_date', today)
      .is('archived_at', null)
      .order('start_time', { ascending: true });

    const parsedShifts = ((shiftRowsData ?? []) as RawShiftRow[]).map((row) => ({
      id: row.id,
      ticket_code: row.ticket_code,
      scheduled_date: row.scheduled_date,
      start_time: row.start_time,
      end_time: row.end_time,
      status: row.status,
      site: relationOne(row.site),
    }));
    setShifts(parsedShifts);

    if (parsedShifts.length > 0) {
      const checklistTicketIds = parsedShifts.map((shift) => shift.id);
      const { count } = await supabase
        .from('ticket_checklists')
        .select('id', { count: 'exact', head: true })
        .in('ticket_id', checklistTicketIds)
        .neq('status', 'COMPLETED')
        .is('archived_at', null);

      setPendingChecklistCount(count ?? 0);
    } else {
      setPendingChecklistCount(0);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const nextShift = useMemo(() => shifts[0] ?? null, [shifts]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Loading staff home...
        </CardContent>
      </Card>
    );
  }

  if (!staff) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4 text-warning" />
            Staff Home Access
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No staff profile is linked to your user. Ask admin to map your account to a staff record.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Staff Home</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Today&apos;s shifts, checklist progress, and self-service tools for {staff.full_name}.
        </p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="grid gap-3 md:grid-cols-3">
            <Link
              href="/schedule?tab=recurring"
              className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
            >
              <CalendarDays className="h-4 w-4 inline mr-2" />
              View Schedule
            </Link>
            <Link
              href="/schedule?tab=checklists"
              className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
            >
              <ClipboardList className="h-4 w-4 inline mr-2" />
              Open Shift Checklist
            </Link>
            <Link
              href="/schedule?tab=forms"
              className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
            >
              <FileText className="h-4 w-4 inline mr-2" />
              Submit Request Form
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Shifts Today</p>
            <p className="text-xl font-semibold">{shifts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Pending Checklists</p>
            <p className="text-xl font-semibold">{pendingChecklistCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Next Shift</p>
            <p className="text-xl font-semibold">
              {nextShift ? `${formatTime(nextShift.start_time)} - ${formatTime(nextShift.end_time)}` : 'No shift'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base inline-flex items-center gap-2">
            <Timer className="h-4 w-4 text-module-accent" />
            Today&apos;s Shift Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {shifts.map((shift) => (
            <div key={shift.id} className="rounded-lg border border-border/70 bg-muted/15 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-foreground">
                  {shift.ticket_code} · {shift.site?.site_code ? `${shift.site.site_code} - ` : ''}{shift.site?.name ?? 'Unknown Site'}
                </p>
                <Badge color={statusTone(shift.status)}>{shift.status}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
              </p>

              <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                <p>Janitorial Closet: {shift.site?.janitorial_closet_location || 'Not specified'}</p>
                <p>Supply Storage: {shift.site?.supply_storage_location || 'Not specified'}</p>
                <p>Entry: {shift.site?.entry_instructions || 'Not specified'}</p>
                <p>Parking: {shift.site?.parking_instructions || 'Not specified'}</p>
              </div>
            </div>
          ))}

          {shifts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No shifts assigned for today.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
