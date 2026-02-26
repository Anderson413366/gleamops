'use client';

import { useEffect, useMemo, useState } from 'react';
import { Cake, Medal } from 'lucide-react';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type CommandCenterFilter = 'all' | 'regular-shifts' | 'projects' | 'requests';

interface StaffCelebrationRow {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  hire_date: string | null;
  staff_status: string | null;
}

interface CelebrationWidgetProps {
  date: string;
  filter: CommandCenterFilter;
}

interface BirthdayEntry {
  id: string;
  name: string;
  nextBirthday: Date;
  daysAway: number;
}

interface AnniversaryEntry {
  id: string;
  name: string;
  anniversaryDate: Date;
  years: number;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(value: Date): Date {
  const day = new Date(value);
  day.setHours(0, 0, 0, 0);
  return day;
}

function nextBirthday(dateOfBirth: Date, from: Date): Date {
  const next = new Date(from.getFullYear(), dateOfBirth.getMonth(), dateOfBirth.getDate(), 12, 0, 0, 0);
  if (next < from) {
    next.setFullYear(next.getFullYear() + 1);
  }
  return next;
}

function formatDayLabel(value: Date): string {
  return value.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function BirthdayAnniversaryWidget({ date, filter }: CelebrationWidgetProps) {
  const [rows, setRows] = useState<StaffCelebrationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadRows() {
      setLoading(true);
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('staff')
        .select('id, full_name, date_of_birth, hire_date, staff_status')
        .is('archived_at', null)
        .order('full_name', { ascending: true });

      if (cancelled) return;

      if (error || !data) {
        setRows([]);
        setLoading(false);
        return;
      }

      const activeRows = (data as StaffCelebrationRow[]).filter((row) => {
        const status = String(row.staff_status ?? 'ACTIVE').toUpperCase();
        return status !== 'INACTIVE' && status !== 'TERMINATED';
      });
      setRows(activeRows);
      setLoading(false);
    }

    void loadRows();
    return () => {
      cancelled = true;
    };
  }, []);

  const targetDate = useMemo(() => startOfDay(new Date(`${date}T12:00:00`)), [date]);

  const birthdays = useMemo(() => {
    return rows
      .map((row) => {
        const birthDate = parseDate(row.date_of_birth);
        if (!birthDate) return null;
        const next = nextBirthday(birthDate, targetDate);
        const daysAway = Math.round((next.getTime() - targetDate.getTime()) / (24 * 60 * 60 * 1000));
        return {
          id: row.id,
          name: row.full_name,
          nextBirthday: next,
          daysAway,
        } satisfies BirthdayEntry;
      })
      .filter((entry): entry is BirthdayEntry => entry !== null)
      .filter((entry) => entry.daysAway >= 0 && entry.daysAway <= 6)
      .sort((a, b) => a.daysAway - b.daysAway)
      .slice(0, 6);
  }, [rows, targetDate]);

  const anniversaries = useMemo(() => {
    return rows
      .map((row) => {
        const hireDate = parseDate(row.hire_date);
        if (!hireDate) return null;
        if (hireDate.getMonth() !== targetDate.getMonth()) return null;
        const anniversaryDate = new Date(targetDate.getFullYear(), hireDate.getMonth(), hireDate.getDate(), 12, 0, 0, 0);
        const years = Math.max(0, targetDate.getFullYear() - hireDate.getFullYear());
        return {
          id: row.id,
          name: row.full_name,
          anniversaryDate,
          years,
        } satisfies AnniversaryEntry;
      })
      .filter((entry): entry is AnniversaryEntry => Boolean(entry))
      .sort((a, b) => a.anniversaryDate.getTime() - b.anniversaryDate.getTime())
      .slice(0, 8);
  }, [rows, targetDate]);

  if (filter === 'requests') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Cake className="h-4 w-4 text-module-accent" aria-hidden="true" />
            Team Milestones
          </CardTitle>
          <CardDescription>Birthdays and anniversaries are hidden in Requests filter.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Cake className="h-4 w-4 text-module-accent" aria-hidden="true" />
          Team Milestones
          <Badge color="blue">{birthdays.length + anniversaries.length}</Badge>
        </CardTitle>
        <CardDescription>Upcoming birthdays this week and work anniversaries this month</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading team milestones...</p>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Cake className="h-3.5 w-3.5" aria-hidden="true" />
                Birthdays This Week
              </div>
              {birthdays.length === 0 ? (
                <p className="text-sm text-muted-foreground">No birthdays in the next 7 days.</p>
              ) : (
                <div className="space-y-1.5">
                  {birthdays.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/30 px-2.5 py-1.5">
                      <p className="text-sm font-medium text-foreground">{entry.name}</p>
                      <p className="text-xs text-muted-foreground">{formatDayLabel(entry.nextBirthday)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Medal className="h-3.5 w-3.5" aria-hidden="true" />
                Work Anniversaries
              </div>
              {anniversaries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No anniversaries this month.</p>
              ) : (
                <div className="space-y-1.5">
                  {anniversaries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/30 px-2.5 py-1.5">
                      <p className="text-sm font-medium text-foreground">{entry.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.years} yr · {formatDayLabel(entry.anniversaryDate)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
