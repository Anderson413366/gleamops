'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@gleamops/ui';
import { CarFront, ShieldAlert } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type CommandCenterFilter = 'all' | 'regular-shifts' | 'projects' | 'requests';

interface VehicleComplianceRow {
  id: string;
  name?: string | null;
  vehicle_code?: string | null;
  sticker_renewal_date?: string | null;
  registration_expiry?: string | null;
  insurance_expiry?: string | null;
}

interface VehicleComplianceWidgetProps {
  date: string;
  filter: CommandCenterFilter;
}

interface ComplianceEvent {
  id: string;
  vehicleLabel: string;
  eventLabel: string;
  date: Date;
  daysAway: number;
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

function toneFromDays(daysAway: number): 'red' | 'yellow' | 'blue' {
  if (daysAway < 0) return 'red';
  if (daysAway <= 14) return 'yellow';
  return 'blue';
}

function dateLabel(value: Date): string {
  return value.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function VehicleComplianceWidget({ date, filter }: VehicleComplianceWidgetProps) {
  const [rows, setRows] = useState<VehicleComplianceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadRows() {
      setLoading(true);
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .is('archived_at', null)
        .order('name', { ascending: true })
        .limit(300);

      if (cancelled) return;

      if (error || !data) {
        setRows([]);
        setLoading(false);
        return;
      }

      setRows((data as VehicleComplianceRow[]) ?? []);
      setLoading(false);
    }

    void loadRows();
    return () => {
      cancelled = true;
    };
  }, []);

  const targetDate = useMemo(() => startOfDay(new Date(`${date}T12:00:00`)), [date]);

  const complianceEvents = useMemo(() => {
    const allEvents: ComplianceEvent[] = [];

    for (const row of rows) {
      const vehicleLabel = row.vehicle_code?.trim() || row.name?.trim() || 'Unnamed Vehicle';
      const eventRows: Array<{ label: string; value: string | null | undefined }> = [
        { label: 'Sticker', value: row.sticker_renewal_date },
        { label: 'Registration', value: row.registration_expiry },
        { label: 'Insurance', value: row.insurance_expiry },
      ];

      for (const event of eventRows) {
        const parsedDate = parseDate(event.value);
        if (!parsedDate) continue;
        const daysAway = Math.ceil((startOfDay(parsedDate).getTime() - targetDate.getTime()) / (24 * 60 * 60 * 1000));
        if (daysAway > 45) continue;
        allEvents.push({
          id: `${row.id}-${event.label}`,
          vehicleLabel,
          eventLabel: event.label,
          date: parsedDate,
          daysAway,
        });
      }
    }

    return allEvents.sort((a, b) => a.daysAway - b.daysAway).slice(0, 8);
  }, [rows, targetDate]);

  const hasAnyConfiguredDate = useMemo(() => {
    return rows.some((row) => row.sticker_renewal_date || row.registration_expiry || row.insurance_expiry);
  }, [rows]);

  if (filter === 'requests') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CarFront className="h-4 w-4 text-module-accent" aria-hidden="true" />
            Vehicle Compliance
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
          <CarFront className="h-4 w-4 text-module-accent" aria-hidden="true" />
          Vehicle Compliance
          <Badge color={complianceEvents.some((event) => event.daysAway < 0) ? 'red' : complianceEvents.length ? 'yellow' : 'green'}>
            {complianceEvents.length}
          </Badge>
        </CardTitle>
        <CardDescription>Expiring sticker, registration, and insurance dates (next 45 days)</CardDescription>
      </CardHeader>

      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading vehicle compliance...</p>
        ) : !hasAnyConfiguredDate ? (
          <p className="text-sm text-muted-foreground">No vehicle compliance dates configured yet.</p>
        ) : complianceEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No compliance expirations in the next 45 days.</p>
        ) : (
          <div className="space-y-1.5">
            {complianceEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/30 px-2.5 py-1.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{event.vehicleLabel}</p>
                  <p className="text-xs text-muted-foreground">{event.eventLabel} · {dateLabel(event.date)}</p>
                </div>
                <Badge color={toneFromDays(event.daysAway)}>
                  {event.daysAway < 0 ? 'Overdue' : `In ${event.daysAway}d`}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {complianceEvents.some((event) => event.daysAway < 0) ? (
          <div className="mt-3 rounded-lg border border-red-300 bg-red-50 px-2.5 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
            <span className="inline-flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5" />
              Overdue vehicle compliance items require immediate manager follow-up.
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
