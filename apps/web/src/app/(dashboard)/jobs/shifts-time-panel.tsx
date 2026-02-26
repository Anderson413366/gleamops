'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, MapPin, Moon, ShieldAlert } from 'lucide-react';
import { normalizeRoleCode } from '@gleamops/shared';
import { Button, Card, CardContent, CardHeader } from '@gleamops/ui';
import { toast } from 'sonner';
import { getIntlLocale } from '@/lib/locale';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useLocale } from '@/hooks/use-locale';

type CoverageStatus = 'covered' | 'at_risk' | 'uncovered';

type NextStop = {
  stop_id: string;
  route_id: string;
  stop_order: number;
  stop_status: string;
  planned_start_at: string | null;
  planned_end_at: string | null;
  site_id: string | null;
  site_code: string | null;
  site_name: string | null;
  job_code: string | null;
  primary_action: 'arrive' | 'complete';
};

type SiteSummary = {
  site_id: string;
  site_code: string;
  site_name: string;
  total_stops: number;
  completed_stops: number;
  arrived_stops: number;
  pending_stops: number;
  skipped_stops: number;
  late_stops: number;
  coverage_status: CoverageStatus;
};

type TonightBoardData = {
  pilot_enabled: boolean;
  date: string;
  my_staff_id: string | null;
  my_next_stop: NextStop | null;
  site_summaries: SiteSummary[];
  totals: {
    sites: number;
    stops: number;
    uncovered_sites: number;
  };
};

interface ShiftsTimePanelProps {
  search: string;
}

const FIELD_ROLES = new Set(['CLEANER', 'INSPECTOR']);
const CALLOUT_REASONS = ['SICK', 'PERSONAL', 'EMERGENCY', 'NO_SHOW', 'WEATHER', 'TRANSPORT', 'OTHER'] as const;
type CalloutReason = (typeof CALLOUT_REASONS)[number];

async function authHeaders() {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function formatWindow(start: string | null, end: string | null, locale: string): string {
  if (!start && !end) return '—';
  const startValue = start ? new Date(start).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }) : '—';
  const endValue = end ? new Date(end).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }) : '—';
  return `${startValue} - ${endValue}`;
}

function statusClasses(status: CoverageStatus): string {
  if (status === 'covered') return 'bg-green-50 text-green-700 border-green-200';
  if (status === 'at_risk') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-red-50 text-red-700 border-red-200';
}

