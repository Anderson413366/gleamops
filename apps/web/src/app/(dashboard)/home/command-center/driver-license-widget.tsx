'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@gleamops/ui';
import { IdCard, TriangleAlert } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type CommandCenterFilter = 'all' | 'regular-shifts' | 'projects' | 'requests';

interface DriverStaffRow {
  id: string;
  full_name: string;
  staff_status?: string | null;
  driver_license_number?: string | null;
  driver_license_expiry?: string | null;
  driver_approved?: boolean | null;
}

interface DriverLicenseWidgetProps {
  date: string;
  filter: CommandCenterFilter;
}

interface ExpiringLicense {
  id: string;
  name: string;
  expiryDate: Date;
  daysAway: number;
  approved: boolean;
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

function badgeTone(daysAway: number): 'red' | 'yellow' | 'blue' {
  if (daysAway < 0) return 'red';
  if (daysAway <= 14) return 'yellow';
  return 'blue';
}

function dateLabel(value: Date): string {
  return value.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function DriverLicenseWidget({ date, filter }: DriverLicenseWidgetProps) {
  const [rows, setRows] = useState<DriverStaffRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadRows() {
      setLoading(true);
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .is('archived_at', null)
        .order('full_name', { ascending: true })
        .limit(500);

      if (cancelled) return;

      if (error || !data) {
        setRows([]);
        setLoading(false);
        return;
      }

      const activeRows = (data as DriverStaffRow[]).filter((row) => {
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

  const expiringLicenses = useMemo(() => {
    return rows
      .map((row) => {
        const expiryDate = parseDate(row.driver_license_expiry);
        if (!expiryDate) return null;
        const daysAway = Math.ceil((startOfDay(expiryDate).getTime() - targetDate.getTime()) / (24 * 60 * 60 * 1000));
        if (daysAway > 45) return null;
        return {
          id: row.id,
          name: row.full_name,
          expiryDate,
          daysAway,
          approved: Boolean(row.driver_approved),
        } satisfies ExpiringLicense;
      })
      .filter((entry): entry is ExpiringLicense => entry !== null)
      .sort((a, b) => a.daysAway - b.daysAway)
      .slice(0, 8);
  }, [rows, targetDate]);

  const pendingApprovalCount = useMemo(() => {
    return rows.filter((row) => {
      const hasLicense = Boolean(row.driver_license_number?.trim());
      return hasLicense && !row.driver_approved;
    }).length;
  }, [rows]);

  if (filter === 'requests') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <IdCard className="h-4 w-4 text-module-accent" aria-hidden="true" />
            Driver Licenses
          </CardTitle>
          <CardDescription>Hidden in Requests filter.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <IdCard className="h-4 w-4 text-module-accent" aria-hidden="true" />
          Driver Licenses
          <Badge color={expiringLicenses.some((entry) => entry.daysAway < 0) ? 'red' : expiringLicenses.length ? 'yellow' : 'green'}>
            {expiringLicenses.length}
          </Badge>
        </CardTitle>
        <CardDescription>Expiring licenses and pending approvals</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading driver license status...</p>
        ) : expiringLicenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No driver licenses expiring in the next 45 days.</p>
        ) : (
          <div className="space-y-1.5">
            {expiringLicenses.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/30 px-2.5 py-1.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{entry.name}</p>
                  <p className="text-xs text-muted-foreground">{dateLabel(entry.expiryDate)}</p>
                </div>
                <Badge color={badgeTone(entry.daysAway)}>
                  {entry.daysAway < 0 ? 'Expired' : `In ${entry.daysAway}d`}
                </Badge>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-lg border border-border/70 bg-muted/30 px-2.5 py-2">
          <p className="text-xs font-medium text-foreground">Pending Driver Approvals</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{pendingApprovalCount}</p>
        </div>

        {(pendingApprovalCount > 0 || expiringLicenses.some((entry) => entry.daysAway < 0)) ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <span className="inline-flex items-center gap-1">
              <TriangleAlert className="h-3.5 w-3.5" />
              Driver approval and license renewals need manager review.
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
