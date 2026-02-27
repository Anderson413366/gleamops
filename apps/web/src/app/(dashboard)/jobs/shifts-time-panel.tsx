'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, MapPin, Moon, ShieldAlert, Route, Users2, WalletCards } from 'lucide-react';
import { normalizeRoleCode } from '@gleamops/shared';
import { Button, Card, CardContent, CardHeader, ChipTabs } from '@gleamops/ui';
import { toast } from 'sonner';
import { getIntlLocale } from '@/lib/locale';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useLocale } from '@/hooks/use-locale';

type CoverageStatus = 'covered' | 'at_risk' | 'uncovered';
type StopExecutionSource = 'route_stop' | 'work_ticket';

type NextStop = {
  stop_id: string;
  route_id: string;
  execution_source: StopExecutionSource;
  work_ticket_id: string | null;
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

type RouteSummary = {
  route_id: string;
  route_date: string;
  route_status: string;
  route_owner_staff_id: string | null;
  route_owner_code: string | null;
  route_owner_name: string | null;
  stops: Array<{
    stop_id: string;
    execution_source: StopExecutionSource;
    work_ticket_id: string | null;
    stop_order: number;
    stop_status: string;
    planned_start_at: string | null;
    planned_end_at: string | null;
    site_id: string | null;
    site_code: string | null;
    site_name: string | null;
    job_code: string | null;
    primary_action: 'arrive' | 'complete';
  }>;
};

type CalloutSummary = {
  id: string;
  reason: string;
  status: string;
  reported_at: string;
  escalation_level: number;
  route_id: string | null;
  route_stop_id: string | null;
  affected_staff_id: string | null;
  affected_staff_name: string | null;
  covered_by_staff_id: string | null;
  covered_by_staff_name: string | null;
  site_id: string | null;
  site_code: string | null;
  site_name: string | null;
};

type CoverageCandidate = {
  staff_id: string;
  staff_code: string | null;
  full_name: string | null;
};

type PayrollMappingSummary = {
  id: string;
  template_name: string;
  provider_code: string | null;
  delimiter: string;
  include_header: boolean;
  quote_all: boolean;
  decimal_separator: string;
  date_format: string;
  is_default: boolean;
  is_active: boolean;
};

type PayrollMappingField = {
  id: string;
  mapping_id: string;
  sort_order: number;
  output_column_name: string;
  source_field: string | null;
  static_value: string | null;
  transform_config: Record<string, unknown> | null;
  is_required: boolean;
  is_enabled: boolean;
};

type PayrollRunSummary = {
  id: string;
  period_start: string;
  period_end: string;
  status: string;
  created_at: string;
  exported_at: string | null;
  mapping_name: string | null;
};

type TonightBoardData = {
  pilot_enabled: boolean;
  features?: {
    route_execution: boolean;
    callout_automation: boolean;
    payroll_export: boolean;
  };
  date: string;
  my_staff_id: string | null;
  my_next_stop: NextStop | null;
  route_summaries?: RouteSummary[];
  recent_callouts?: CalloutSummary[];
  coverage_candidates?: CoverageCandidate[];
  payroll_mappings?: PayrollMappingSummary[];
  payroll_runs?: PayrollRunSummary[];
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
const COVERAGE_MANAGER_ROLES = new Set(['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR']);
const PAYROLL_MANAGER_ROLES = new Set(['OWNER_ADMIN', 'MANAGER']);
const CALLOUT_REASONS = ['SICK', 'PERSONAL', 'EMERGENCY', 'NO_SHOW', 'WEATHER', 'TRANSPORT', 'OTHER'] as const;
type CalloutReason = (typeof CALLOUT_REASONS)[number];
type ManagerTab = 'board' | 'routes' | 'coverage' | 'payroll';
const PAYROLL_SOURCE_FIELDS = [
  'staff_code',
  'full_name',
  'period_start',
  'period_end',
  'regular_hours',
  'overtime_hours',
  'pto_hours',
  'sick_hours',
  'vacation_hours',
  'holiday_hours',
  'travel_hours',
  'on_call_stipend',
  'hourly_rate',
  'gross_pay',
] as const;

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
  if (!start && !end) return '--';
  const startValue = start ? new Date(start).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }) : '--';
  const endValue = end ? new Date(end).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }) : '--';
  return `${startValue} - ${endValue}`;
}