export default function ShiftsTimePanel({ search }: ShiftsTimePanelProps) {
  const { role } = useAuth();
  const { locale, t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [actionSaving, setActionSaving] = useState(false);
  const [calloutSaving, setCalloutSaving] = useState(false);
  const [showCalloutForm, setShowCalloutForm] = useState(false);
  const [calloutReason, setCalloutReason] = useState<CalloutReason>('SICK');
  const [data, setData] = useState<TonightBoardData | null>(null);
  const localeCode = getIntlLocale(locale);
  const roleCode = normalizeRoleCode(role ?? '') ?? (role ?? '').toUpperCase();
  const isFieldRole = FIELD_ROLES.has(roleCode);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await authHeaders();
      const response = await fetch('/api/operations/shifts-time/tonight-board', {
        headers,
        cache: 'no-store',
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.data) {
        throw new Error(body?.detail ?? body?.title ?? t('shiftsTime.error.load'));
      }
      setData(body.data as TonightBoardData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('shiftsTime.error.load'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredSites = useMemo(() => {
    const rows = data?.site_summaries ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => (
      row.site_name.toLowerCase().includes(q) || row.site_code.toLowerCase().includes(q)
    ));
  }, [data?.site_summaries, search]);

  const boardMetrics = useMemo(() => {
    return filteredSites.reduce(
      (acc, site) => {
        acc.total += site.total_stops;
        acc.completed += site.completed_stops;
        acc.late += site.late_stops;
        acc.skipped += site.skipped_stops;
        return acc;
      },
      { total: 0, completed: 0, late: 0, skipped: 0 },
    );
  }, [filteredSites]);

  const executePrimary = useCallback(async () => {
    const nextStop = data?.my_next_stop;
    if (!nextStop) return;

    setActionSaving(true);
    try {
      const headers = await authHeaders();
      headers['Content-Type'] = 'application/json';
      const endpoint = nextStop.primary_action === 'complete'
        ? `/api/operations/shifts-time/stops/${encodeURIComponent(nextStop.stop_id)}/complete`
        : `/api/operations/shifts-time/stops/${encodeURIComponent(nextStop.stop_id)}/start`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) {
        throw new Error(body?.detail ?? body?.title ?? t('shiftsTime.error.action'));
      }

      toast.success(
        nextStop.primary_action === 'complete'
          ? t('shiftsTime.action.successComplete')
          : t('shiftsTime.action.successArrive'),
      );
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('shiftsTime.error.action'));
    } finally {
      setActionSaving(false);
    }
  }, [data?.my_next_stop, load, t]);

  const reportCallout = useCallback(async () => {
    if (!data?.my_staff_id) {
      toast.error(t('shiftsTime.callout.noStaff'));
      return;
    }

    setCalloutSaving(true);
    try {
      const headers = await authHeaders();
      headers['Content-Type'] = 'application/json';
      const response = await fetch('/api/operations/shifts-time/callouts/report', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          affected_staff_id: data.my_staff_id,
          reason: calloutReason,
          route_id: data.my_next_stop?.route_id ?? null,
          route_stop_id: data.my_next_stop?.stop_id ?? null,
          site_id: data.my_next_stop?.site_id ?? null,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) {
        throw new Error(body?.detail ?? body?.title ?? t('shiftsTime.callout.error'));
      }

      toast.success(t('shiftsTime.callout.success'));
      setShowCalloutForm(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('shiftsTime.callout.error'));
    } finally {
      setCalloutSaving(false);
    }
  }, [calloutReason, data?.my_next_stop?.route_id, data?.my_next_stop?.site_id, data?.my_next_stop?.stop_id, data?.my_staff_id, load, t]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-module-accent" />
            <h3 className="text-lg font-semibold text-foreground">{t('shiftsTime.title')}</h3>
          </div>
          <p className="text-sm text-muted-foreground">{t('shiftsTime.subtitle')}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!data?.pilot_enabled && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {t('shiftsTime.pilotOff')}
            </div>
          )}

          <div className="rounded-lg border border-border bg-background px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('shiftsTime.myNextStop')}
            </p>
            {data?.my_next_stop ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                  <p><span className="text-muted-foreground">{t('shiftsTime.when')}</span><br />{formatWindow(data.my_next_stop.planned_start_at, data.my_next_stop.planned_end_at, localeCode)}</p>
                  <p><span className="text-muted-foreground">{t('shiftsTime.where')}</span><br />{data.my_next_stop.site_code ?? t('shiftsTime.unknown')} - {data.my_next_stop.site_name ?? t('shiftsTime.unknown')}</p>
                  <p><span className="text-muted-foreground">{t('shiftsTime.what')}</span><br />{data.my_next_stop.job_code ?? t('shiftsTime.unknown')}</p>
                </div>

                <Button
                  className="w-full sm:w-auto"
                  onClick={() => void executePrimary()}
                  disabled={actionSaving}
                >
                  {actionSaving
                    ? t('shiftsTime.action.loading')
                    : data.my_next_stop.primary_action === 'complete'
                      ? t('shiftsTime.action.complete')
                      : t('shiftsTime.action.arrive')}
                </Button>

                {isFieldRole && (
                  <div className="space-y-2">
                    {!showCalloutForm ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full sm:w-auto"
                        onClick={() => setShowCalloutForm(true)}
                      >
                        {t('shiftsTime.callout.report')}
                      </Button>
                    ) : (
                      <div className="space-y-2 rounded-lg border border-border bg-background p-3">
                        <p className="text-sm font-medium text-foreground">{t('shiftsTime.callout.title')}</p>
                        <p className="text-xs text-muted-foreground">{t('shiftsTime.callout.help')}</p>
                        <label className="block text-xs font-medium text-muted-foreground" htmlFor="shifts-time-callout-reason">
                          {t('shiftsTime.callout.reasonLabel')}
                        </label>
                        <select
                          id="shifts-time-callout-reason"
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                          value={calloutReason}
                          onChange={(event) => setCalloutReason(event.target.value as CalloutReason)}
                          disabled={calloutSaving}
                        >
                          {CALLOUT_REASONS.map((reason) => (
                            <option key={reason} value={reason}>
                              {t(`shiftsTime.callout.reason.${reason}`)}
                            </option>
                          ))}
                        </select>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Button
                            type="button"
                            className="w-full sm:w-auto"
                            onClick={() => void reportCallout()}
                            disabled={calloutSaving}
                          >
                            {calloutSaving ? t('shiftsTime.callout.reporting') : t('shiftsTime.callout.report')}
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            className="w-full sm:w-auto"
                            onClick={() => setShowCalloutForm(false)}
                            disabled={calloutSaving}
                          >
                            {t('common.cancel')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('shiftsTime.noNextStop')}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {!isFieldRole && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-base font-semibold text-foreground">{t('shiftsTime.boardTitle')}</h4>
              <Button variant="secondary" size="sm" onClick={() => void load()}>
                {t('shiftsTime.refresh')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('shiftsTime.counts', {
                completed: boardMetrics.completed,
                total: boardMetrics.total,
                late: boardMetrics.late,
                skipped: boardMetrics.skipped,
              })}
            </p>
          </CardHeader>
          <CardContent>
            {filteredSites.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('shiftsTime.boardEmpty')}</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filteredSites.map((site) => (
                  <article key={site.site_id} className="rounded-lg border border-border bg-background px-3 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{site.site_name}</p>
                        <p className="text-xs text-muted-foreground">{site.site_code}</p>
                      </div>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusClasses(site.coverage_status)}`}>
                        {site.coverage_status === 'covered'
                          ? t('shiftsTime.status.covered')
                          : site.coverage_status === 'at_risk'
                            ? t('shiftsTime.status.atRisk')
                            : t('shiftsTime.status.uncovered')}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-green-600" />{site.completed_stops}/{site.total_stops}</span>
                      <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 text-amber-600" />{site.late_stops}</span>
                      <span className="inline-flex items-center gap-1"><ShieldAlert className="h-3.5 w-3.5 text-red-600" />{site.skipped_stops}</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{site.arrived_stops}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