function formatDateTime(value: string, locale: string): string {
  return new Date(value).toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusClasses(status: CoverageStatus): string {
  if (status === 'covered') return 'bg-green-50 text-green-700 border-green-200';
  if (status === 'at_risk') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-red-50 text-red-700 border-red-200';
}

function stopStatusClasses(status: string): string {
  if (status === 'COMPLETED') return 'bg-green-50 text-green-700 border-green-200';
  if (status === 'ARRIVED' || status === 'IN_PROGRESS') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (status === 'SKIPPED' || status === 'CANCELED') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
}

function calloutStatusClasses(status: string): string {
  if (status === 'COVERED') return 'bg-green-50 text-green-700 border-green-200';
  if (status === 'ESCALATED' || status === 'UNCOVERED') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
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
  const [activeTab, setActiveTab] = useState<ManagerTab>('board');
  const [offerTargetCalloutId, setOfferTargetCalloutId] = useState<string | null>(null);
  const [offerCandidateId, setOfferCandidateId] = useState('');
  const [offerExpiresMinutes, setOfferExpiresMinutes] = useState(30);
  const [offerSaving, setOfferSaving] = useState(false);
  const [mappingId, setMappingId] = useState('');
  const [periodStart, setPeriodStart] = useState(() => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - 13);
    return start.toISOString().slice(0, 10);
  });
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [previewRunId, setPreviewRunId] = useState('');
  const [exportedFilePath, setExportedFilePath] = useState('');
  const [exportedChecksum, setExportedChecksum] = useState('');
  const [previewSaving, setPreviewSaving] = useState(false);
  const [previewResult, setPreviewResult] = useState<{ run_id: string; rows: Record<string, unknown>[]; row_count: number } | null>(null);
  const [finalizeSaving, setFinalizeSaving] = useState(false);
  const [createMappingSaving, setCreateMappingSaving] = useState(false);
  const [mappingFieldsLoading, setMappingFieldsLoading] = useState(false);
  const [mappingFieldsSaving, setMappingFieldsSaving] = useState(false);
  const [mappingFields, setMappingFields] = useState<PayrollMappingField[]>([]);
  const [newMappingName, setNewMappingName] = useState('');
  const [newMappingProvider, setNewMappingProvider] = useState('');
  const [newMappingDelimiter, setNewMappingDelimiter] = useState(',');
  const [newMappingIncludeHeader, setNewMappingIncludeHeader] = useState(true);
  const [newMappingQuoteAll, setNewMappingQuoteAll] = useState(false);
  const [newMappingDecimalSeparator, setNewMappingDecimalSeparator] = useState('.');
  const [newMappingDateFormat, setNewMappingDateFormat] = useState('YYYY-MM-DD');

  const localeCode = getIntlLocale(locale);
  const roleCode = normalizeRoleCode(role ?? '') ?? (role ?? '').toUpperCase();
  const isFieldRole = FIELD_ROLES.has(roleCode);
  const canManageCoverage = COVERAGE_MANAGER_ROLES.has(roleCode);
  const canManagePayroll = PAYROLL_MANAGER_ROLES.has(roleCode);

  const managerTabs = useMemo(() => {
    const tabs: Array<{ key: ManagerTab; label: string; icon: React.ReactNode }> = [
      { key: 'board', label: t('shiftsTime.tab.board'), icon: <Moon className="h-4 w-4" /> },
      { key: 'routes', label: t('shiftsTime.tab.routes'), icon: <Route className="h-4 w-4" /> },
    ];
    if (canManageCoverage) {
      tabs.push({ key: 'coverage', label: t('shiftsTime.tab.coverage'), icon: <Users2 className="h-4 w-4" /> });
    }
    if (canManagePayroll) {
      tabs.push({ key: 'payroll', label: t('shiftsTime.tab.payroll'), icon: <WalletCards className="h-4 w-4" /> });
    }
    return tabs;
  }, [canManageCoverage, canManagePayroll, t]);

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

  useEffect(() => {
    if (!data?.payroll_mappings?.length) return;
    if (mappingId) return;
    const preferred = data.payroll_mappings.find((row) => row.is_default) ?? data.payroll_mappings[0];
    if (preferred) {
      setMappingId(preferred.id);
    }
  }, [data?.payroll_mappings, mappingId]);

  useEffect(() => {
    if (!canManagePayroll || !mappingId) {
      setMappingFields([]);
      return;
    }

    let canceled = false;
    async function loadFields() {
      setMappingFieldsLoading(true);
      try {
        const headers = await authHeaders();
        const response = await fetch(`/api/operations/shifts-time/payroll/mappings/${encodeURIComponent(mappingId)}/fields`, {
          headers,
          cache: 'no-store',
        });
        const body = await response.json().catch(() => null);
        if (!response.ok || !body?.success) {
          throw new Error(body?.detail ?? body?.title ?? t('shiftsTime.payroll.fieldsLoadError'));
        }
        if (!canceled) {
          setMappingFields((body.data as PayrollMappingField[]) ?? []);
        }
      } catch (error) {
        if (!canceled) {
          setMappingFields([]);
          toast.error(error instanceof Error ? error.message : t('shiftsTime.payroll.fieldsLoadError'));
        }
      } finally {
        if (!canceled) {
          setMappingFieldsLoading(false);
        }
      }
    }

    void loadFields();
    return () => {
      canceled = true;
    };
  }, [canManagePayroll, mappingId, t]);

  useEffect(() => {
    if (isFieldRole) return;
    const allowed = managerTabs.map((entry) => entry.key);
    if (!allowed.includes(activeTab)) {
      setActiveTab('board');
    }
  }, [activeTab, isFieldRole, managerTabs]);

  const executeStopAction = useCallback(async (
    stopId: string,
    action: 'arrive' | 'complete',
    executionSource: StopExecutionSource,
    workTicketId: string | null,
  ) => {
    setActionSaving(true);
    try {
      const headers = await authHeaders();
      headers['Content-Type'] = 'application/json';
      let endpoint = '';
      if (executionSource === 'route_stop') {
        endpoint = action === 'complete'
          ? `/api/operations/shifts-time/stops/${encodeURIComponent(stopId)}/complete`
          : `/api/operations/shifts-time/stops/${encodeURIComponent(stopId)}/start`;
      } else {
        if (!workTicketId) {
          throw new Error(t('shiftsTime.error.action'));
        }
        endpoint = action === 'complete'
          ? `/api/operations/shifts-time/tickets/${encodeURIComponent(workTicketId)}/complete`
          : `/api/operations/shifts-time/tickets/${encodeURIComponent(workTicketId)}/start`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) {
        throw new Error(body?.detail ?? body?.title ?? t('shiftsTime.error.action'));
      }

      toast.success(action === 'complete' ? t('shiftsTime.action.successComplete') : t('shiftsTime.action.successArrive'));
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('shiftsTime.error.action'));
    } finally {
      setActionSaving(false);
    }
  }, [load, t]);

  const executePrimary = useCallback(async () => {
    const nextStop = data?.my_next_stop;
    if (!nextStop) return;
    await executeStopAction(nextStop.stop_id, nextStop.primary_action, nextStop.execution_source, nextStop.work_ticket_id);
  }, [data?.my_next_stop, executeStopAction]);

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
          route_id: data.my_next_stop?.execution_source === 'route_stop' ? data.my_next_stop.route_id : null,
          route_stop_id: data.my_next_stop?.execution_source === 'route_stop' ? data.my_next_stop.stop_id : null,
          work_ticket_id: data.my_next_stop?.execution_source === 'work_ticket' ? data.my_next_stop.work_ticket_id : null,
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
  }, [calloutReason, data?.my_next_stop, data?.my_staff_id, load, t]);

  const offerCoverage = useCallback(async () => {
    if (!offerTargetCalloutId) {
      toast.error(t('shiftsTime.coverage.offerDisabled'));
      return;
    }
    if (!offerCandidateId) {
      toast.error(t('shiftsTime.coverage.noCandidate'));
      return;
    }

    setOfferSaving(true);
    try {
      const headers = await authHeaders();
      headers['Content-Type'] = 'application/json';
      const response = await fetch('/api/operations/shifts-time/callouts/offers', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          callout_event_id: offerTargetCalloutId,
          candidate_staff_id: offerCandidateId,
          expires_in_minutes: Math.max(1, Math.min(1440, offerExpiresMinutes)),
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) {
        throw new Error(body?.detail ?? body?.title ?? t('shiftsTime.coverage.offerError'));
      }

      toast.success(t('shiftsTime.coverage.offerSuccess'));
      setOfferTargetCalloutId(null);
      setOfferCandidateId('');
      setOfferExpiresMinutes(30);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('shiftsTime.coverage.offerError'));
    } finally {
      setOfferSaving(false);
    }
  }, [offerCandidateId, offerExpiresMinutes, offerTargetCalloutId, load, t]);

  const previewPayroll = useCallback(async () => {
    if (!mappingId) {
      toast.error(t('shiftsTime.payroll.noMappings'));
      return;
    }

    setPreviewSaving(true);
    try {
      const headers = await authHeaders();
      headers['Content-Type'] = 'application/json';
      const response = await fetch('/api/operations/shifts-time/payroll/preview', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mapping_id: mappingId,
          period_start: periodStart,
          period_end: periodEnd,
        }),
      });

      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) {
        throw new Error(body?.detail ?? body?.title ?? t('shiftsTime.payroll.previewError'));
      }

      const payload = body.data;
      const runId = typeof payload === 'string'
        ? payload
        : (typeof payload?.run_id === 'string' ? payload.run_id : '');

      if (runId) {
        setPreviewRunId(runId);
      }

      if (payload && typeof payload === 'object' && Array.isArray(payload.rows)) {
        const rows = payload.rows as Record<string, unknown>[];
        setPreviewResult({
          run_id: runId,
          rows,
          row_count: typeof payload.row_count === 'number' ? payload.row_count : rows.length,
        });
      } else {
        setPreviewResult(null);
      }

      toast.success(t('shiftsTime.payroll.previewSuccess'));
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('shiftsTime.payroll.previewError'));
      setPreviewResult(null);
    } finally {
      setPreviewSaving(false);
    }
  }, [load, mappingId, periodEnd, periodStart, t]);

  const finalizePayroll = useCallback(async () => {
    if (!previewRunId) {
      toast.error(t('shiftsTime.payroll.runId'));
      return;
    }

    setFinalizeSaving(true);
    try {
      const headers = await authHeaders();
      headers['Content-Type'] = 'application/json';
      const response = await fetch('/api/operations/shifts-time/payroll/finalize', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          run_id: previewRunId,
          exported_file_path: exportedFilePath || null,
          exported_file_checksum: exportedChecksum || null,
        }),
      });

      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) {
        throw new Error(body?.detail ?? body?.title ?? t('shiftsTime.payroll.finalizeError'));
      }

      toast.success(t('shiftsTime.payroll.finalizeSuccess'));
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('shiftsTime.payroll.finalizeError'));
    } finally {
      setFinalizeSaving(false);
    }
  }, [exportedChecksum, exportedFilePath, load, previewRunId, t]);

  const createPayrollMapping = useCallback(async () => {
    if (!newMappingName.trim()) {
      toast.error(t('shiftsTime.payroll.mappingNameRequired'));
      return;
    }

    setCreateMappingSaving(true);
    try {
      const headers = await authHeaders();
      headers['Content-Type'] = 'application/json';
      const response = await fetch('/api/operations/shifts-time/payroll/mappings', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          template_name: newMappingName.trim(),
          provider_code: newMappingProvider.trim() || null,
          delimiter: newMappingDelimiter,
          include_header: newMappingIncludeHeader,
          quote_all: newMappingQuoteAll,
          decimal_separator: newMappingDecimalSeparator,
          date_format: newMappingDateFormat.trim() || 'YYYY-MM-DD',
        }),
      });

      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) {
        throw new Error(body?.detail ?? body?.title ?? t('shiftsTime.payroll.mappingCreateError'));
      }

      const createdMappingId = (body.data as { id?: string } | null)?.id ?? '';
      toast.success(t('shiftsTime.payroll.mappingCreateSuccess'));
      setNewMappingName('');
      setNewMappingProvider('');
      setNewMappingDelimiter(',');
      setNewMappingIncludeHeader(true);
      setNewMappingQuoteAll(false);
      setNewMappingDecimalSeparator('.');
      setNewMappingDateFormat('YYYY-MM-DD');
      await load();
      if (createdMappingId) {
        setMappingId(createdMappingId);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('shiftsTime.payroll.mappingCreateError'));
    } finally {
      setCreateMappingSaving(false);
    }
  }, [
    load,
    newMappingDateFormat,
    newMappingDecimalSeparator,
    newMappingDelimiter,
    newMappingIncludeHeader,
    newMappingName,
    newMappingProvider,
    newMappingQuoteAll,
    t,
  ]);

  const addMappingField = useCallback(() => {
    setMappingFields((current) => ([
      ...current,
      {
        id: `draft-${crypto.randomUUID()}`,
        mapping_id: mappingId,
        sort_order: current.length + 1,
        output_column_name: '',
        source_field: PAYROLL_SOURCE_FIELDS[0] ?? null,
        static_value: null,
        transform_config: null,
        is_required: false,
        is_enabled: true,
      },
    ]));
  }, [mappingId]);

  const updateMappingField = useCallback((index: number, patch: Partial<PayrollMappingField>) => {
    setMappingFields((current) => current.map((field, idx) => (idx === index ? { ...field, ...patch } : field)));
  }, []);

  const removeMappingField = useCallback((index: number) => {
    setMappingFields((current) => current
      .filter((_, idx) => idx !== index)
      .map((field, idx) => ({ ...field, sort_order: idx + 1 })));
  }, []);

  const saveMappingFields = useCallback(async () => {
    if (!mappingId) {
      toast.error(t('shiftsTime.payroll.noMappings'));
      return;
    }
    if (!mappingFields.length) {
      toast.error(t('shiftsTime.payroll.fieldsRequired'));
      return;
    }

    setMappingFieldsSaving(true);
    try {
      const headers = await authHeaders();
      headers['Content-Type'] = 'application/json';
      const payload = {
        fields: mappingFields.map((field) => ({
          output_column_name: field.output_column_name,
          source_field: field.source_field,
          static_value: field.static_value,
          transform_config: field.transform_config,
          is_required: field.is_required,
          is_enabled: field.is_enabled,
        })),
      };
      const response = await fetch(`/api/operations/shifts-time/payroll/mappings/${encodeURIComponent(mappingId)}/fields`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) {
        throw new Error(body?.detail ?? body?.title ?? t('shiftsTime.payroll.fieldsSaveError'));
      }

      setMappingFields((body.data as PayrollMappingField[]) ?? []);
      toast.success(t('shiftsTime.payroll.fieldsSaveSuccess'));
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('shiftsTime.payroll.fieldsSaveError'));
    } finally {
      setMappingFieldsSaving(false);
    }
  }, [load, mappingFields, mappingId, t]);

  const filteredSites = useMemo(() => {
    const rows = data?.site_summaries ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => row.site_name.toLowerCase().includes(q) || row.site_code.toLowerCase().includes(q));
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

  const filteredRoutes = useMemo(() => {
    const rows = data?.route_summaries ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((route) => {
      const owner = route.route_owner_name?.toLowerCase() ?? '';
      if (owner.includes(q)) return true;
      return route.stops.some((stop) => {
        const siteName = stop.site_name?.toLowerCase() ?? '';
        const siteCode = stop.site_code?.toLowerCase() ?? '';
        const jobCode = stop.job_code?.toLowerCase() ?? '';
        return siteName.includes(q) || siteCode.includes(q) || jobCode.includes(q);
      });
    });
  }, [data?.route_summaries, search]);

  const filteredCallouts = useMemo(() => {
    const rows = data?.recent_callouts ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const site = row.site_name?.toLowerCase() ?? '';
      const staff = row.affected_staff_name?.toLowerCase() ?? '';
      const reason = row.reason.toLowerCase();
      return site.includes(q) || staff.includes(q) || reason.includes(q);
    });
  }, [data?.recent_callouts, search]);

  const offerTargetCallout = useMemo(
    () => (data?.recent_callouts ?? []).find((row) => row.id === offerTargetCalloutId) ?? null,
    [data?.recent_callouts, offerTargetCalloutId],
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </CardContent>
      </Card>
    );
  }

  const calloutAutomationEnabled = Boolean(data?.features?.callout_automation);
  const payrollEnabled = Boolean(data?.features?.payroll_export);
  const routeExecutionEnabled = Boolean(data?.features?.route_execution);

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
                  disabled={actionSaving || !routeExecutionEnabled}
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
                        disabled={!calloutAutomationEnabled}
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
                            disabled={calloutSaving || !calloutAutomationEnabled}
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
        <div className="space-y-4">
          <ChipTabs
            tabs={managerTabs.map((tab) => ({
              key: tab.key,
              label: tab.label,
              icon: tab.icon,
            }))}
            active={activeTab}
            onChange={(value) => setActiveTab(value as ManagerTab)}
          />

          {activeTab === 'board' && (
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

          {activeTab === 'routes' && (
            <Card>
              <CardHeader className="pb-3">
                <h4 className="text-base font-semibold text-foreground">{t('shiftsTime.routes.title')}</h4>
                <p className="text-xs text-muted-foreground">{routeExecutionEnabled ? t('shiftsTime.routes.help') : t('shiftsTime.routes.featureOff')}</p>
              </CardHeader>
              <CardContent>
                {filteredRoutes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('shiftsTime.routes.empty')}</p>
                ) : (
                  <div className="space-y-3">
                    {filteredRoutes.map((route) => (
                      <article key={route.route_id} className="rounded-lg border border-border bg-background p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {t('shiftsTime.routes.routeBy', { owner: route.route_owner_name ?? t('shiftsTime.unknown') })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t('shiftsTime.routes.stopsCount', { count: route.stops.length })} · {route.route_date}
                            </p>
                          </div>
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${stopStatusClasses(route.route_status)}`}>
                            {t(`shiftsTime.routeStatus.${route.route_status}`)}
                          </span>
                        </div>

                        <div className="mt-3 space-y-2">
                          {route.stops.map((stop) => {
                            const actionable = stop.stop_status === 'PENDING' || stop.stop_status === 'ARRIVED' || stop.stop_status === 'IN_PROGRESS';
                            return (
                              <div key={stop.stop_id} className="rounded-md border border-border px-3 py-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div>
                                    <p className="text-sm font-medium text-foreground">{stop.stop_order}. {stop.site_code ?? '--'} - {stop.site_name ?? t('shiftsTime.unknown')}</p>
                                    <p className="text-xs text-muted-foreground">{formatWindow(stop.planned_start_at, stop.planned_end_at, localeCode)} · {stop.job_code ?? t('shiftsTime.unknown')}</p>
                                  </div>
                                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${stopStatusClasses(stop.stop_status)}`}>
                                    {t(`shiftsTime.stopStatus.${stop.stop_status}`)}
                                  </span>
                                </div>
                                {actionable && (
                                  <div className="mt-2">
                                    <Button
                                      size="sm"
                                      onClick={() => void executeStopAction(stop.stop_id, stop.primary_action, stop.execution_source, stop.work_ticket_id)}
                                      disabled={actionSaving || !routeExecutionEnabled}
                                    >
                                      {stop.primary_action === 'complete' ? t('shiftsTime.action.complete') : t('shiftsTime.action.arrive')}
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'coverage' && canManageCoverage && (
            <Card>
              <CardHeader className="pb-3">
                <h4 className="text-base font-semibold text-foreground">{t('shiftsTime.coverage.title')}</h4>
                <p className="text-xs text-muted-foreground">{calloutAutomationEnabled ? t('shiftsTime.coverage.help') : t('shiftsTime.coverage.featureOff')}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredCallouts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('shiftsTime.coverage.empty')}</p>
                ) : (
                  filteredCallouts.map((callout) => (
                    <article key={callout.id} className="rounded-lg border border-border bg-background p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{callout.site_code ?? '--'} - {callout.site_name ?? t('shiftsTime.unknown')}</p>
                          <p className="text-xs text-muted-foreground">{t('shiftsTime.coverage.affected')}: {callout.affected_staff_name ?? t('shiftsTime.unknown')}</p>
                          <p className="text-xs text-muted-foreground">{t('shiftsTime.coverage.reported')}: {formatDateTime(callout.reported_at, localeCode)}</p>
                        </div>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${calloutStatusClasses(callout.status)}`}>
                          {t(`shiftsTime.calloutStatus.${callout.status}`)}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>{t('shiftsTime.coverage.reason')}: {t(`shiftsTime.callout.reason.${callout.reason}`)}</span>
                        <span>{t('shiftsTime.coverage.escalation')}: {callout.escalation_level}</span>
                      </div>

                      <div className="mt-3">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setOfferTargetCalloutId(callout.id);
                            if (!offerCandidateId && data?.coverage_candidates?.[0]) {
                              setOfferCandidateId(data.coverage_candidates[0].staff_id);
                            }
                          }}
                          disabled={!calloutAutomationEnabled}
                        >
                          {t('shiftsTime.coverage.findCover')}
                        </Button>
                      </div>
                    </article>
                  ))
                )}

                {offerTargetCallout && (
                  <div className="rounded-lg border border-border bg-background p-3 space-y-3">
                    <p className="text-sm font-medium text-foreground">
                      {t('shiftsTime.coverage.offerFor', {
                        site: offerTargetCallout.site_name ?? t('shiftsTime.unknown'),
                        staff: offerTargetCallout.affected_staff_name ?? t('shiftsTime.unknown'),
                      })}
                    </p>

                    <div className="space-y-2">
                      <label htmlFor="coverage-candidate" className="block text-xs font-medium text-muted-foreground">
                        {t('shiftsTime.coverage.candidateLabel')}
                      </label>
                      <select
                        id="coverage-candidate"
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={offerCandidateId}
                        onChange={(event) => setOfferCandidateId(event.target.value)}
                        disabled={offerSaving}
                      >
                        <option value="">{t('shiftsTime.coverage.noCandidate')}</option>
                        {(data?.coverage_candidates ?? []).map((candidate) => (
                          <option key={candidate.staff_id} value={candidate.staff_id}>
                            {candidate.full_name ?? t('shiftsTime.unknown')} {candidate.staff_code ? `(${candidate.staff_code})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="coverage-expiry" className="block text-xs font-medium text-muted-foreground">
                        {t('shiftsTime.coverage.expiresLabel')}
                      </label>
                      <input
                        id="coverage-expiry"
                        type="number"
                        min={1}
                        max={1440}
                        value={offerExpiresMinutes}
                        onChange={(event) => setOfferExpiresMinutes(Number(event.target.value) || 30)}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        disabled={offerSaving}
                      />
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button type="button" onClick={() => void offerCoverage()} disabled={offerSaving || !calloutAutomationEnabled}>
                        {offerSaving ? t('shiftsTime.coverage.offering') : t('shiftsTime.coverage.offer')}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setOfferTargetCalloutId(null);
                          setOfferCandidateId('');
                        }}
                        disabled={offerSaving}
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'payroll' && canManagePayroll && (
            <Card>
              <CardHeader className="pb-3">
                <h4 className="text-base font-semibold text-foreground">{t('shiftsTime.payroll.title')}</h4>
                <p className="text-xs text-muted-foreground">{payrollEnabled ? t('shiftsTime.payroll.help') : t('shiftsTime.payroll.featureOff')}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-border bg-background p-3 space-y-3">
                  <p className="text-sm font-medium text-foreground">{t('shiftsTime.payroll.mappingCreateTitle')}</p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="payroll-new-mapping-name" className="block text-xs font-medium text-muted-foreground">
                        {t('shiftsTime.payroll.mappingName')}
                      </label>
                      <input
                        id="payroll-new-mapping-name"
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={newMappingName}
                        onChange={(event) => setNewMappingName(event.target.value)}
                        disabled={createMappingSaving}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="payroll-new-mapping-provider" className="block text-xs font-medium text-muted-foreground">
                        {t('shiftsTime.payroll.mappingProvider')}
                      </label>
                      <input
                        id="payroll-new-mapping-provider"
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={newMappingProvider}
                        onChange={(event) => setNewMappingProvider(event.target.value)}
                        disabled={createMappingSaving}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                    <div className="space-y-2">
                      <label htmlFor="payroll-new-mapping-delimiter" className="block text-xs font-medium text-muted-foreground">
                        {t('shiftsTime.payroll.delimiter')}
                      </label>
                      <select
                        id="payroll-new-mapping-delimiter"
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={newMappingDelimiter}
                        onChange={(event) => setNewMappingDelimiter(event.target.value)}
                        disabled={createMappingSaving}
                      >
                        <option value=",">,</option>
                        <option value=";">;</option>
                        <option value={'\t'}>{t('shiftsTime.payroll.tabDelimiter')}</option>
                        <option value="|">|</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="payroll-new-mapping-decimal" className="block text-xs font-medium text-muted-foreground">
                        {t('shiftsTime.payroll.decimalSeparator')}
                      </label>
                      <select
                        id="payroll-new-mapping-decimal"
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={newMappingDecimalSeparator}
                        onChange={(event) => setNewMappingDecimalSeparator(event.target.value)}
                        disabled={createMappingSaving}
                      >
                        <option value=".">.</option>
                        <option value=",">,</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="payroll-new-mapping-date-format" className="block text-xs font-medium text-muted-foreground">
                        {t('shiftsTime.payroll.dateFormat')}
                      </label>
                      <input
                        id="payroll-new-mapping-date-format"
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={newMappingDateFormat}
                        onChange={(event) => setNewMappingDateFormat(event.target.value)}
                        disabled={createMappingSaving}
                      />
                    </div>
                    <div className="flex flex-col justify-end gap-2">
                      <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={newMappingIncludeHeader}
                          onChange={(event) => setNewMappingIncludeHeader(event.target.checked)}
                          disabled={createMappingSaving}
                        />
                        {t('shiftsTime.payroll.includeHeader')}
                      </label>
                      <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={newMappingQuoteAll}
                          onChange={(event) => setNewMappingQuoteAll(event.target.checked)}
                          disabled={createMappingSaving}
                        />
                        {t('shiftsTime.payroll.quoteAll')}
                      </label>
                    </div>
                  </div>
                  <div>
                    <Button type="button" onClick={() => void createPayrollMapping()} disabled={createMappingSaving || !payrollEnabled}>
                      {createMappingSaving ? t('shiftsTime.payroll.mappingCreating') : t('shiftsTime.payroll.mappingCreate')}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="space-y-2">
                    <label htmlFor="payroll-mapping" className="block text-xs font-medium text-muted-foreground">
                      {t('shiftsTime.payroll.mappingLabel')}
                    </label>
                    <select
                      id="payroll-mapping"
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={mappingId}
                      onChange={(event) => { setMappingId(event.target.value); setPreviewResult(null); }}
                      disabled={previewSaving || finalizeSaving}
                    >
                      <option value="">{t('shiftsTime.payroll.noMappings')}</option>
                      {(data?.payroll_mappings ?? []).map((mapping) => (
                        <option key={mapping.id} value={mapping.id}>
                          {mapping.template_name}{mapping.provider_code ? ` (${mapping.provider_code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="payroll-period-start" className="block text-xs font-medium text-muted-foreground">
                      {t('shiftsTime.payroll.periodStart')}
                    </label>
                    <input
                      id="payroll-period-start"
                      type="date"
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={periodStart}
                      onChange={(event) => setPeriodStart(event.target.value)}
                      disabled={previewSaving || finalizeSaving}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="payroll-period-end" className="block text-xs font-medium text-muted-foreground">
                      {t('shiftsTime.payroll.periodEnd')}
                    </label>
                    <input
                      id="payroll-period-end"
                      type="date"
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={periodEnd}
                      onChange={(event) => setPeriodEnd(event.target.value)}
                      disabled={previewSaving || finalizeSaving}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="payroll-run-id" className="block text-xs font-medium text-muted-foreground">
                      {t('shiftsTime.payroll.runId')}
                    </label>
                    <input
                      id="payroll-run-id"
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={previewRunId}
                      onChange={(event) => setPreviewRunId(event.target.value)}
                      placeholder={t('shiftsTime.payroll.runId')}
                      disabled={finalizeSaving}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="payroll-export-path" className="block text-xs font-medium text-muted-foreground">
                      {t('shiftsTime.payroll.exportPath')}
                    </label>
                    <input
                      id="payroll-export-path"
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={exportedFilePath}
                      onChange={(event) => setExportedFilePath(event.target.value)}
                      placeholder="exports/payroll.csv"
                      disabled={finalizeSaving}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="payroll-export-checksum" className="block text-xs font-medium text-muted-foreground">
                    {t('shiftsTime.payroll.exportChecksum')}
                  </label>
                  <input
                    id="payroll-export-checksum"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={exportedChecksum}
                    onChange={(event) => setExportedChecksum(event.target.value)}
                    placeholder="sha256"
                    disabled={finalizeSaving}
                  />
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" onClick={() => void previewPayroll()} disabled={previewSaving || !payrollEnabled}>
                    {previewSaving ? t('shiftsTime.payroll.previewing') : t('shiftsTime.payroll.preview')}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => void finalizePayroll()} disabled={finalizeSaving || !payrollEnabled}>
                    {finalizeSaving ? t('shiftsTime.payroll.finalizing') : t('shiftsTime.payroll.finalize')}
                  </Button>
                </div>

                {previewResult && previewResult.rows.length > 0 && (() => {
                  const columns = Object.keys(previewResult.rows[0] ?? {});
                  return (
                    <div className="rounded-lg border border-border bg-background p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">
                          {t('shiftsTime.payroll.previewResultsTitle')} ({t('shiftsTime.payroll.previewRowCount', { count: previewResult.row_count })})
                        </p>
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => setPreviewResult(null)}
                        >
                          {t('common.dismiss')}
                        </button>
                      </div>
                      <div className="overflow-x-auto max-h-64 overflow-y-auto rounded-md border border-border">
                        <table className="min-w-full text-xs">
                          <thead className="sticky top-0 bg-muted">
                            <tr>
                              {columns.map((col) => (
                                <th key={col} className="whitespace-nowrap px-3 py-2 text-left font-medium text-foreground border-b border-border">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewResult.rows.slice(0, 50).map((row, rowIndex) => (
                              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                                {columns.map((col) => (
                                  <td key={col} className="whitespace-nowrap px-3 py-1.5 text-muted-foreground border-b border-border">
                                    {row[col] != null ? String(row[col]) : ''}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {previewResult.rows.length > 50 && (
                        <p className="text-xs text-muted-foreground">
                            {t('shiftsTime.payroll.previewShowingRows', { count: previewResult.row_count })}
                        </p>
                      )}
                    </div>
                  );
                })()}

                {previewResult && previewResult.rows.length === 0 && (
                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="text-sm text-muted-foreground">
                      {t('shiftsTime.payroll.previewEmpty')}
                    </p>
                  </div>
                )}

                <div className="rounded-lg border border-border bg-background p-3 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{t('shiftsTime.payroll.fieldsTitle')}</p>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="secondary" size="sm" onClick={addMappingField} disabled={!mappingId || mappingFieldsSaving || mappingFieldsLoading}>
                        {t('shiftsTime.payroll.fieldAdd')}
                      </Button>
                      <Button type="button" size="sm" onClick={() => void saveMappingFields()} disabled={!mappingId || mappingFieldsSaving || mappingFieldsLoading || !payrollEnabled}>
                        {mappingFieldsSaving ? t('shiftsTime.payroll.fieldsSaving') : t('shiftsTime.payroll.fieldsSave')}
                      </Button>
                    </div>
                  </div>

                  {mappingFieldsLoading ? (
                    <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
                  ) : !mappingId ? (
                    <p className="text-sm text-muted-foreground">{t('shiftsTime.payroll.noMappings')}</p>
                  ) : mappingFields.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('shiftsTime.payroll.fieldsEmpty')}</p>
                  ) : (
                    <div className="space-y-2">
                      {mappingFields.map((field, index) => (
                        <div key={field.id} className="rounded-md border border-border px-3 py-3 space-y-2">
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                            <div className="space-y-1">
                              <label className="block text-xs text-muted-foreground">{t('shiftsTime.payroll.columnLabel')}</label>
                              <input
                                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                                value={field.output_column_name}
                                onChange={(event) => updateMappingField(index, { output_column_name: event.target.value })}
                                disabled={mappingFieldsSaving}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-xs text-muted-foreground">{t('shiftsTime.payroll.sourceLabel')}</label>
                              <select
                                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                                value={field.source_field ?? ''}
                                onChange={(event) => updateMappingField(index, { source_field: event.target.value || null })}
                                disabled={mappingFieldsSaving}
                              >
                                <option value="">{t('shiftsTime.payroll.sourceNone')}</option>
                                {PAYROLL_SOURCE_FIELDS.map((sourceField) => (
                                  <option key={sourceField} value={sourceField}>{sourceField}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="block text-xs text-muted-foreground">{t('shiftsTime.payroll.staticLabel')}</label>
                              <input
                                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                                value={field.static_value ?? ''}
                                onChange={(event) => updateMappingField(index, { static_value: event.target.value || null })}
                                disabled={mappingFieldsSaving}
                              />
                            </div>
                            <div className="flex items-end justify-end">
                              <Button type="button" variant="secondary" size="sm" onClick={() => removeMappingField(index)} disabled={mappingFieldsSaving}>
                                {t('shiftsTime.payroll.fieldRemove')}
                              </Button>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                              <input
                                type="checkbox"
                                checked={field.is_required}
                                onChange={(event) => updateMappingField(index, { is_required: event.target.checked })}
                                disabled={mappingFieldsSaving}
                              />
                              {t('shiftsTime.payroll.requiredLabel')}
                            </label>
                            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                              <input
                                type="checkbox"
                                checked={field.is_enabled}
                                onChange={(event) => updateMappingField(index, { is_enabled: event.target.checked })}
                                disabled={mappingFieldsSaving}
                              />
                              {t('shiftsTime.payroll.enabledLabel')}
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">{t('shiftsTime.payroll.recentRuns')}</p>
                  {data?.payroll_runs?.length ? (
                    <div className="space-y-2">
                      {data.payroll_runs.map((run) => (
                        <div key={run.id} className="rounded-md border border-border px-3 py-2 text-xs">
                          <p className="font-medium text-foreground">{run.mapping_name ?? t('shiftsTime.unknown')}</p>
                          <p className="text-muted-foreground">
                            {run.period_start} - {run.period_end} · {t(`shiftsTime.payroll.status.${run.status}`)}
                          </p>
                          <p className="text-muted-foreground">{run.id}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('shiftsTime.payroll.noRuns')}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
