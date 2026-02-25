'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  ClipboardList,
  CreditCard,
  FileText,
  Layers3,
  Plus,
  Trash2,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm, assertUpdateSucceeded } from '@/hooks/use-form';
import { siteJobSchema, type SiteJobFormData } from '@gleamops/shared';
import {
  SlideOver,
  Input,
  Select,
  Textarea,
  Button,
  FormWizard,
  useWizardSteps,
  FormSection,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  cn,
} from '@gleamops/ui';
import type { WizardStep } from '@gleamops/ui';
import type { SiteJob } from '@gleamops/shared';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'CANCELED', label: 'Canceled' },
  { value: 'COMPLETED', label: 'Completed' },
];

const FREQUENCY_OPTIONS = [
  { value: 'DAILY', label: 'Daily' },
  { value: '2X_WEEK', label: '2x Week' },
  { value: '3X_WEEK', label: '3x Week' },
  { value: '5X_WEEK', label: '5x Week' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Bi-Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'AS_NEEDED', label: 'One-Time' },
];

const BILLING_PERIOD_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'PER_VISIT', label: 'Per Visit' },
  { value: 'FLAT_RATE', label: 'Per Month' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const PRIORITY_BADGE_COLORS: Record<string, 'gray' | 'blue' | 'yellow' | 'orange' | 'red'> = {
  LOW: 'gray',
  MEDIUM: 'blue',
  HIGH: 'orange',
  CRITICAL: 'red',
};

const JOB_TYPE_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'CONTRACT_CLEANING', label: 'Contract Cleaning' },
  { value: 'DAY_PORTER', label: 'Day Porter' },
  { value: 'FLOOR_CARE', label: 'Floor Care' },
  { value: 'SPECIALTY', label: 'Specialty' },
  { value: 'DEEP_CLEAN', label: 'Deep Clean' },
  { value: 'POST_CONSTRUCTION', label: 'Post Construction' },
  { value: 'OTHER', label: 'Other' },
];

const DAY_OPTIONS = [
  { code: 'MON', label: 'Mon' },
  { code: 'TUE', label: 'Tue' },
  { code: 'WED', label: 'Wed' },
  { code: 'THU', label: 'Thu' },
  { code: 'FRI', label: 'Fri' },
  { code: 'SAT', label: 'Sat' },
  { code: 'SUN', label: 'Sun' },
];

const VISITS_PER_MONTH: Record<string, number> = {
  DAILY: 30,
  '2X_WEEK': 8.7,
  '3X_WEEK': 13,
  '5X_WEEK': 21.7,
  WEEKLY: 4.3,
  BIWEEKLY: 2.2,
  MONTHLY: 1,
  AS_NEEDED: 1,
};

const DEFAULTS: SiteJobFormData = {
  job_code: '',
  job_name: '',
  site_id: '',
  service_id: null,
  status: 'ACTIVE',
  frequency: 'WEEKLY',
  schedule_days: null,
  start_time: null,
  end_time: null,
  staff_needed: null,
  start_date: null,
  end_date: null,
  billing_uom: null,
  billing_amount: null,
  job_assigned_to: null,
  subcontractor_id: null,
  invoice_description: null,
  job_type: null,
  priority_level: null,
  estimated_hours_per_service: null,
  specifications: null,
  special_requirements: null,
  notes: null,
};

const WIZARD_STEPS: WizardStep[] = [
  { id: 'assignment', title: 'Assignment' },
  { id: 'schedule-billing', title: 'Schedule & Billing' },
  { id: 'tasks-details', title: 'Tasks & Details' },
];

interface JobFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: SiteJob | null;
  onSuccess?: () => void;
  preselectedSiteId?: string;
  focusSection?: 'assignment' | 'schedule' | 'tasks';
}

interface SiteOption {
  value: string;
  siteName: string;
  label: string;
  clientId: string | null;
  siteCode: string | null;
  janitorialClosetLocation: string | null;
  supplyStorageLocation: string | null;
  waterSourceLocation: string | null;
  dumpsterLocation: string | null;
  entryInstructions: string | null;
  securityProtocol: string | null;
  parkingInstructions: string | null;
  accessNotes: string | null;
}

interface SiteBlueprintDraft {
  securityProtocol: string;
  janitorialClosetLocation: string;
  supplyStorageLocation: string;
  waterSourceLocation: string;
  dumpsterLocation: string;
  entryInstructions: string;
  parkingInstructions: string;
  accessNotes: string;
}

interface TaskCatalogRow {
  id: string;
  task_code: string;
  name: string;
  category: string | null;
  subcategory: string | null;
  priority_level: string | null;
  default_minutes: number | null;
}

interface SelectedTask {
  taskId: string;
  taskCode: string;
  name: string;
  minutesPerVisit: number;
  quantity: number;
}

const EMPTY_SITE_BLUEPRINT_DRAFT: SiteBlueprintDraft = {
  securityProtocol: '',
  janitorialClosetLocation: '',
  supplyStorageLocation: '',
  waterSourceLocation: '',
  dumpsterLocation: '',
  entryInstructions: '',
  parkingInstructions: '',
  accessNotes: '',
};

function parseDayCodes(scheduleDays: string | null): string[] {
  if (!scheduleDays) return [];
  const alias: Record<string, string> = {
    MONDAY: 'MON',
    MON: 'MON',
    TUESDAY: 'TUE',
    TUES: 'TUE',
    TUE: 'TUE',
    WEDNESDAY: 'WED',
    WED: 'WED',
    THURSDAY: 'THU',
    THURS: 'THU',
    THU: 'THU',
    FRIDAY: 'FRI',
    FRI: 'FRI',
    SATURDAY: 'SAT',
    SAT: 'SAT',
    SUNDAY: 'SUN',
    SUN: 'SUN',
  };
  const ordered = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const parsed = scheduleDays
    .split(/[,\s]+/g)
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean)
    .map((t) => alias[t] ?? t)
    .filter((t) => ordered.includes(t));
  return ordered.filter((d) => parsed.includes(d));
}

function serializeDayCodes(dayCodes: string[]): string | null {
  if (!dayCodes.length) return null;
  const labelMap = new Map(DAY_OPTIONS.map((d) => [d.code, d.label]));
  return dayCodes.map((c) => labelMap.get(c) ?? c).join(', ');
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(n);
}

export function JobForm({ open, onClose, initialData, onSuccess, preselectedSiteId, focusSection }: JobFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();
  const wizard = useWizardSteps(WIZARD_STEPS.length);

  const [sites, setSites] = useState<SiteOption[]>([]);
  const [clients, setClients] = useState<{ value: string; label: string }[]>([]);
  const [services, setServices] = useState<{ value: string; label: string }[]>([]);
  const [assignmentOptions, setAssignmentOptions] = useState<{ value: string; label: string }[]>([
    { value: '', label: 'Unassigned' },
    { value: 'Day Team', label: 'Day Team' },
    { value: 'Night Team', label: 'Night Team' },
  ]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [taskCatalog, setTaskCatalog] = useState<TaskCatalogRow[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<SelectedTask[]>([]);
  const [taskSelectId, setTaskSelectId] = useState<string>('');
  const [taskQuantity, setTaskQuantity] = useState<number>(1);
  const [taskCatalogOpen, setTaskCatalogOpen] = useState(false);
  const [taskCatalogSearch, setTaskCatalogSearch] = useState('');
  const [selectedCatalogTaskIds, setSelectedCatalogTaskIds] = useState<string[]>([]);
  const [hourlyCostRate, setHourlyCostRate] = useState<number>(25);
  const [loadingServiceTemplate, setLoadingServiceTemplate] = useState(false);
  const [codeGenerationFailed, setCodeGenerationFailed] = useState(false);
  const [siteBlueprintDraft, setSiteBlueprintDraft] = useState<SiteBlueprintDraft>(EMPTY_SITE_BLUEPRINT_DRAFT);

  const initialValues = useMemo<SiteJobFormData>(() => {
    return initialData
      ? {
          job_code: initialData.job_code,
          job_name: initialData.job_name ?? '',
          site_id: initialData.site_id,
          service_id: initialData.service_id,
          status: initialData.status,
          frequency: initialData.frequency,
          schedule_days: initialData.schedule_days,
          start_time: initialData.start_time,
          end_time: initialData.end_time,
          staff_needed: initialData.staff_needed,
          start_date: initialData.start_date,
          end_date: initialData.end_date,
          billing_uom: initialData.billing_uom,
          billing_amount: initialData.billing_amount,
          job_assigned_to: initialData.job_assigned_to,
          subcontractor_id: initialData.subcontractor_id,
          invoice_description: initialData.invoice_description,
          job_type: initialData.job_type,
          priority_level: initialData.priority_level,
          estimated_hours_per_service: initialData.estimated_hours_per_service,
          specifications: initialData.specifications,
          special_requirements: initialData.special_requirements,
          notes: initialData.notes,
        }
      : { ...DEFAULTS, site_id: preselectedSiteId ?? '' };
  }, [initialData, preselectedSiteId]);

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<SiteJobFormData>({
    schema: siteJobSchema,
    initialValues,
    onSubmit: async (data) => {
      const siteBlueprintPayload = data.site_id
        ? {
            security_protocol: siteBlueprintDraft.securityProtocol.trim() || null,
            janitorial_closet_location: siteBlueprintDraft.janitorialClosetLocation.trim() || null,
            supply_storage_location: siteBlueprintDraft.supplyStorageLocation.trim() || null,
            water_source_location: siteBlueprintDraft.waterSourceLocation.trim() || null,
            dumpster_location: siteBlueprintDraft.dumpsterLocation.trim() || null,
            entry_instructions: siteBlueprintDraft.entryInstructions.trim() || null,
            parking_instructions: siteBlueprintDraft.parkingInstructions.trim() || null,
            access_notes: siteBlueprintDraft.accessNotes.trim() || null,
          }
        : null;

      if (isEdit) {
        const { job_code, ...fields } = data;
        void job_code;
        const result = await supabase
          .from('site_jobs')
          .update(fields)
          .eq('id', initialData!.id)
          .eq('version_etag', initialData!.version_etag)
          .select();
        assertUpdateSucceeded(result);
      } else {
        const user = (await supabase.auth.getUser()).data.user;
        const tenantId = user?.app_metadata?.tenant_id as string | undefined;
        const { data: created, error } = await supabase
          .from('site_jobs')
          .insert({
            ...data,
            tenant_id: tenantId,
          })
          .select('id')
          .single();
        if (error) throw error;

        if (created?.id && selectedTasks.length > 0) {
          const rows = selectedTasks.map((t, index) => ({
            tenant_id: tenantId,
            job_id: created.id,
            task_id: t.taskId,
            sequence_order: index + 1,
            is_required: true,
            custom_minutes: Math.max(0.25, Number((t.minutesPerVisit * t.quantity).toFixed(2))),
            estimated_minutes: Math.max(0.25, Number((t.minutesPerVisit * t.quantity).toFixed(2))),
            planned_minutes: Math.max(1, Math.round(t.minutesPerVisit * t.quantity)),
            status: 'PENDING',
          }));

          const { error: taskInsertError } = await supabase.from('job_tasks').insert(rows);
          if (taskInsertError) {
            toast.warning('Job created, but task rows could not be saved. You can add tasks from the Job detail page.');
          }
        }
      }

      if (siteBlueprintPayload && data.site_id) {
        const { error: siteBlueprintError } = await supabase
          .from('sites')
          .update(siteBlueprintPayload)
          .eq('id', data.site_id);

        if (siteBlueprintError) {
          toast.warning('Service plan saved, but site blueprint updates could not be synced.');
        } else {
          setSites((previous) =>
            previous.map((site) => (
              site.value === data.site_id
                ? {
                    ...site,
                    securityProtocol: siteBlueprintPayload.security_protocol,
                    janitorialClosetLocation: siteBlueprintPayload.janitorial_closet_location,
                    supplyStorageLocation: siteBlueprintPayload.supply_storage_location,
                    waterSourceLocation: siteBlueprintPayload.water_source_location,
                    dumpsterLocation: siteBlueprintPayload.dumpster_location,
                    entryInstructions: siteBlueprintPayload.entry_instructions,
                    parkingInstructions: siteBlueprintPayload.parking_instructions,
                    accessNotes: siteBlueprintPayload.access_notes,
                  }
                : site
            )),
          );
        }
      }

      onSuccess?.();
      handleClose();
    },
  });

  useEffect(() => {
    if (!open) return;
    reset(initialValues);
    wizard.reset();
    setCodeGenerationFailed(false);
    setTaskSelectId('');
    setTaskQuantity(1);
    setTaskCatalogOpen(false);
    setTaskCatalogSearch('');
    setSelectedCatalogTaskIds([]);
    setSelectedTasks([]);
    setHourlyCostRate(25);
    setSiteBlueprintDraft(EMPTY_SITE_BLUEPRINT_DRAFT);
  }, [open, reset, initialValues]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;

    Promise.all([
      supabase.from('clients').select('id, name, client_code').is('archived_at', null).order('name'),
      supabase
        .from('sites')
        .select(`
          id,
          name,
          site_code,
          client_id,
          janitorial_closet_location,
          supply_storage_location,
          water_source_location,
          dumpster_location,
          entry_instructions,
          security_protocol,
          parking_instructions,
          access_notes
        `)
        .is('archived_at', null)
        .order('name'),
      supabase.from('services').select('id, name, service_code').is('archived_at', null).order('name'),
      supabase
        .from('staff')
        .select('full_name, staff_code, role')
        .is('archived_at', null)
        .in('role', ['SUPERVISOR', 'MANAGER', 'OWNER_ADMIN'])
        .order('full_name'),
      supabase
        .from('tasks')
        .select('id, task_code, name, category, subcategory, priority_level, default_minutes')
        .is('archived_at', null)
        .eq('is_active', true)
        .order('name'),
    ]).then(([clientsRes, sitesRes, servicesRes, staffRes, tasksRes]) => {
      if (clientsRes.data) {
        setClients(
          clientsRes.data.map((c) => ({
            value: c.id,
            label: `${c.name} (${c.client_code})`,
          }))
        );
      }

      if (sitesRes.data) {
        setSites(
          sitesRes.data.map((s) => ({
            value: s.id,
            siteName: s.name,
            label: `${s.name} (${s.site_code})`,
            clientId: (s as { client_id: string | null }).client_id,
            siteCode: (s as { site_code: string | null }).site_code,
            janitorialClosetLocation: (s as { janitorial_closet_location: string | null }).janitorial_closet_location,
            supplyStorageLocation: (s as { supply_storage_location: string | null }).supply_storage_location,
            waterSourceLocation: (s as { water_source_location: string | null }).water_source_location,
            dumpsterLocation: (s as { dumpster_location: string | null }).dumpster_location,
            entryInstructions: (s as { entry_instructions: string | null }).entry_instructions,
            securityProtocol: (s as { security_protocol: string | null }).security_protocol,
            parkingInstructions: (s as { parking_instructions: string | null }).parking_instructions,
            accessNotes: (s as { access_notes: string | null }).access_notes,
          }))
        );
      }

      if (servicesRes.data) {
        setServices(
          servicesRes.data.map((s) => ({
            value: s.id,
            label: `${s.name} (${s.service_code})`,
          }))
        );
      }

      if (staffRes.data) {
        const staffOpts = staffRes.data.map((s) => ({
          value: `${s.full_name} (${s.staff_code})`,
          label: `${s.full_name} (${s.staff_code})`,
        }));
        setAssignmentOptions([
          { value: '', label: 'Unassigned' },
          { value: 'Day Team', label: 'Day Team' },
          { value: 'Night Team', label: 'Night Team' },
          ...staffOpts,
        ]);
      }

      if (tasksRes.data) {
        setTaskCatalog(tasksRes.data as TaskCatalogRow[]);
      }
    });
  }, [open, supabase]);

  useEffect(() => {
    let cancelled = false;
    if (!open || isEdit || values.job_code) return;

    (async () => {
      const { data, error } = await supabase.rpc('next_code', { p_tenant_id: null, p_prefix: 'JOB' });
      if (cancelled) return;
      if (error || !data) {
        const fallback = `JOB-${new Date().getFullYear()}${String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')}`;
        setCodeGenerationFailed(true);
        setValue('job_code', fallback);
        return;
      }
      setCodeGenerationFailed(false);
      setValue('job_code', data);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, isEdit, values.job_code, setValue, supabase]);

  useEffect(() => {
    if (!open || !focusSection) return;
    window.setTimeout(() => {
      const section = document.querySelector<HTMLElement>(`[data-job-form-section="${focusSection}"]`);
      if (!section) return;
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      section.focus?.();
    }, 60);
  }, [open, focusSection]);

  useEffect(() => {
    if (!open || !sites.length) return;
    if (values.site_id) {
      const selectedSite = sites.find((s) => s.value === values.site_id);
      if (selectedSite?.clientId) setSelectedClientId(selectedSite.clientId);
      return;
    }
    if (preselectedSiteId) {
      const selectedSite = sites.find((s) => s.value === preselectedSiteId);
      if (selectedSite?.clientId) {
        setSelectedClientId(selectedSite.clientId);
        setValue('site_id', preselectedSiteId);
      }
    }
  }, [open, sites, values.site_id, preselectedSiteId, setValue]);

  const filteredSites = useMemo(() => {
    if (!selectedClientId) return [];
    return sites.filter((s) => s.clientId === selectedClientId);
  }, [sites, selectedClientId]);

  const selectedSiteBlueprint = useMemo(
    () => sites.find((site) => site.value === values.site_id) ?? null,
    [sites, values.site_id],
  );

  useEffect(() => {
    if (!selectedSiteBlueprint) {
      setSiteBlueprintDraft(EMPTY_SITE_BLUEPRINT_DRAFT);
      return;
    }

    setSiteBlueprintDraft({
      securityProtocol: selectedSiteBlueprint.securityProtocol ?? '',
      janitorialClosetLocation: selectedSiteBlueprint.janitorialClosetLocation ?? '',
      supplyStorageLocation: selectedSiteBlueprint.supplyStorageLocation ?? '',
      waterSourceLocation: selectedSiteBlueprint.waterSourceLocation ?? '',
      dumpsterLocation: selectedSiteBlueprint.dumpsterLocation ?? '',
      entryInstructions: selectedSiteBlueprint.entryInstructions ?? '',
      parkingInstructions: selectedSiteBlueprint.parkingInstructions ?? '',
      accessNotes: selectedSiteBlueprint.accessNotes ?? '',
    });
  }, [selectedSiteBlueprint]);

  const siteBlueprintEditor = selectedSiteBlueprint ? (
    <Card className="border-dashed border-module-accent/30 bg-muted/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Site Blueprint (Editable)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground">Site</p>
          <p className="font-medium text-sm">
            {selectedSiteBlueprint.siteCode
              ? `${selectedSiteBlueprint.siteCode} - ${selectedSiteBlueprint.siteName}`
              : selectedSiteBlueprint.siteName}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Updates here sync directly to the selected site profile.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Security Protocol"
            value={siteBlueprintDraft.securityProtocol}
            onChange={(event) => setSiteBlueprintDraft((previous) => ({
              ...previous,
              securityProtocol: event.target.value,
            }))}
          />
          <Input
            label="Janitorial Closet"
            value={siteBlueprintDraft.janitorialClosetLocation}
            onChange={(event) => setSiteBlueprintDraft((previous) => ({
              ...previous,
              janitorialClosetLocation: event.target.value,
            }))}
          />
          <Input
            label="Supply Storage"
            value={siteBlueprintDraft.supplyStorageLocation}
            onChange={(event) => setSiteBlueprintDraft((previous) => ({
              ...previous,
              supplyStorageLocation: event.target.value,
            }))}
          />
          <Input
            label="Water Source"
            value={siteBlueprintDraft.waterSourceLocation}
            onChange={(event) => setSiteBlueprintDraft((previous) => ({
              ...previous,
              waterSourceLocation: event.target.value,
            }))}
          />
          <Input
            label="Dumpster Location"
            value={siteBlueprintDraft.dumpsterLocation}
            onChange={(event) => setSiteBlueprintDraft((previous) => ({
              ...previous,
              dumpsterLocation: event.target.value,
            }))}
          />
        </div>

        <div className="grid gap-3">
          <Textarea
            label="Entry Instructions"
            value={siteBlueprintDraft.entryInstructions}
            onChange={(event) => setSiteBlueprintDraft((previous) => ({
              ...previous,
              entryInstructions: event.target.value,
            }))}
            rows={2}
          />
          <Textarea
            label="Parking Instructions"
            value={siteBlueprintDraft.parkingInstructions}
            onChange={(event) => setSiteBlueprintDraft((previous) => ({
              ...previous,
              parkingInstructions: event.target.value,
            }))}
            rows={2}
          />
          <Textarea
            label="Access Notes"
            value={siteBlueprintDraft.accessNotes}
            onChange={(event) => setSiteBlueprintDraft((previous) => ({
              ...previous,
              accessNotes: event.target.value,
            }))}
            rows={2}
          />
        </div>
      </CardContent>
    </Card>
  ) : null;

  const selectedDayCodes = useMemo(() => parseDayCodes(values.schedule_days), [values.schedule_days]);

  const toggleDay = (dayCode: string) => {
    const exists = selectedDayCodes.includes(dayCode);
    const next = exists ? selectedDayCodes.filter((d) => d !== dayCode) : [...selectedDayCodes, dayCode];
    setValue('schedule_days', serializeDayCodes(next));
  };

  const taskSelectOptions = useMemo(
    () => [
      { value: '', label: 'Select task...' },
      ...taskCatalog.map((t) => ({ value: t.id, label: `${t.name} (${t.task_code})` })),
    ],
    [taskCatalog]
  );

  const filteredCatalogRows = useMemo(() => {
    if (!taskCatalogSearch.trim()) return taskCatalog;
    const q = taskCatalogSearch.trim().toLowerCase();
    return taskCatalog.filter((task) =>
      task.name.toLowerCase().includes(q) ||
      task.task_code.toLowerCase().includes(q) ||
      (task.category ?? '').toLowerCase().includes(q) ||
      (task.subcategory ?? '').toLowerCase().includes(q)
    );
  }, [taskCatalog, taskCatalogSearch]);

  const liveEstimate = useMemo(() => {
    const totalQuantity = selectedTasks.reduce((sum, t) => sum + t.quantity, 0);
    const totalMinutesPerVisit = selectedTasks.reduce((sum, t) => sum + t.minutesPerVisit * t.quantity, 0);
    const hoursPerVisit = totalMinutesPerVisit / 60;
    const visitsPerMonth = VISITS_PER_MONTH[values.frequency] ?? 1;
    const monthlyHours = hoursPerVisit * visitsPerMonth;
    const costPerVisit = hoursPerVisit * hourlyCostRate;
    const monthlyCost = monthlyHours * hourlyCostRate;
    const billingAmount = values.billing_amount ?? 0;
    const billingPerVisit = values.billing_uom === 'FLAT_RATE' ? billingAmount / Math.max(visitsPerMonth, 1) : billingAmount;
    const marginPerVisit = billingPerVisit - costPerVisit;

    return {
      lineItems: selectedTasks.length,
      totalQuantity,
      totalMinutesPerVisit,
      hoursPerVisit,
      visitsPerMonth,
      monthlyHours,
      costPerVisit,
      monthlyCost,
      billingPerVisit,
      marginPerVisit,
      marginPct: billingPerVisit > 0 ? (marginPerVisit / billingPerVisit) * 100 : 0,
    };
  }, [selectedTasks, values.frequency, values.billing_amount, values.billing_uom, hourlyCostRate]);

  const addTaskFromCatalog = () => {
    if (!taskSelectId) return;
    const task = taskCatalog.find((t) => t.id === taskSelectId);
    if (!task) return;

    const qty = Number.isFinite(taskQuantity) && taskQuantity > 0 ? Math.floor(taskQuantity) : 1;
    const minutes = task.default_minutes ?? 30;

    setSelectedTasks((prev) => {
      const existing = prev.find((t) => t.taskId === task.id);
      if (existing) {
        return prev.map((t) => (t.taskId === task.id ? { ...t, quantity: t.quantity + qty } : t));
      }
      return [
        ...prev,
        {
          taskId: task.id,
          taskCode: task.task_code,
          name: task.name,
          minutesPerVisit: minutes,
          quantity: qty,
        },
      ];
    });

    setTaskSelectId('');
    setTaskQuantity(1);
  };

  const loadFromServiceTemplate = async () => {
    if (!values.service_id) {
      toast.error('Select a service template first.');
      return;
    }
    setLoadingServiceTemplate(true);
    const { data, error } = await supabase
      .from('service_tasks')
      .select('task_id, sequence_order, estimated_minutes')
      .eq('service_id', values.service_id)
      .is('archived_at', null)
      .order('sequence_order');

    if (error || !data?.length) {
      toast.error(error?.message ?? 'No service tasks found for this template.');
      setLoadingServiceTemplate(false);
      return;
    }

    setSelectedTasks((prev) => {
      const byId = new Map(prev.map((t) => [t.taskId, t]));
      for (const row of data as Array<{ task_id: string; estimated_minutes: number | null }>) {
        if (byId.has(row.task_id)) continue;
        const task = taskCatalog.find((t) => t.id === row.task_id);
        if (!task) continue;
        byId.set(row.task_id, {
          taskId: task.id,
          taskCode: task.task_code,
          name: task.name,
          minutesPerVisit: row.estimated_minutes ?? task.default_minutes ?? 30,
          quantity: 1,
        });
      }
      return Array.from(byId.values());
    });

    setLoadingServiceTemplate(false);
    toast.success('Loaded tasks from service template.');
  };

  const addSelectedCatalogTasks = () => {
    if (selectedCatalogTaskIds.length === 0) return;
    setSelectedTasks((prev) => {
      const byId = new Map(prev.map((task) => [task.taskId, task]));
      for (const taskId of selectedCatalogTaskIds) {
        if (byId.has(taskId)) continue;
        const task = taskCatalog.find((row) => row.id === taskId);
        if (!task) continue;
        byId.set(taskId, {
          taskId: task.id,
          taskCode: task.task_code,
          name: task.name,
          minutesPerVisit: task.default_minutes ?? 30,
          quantity: 1,
        });
      }
      return Array.from(byId.values());
    });
    setSelectedCatalogTaskIds([]);
    setTaskCatalogOpen(false);
    toast.success('Selected catalog tasks added.');
  };

  const validateStep = (step: number): boolean => {
    if (step === 0) {
      return Boolean(selectedClientId && values.site_id && values.job_name.trim());
    }
    if (step === 1) {
      return Boolean(values.frequency && values.billing_uom && (values.billing_amount ?? 0) > 0);
    }
    return true;
  };

  const handleClose = () => {
    reset();
    wizard.reset();
    setSelectedTasks([]);
    setSelectedClientId('');
    setTaskSelectId('');
    setTaskQuantity(1);
    setTaskCatalogOpen(false);
    setTaskCatalogSearch('');
    setSelectedCatalogTaskIds([]);
    setCodeGenerationFailed(false);
    setSiteBlueprintDraft(EMPTY_SITE_BLUEPRINT_DRAFT);
    onClose();
  };

  if (isEdit) {
    return (
      <SlideOver open={open} onClose={handleClose} title="Edit Job" subtitle={initialData?.job_code} wide>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div data-job-form-section="assignment" tabIndex={-1}>
            <FormSection title="Assignment" icon={<ClipboardList className="h-4 w-4" />}>
            <Input label="Job Code" value={values.job_code} readOnly disabled />
            <Input
              label="Job Name"
              value={values.job_name}
              onChange={(e) => setValue('job_name', e.target.value)}
              onBlur={() => onBlur('job_name')}
              error={errors.job_name}
              required
            />
            <Select
              label="Site"
              value={values.site_id}
              onChange={(e) => setValue('site_id', e.target.value)}
              options={sites.map((s) => ({ value: s.value, label: s.label }))}
            />
            <Select
              label="Job Type"
              value={values.job_type ?? ''}
              onChange={(e) => setValue('job_type', e.target.value || null)}
              options={JOB_TYPE_OPTIONS}
            />
            <Select
              label="Priority"
              value={values.priority_level ?? ''}
              onChange={(e) => setValue('priority_level', e.target.value || null)}
              options={PRIORITY_OPTIONS}
            />
            <Select
              label="Assigned Team / Supervisor"
              value={values.job_assigned_to ?? ''}
              onChange={(e) => setValue('job_assigned_to', e.target.value || null)}
              options={assignmentOptions}
            />
            </FormSection>
          </div>

          <div data-job-form-section="schedule" tabIndex={-1}>
            <FormSection title="Schedule & Billing" icon={<CalendarClock className="h-4 w-4" />}>
            <Select
              label="Frequency"
              value={values.frequency}
              onChange={(e) => setValue('frequency', e.target.value)}
              options={FREQUENCY_OPTIONS}
            />
            <Input label="Schedule Days" value={values.schedule_days ?? ''} onChange={(e) => setValue('schedule_days', e.target.value || null)} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Earliest Start Time" type="time" value={values.start_time ?? ''} onChange={(e) => setValue('start_time', e.target.value || null)} />
              <Input label="Latest Start Time" type="time" value={values.end_time ?? ''} onChange={(e) => setValue('end_time', e.target.value || null)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Billing Amount"
                type="number"
                value={values.billing_amount ?? ''}
                onChange={(e) => setValue('billing_amount', e.target.value ? Number(e.target.value) : null)}
              />
              <Select
                label="Billing Period"
                value={values.billing_uom ?? ''}
                onChange={(e) => setValue('billing_uom', e.target.value || null)}
                options={BILLING_PERIOD_OPTIONS}
              />
            </div>
            <Textarea
              label="Invoice Description"
              value={values.invoice_description ?? ''}
              onChange={(e) => setValue('invoice_description', e.target.value || null)}
            />
            </FormSection>
          </div>

          <div data-job-form-section="tasks" tabIndex={-1}>
            <FormSection title="Tasks & Details" icon={<FileText className="h-4 w-4" />}>
            <Select
              label="Service Template"
              value={values.service_id ?? ''}
              onChange={(e) => setValue('service_id', e.target.value || null)}
              options={[{ value: '', label: 'None' }, ...services]}
            />
            {siteBlueprintEditor}
            <Textarea label="Special Requirements" value={values.special_requirements ?? ''} onChange={(e) => setValue('special_requirements', e.target.value || null)} />
            <Textarea label="Specifications" value={values.specifications ?? ''} onChange={(e) => setValue('specifications', e.target.value || null)} />
            <Textarea label="Notes" value={values.notes ?? ''} onChange={(e) => setValue('notes', e.target.value || null)} />
            </FormSection>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
            <Button type="submit" loading={loading}>Save Changes</Button>
          </div>
        </form>
      </SlideOver>
    );
  }

  return (
    <>
      <SlideOver open={open} onClose={handleClose} title="New Service Plan" wide>
      <FormWizard
        steps={WIZARD_STEPS}
        currentStep={wizard.currentStep}
        onStepChange={wizard.goToStep}
        onSubmit={handleSubmit}
        onCancel={handleClose}
        submitLabel="Create Service Plan"
        loading={loading}
        validateStep={validateStep}
      >
        {wizard.currentStep === 0 && (
          <FormSection
            title="Step 1 — Assignment"
            icon={<UserRound className="h-4 w-4" />}
            description="Client, site, core job details, and ownership."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Job Code"
                value={values.job_code}
                readOnly
                disabled
                hint={codeGenerationFailed ? 'Using fallback code; save will still work.' : 'Auto-generated'}
              />
              <Select
                label="Status"
                value={values.status}
                onChange={(e) => setValue('status', e.target.value)}
                options={STATUS_OPTIONS}
              />
              <Select
                label="Client"
                value={selectedClientId}
                onChange={(e) => {
                  const nextClient = e.target.value;
                  setSelectedClientId(nextClient);
                  setValue('site_id', '');
                }}
                options={[{ value: '', label: 'Select client...' }, ...clients]}
                required
              />
              <Select
                label="Site"
                value={values.site_id}
                onChange={(e) => setValue('site_id', e.target.value)}
                onBlur={() => onBlur('site_id')}
                error={errors.site_id}
                options={[{ value: '', label: selectedClientId ? 'Select site...' : 'Select client first...' }, ...filteredSites.map((s) => ({ value: s.value, label: s.label }))]}
                required
                disabled={!selectedClientId}
              />
              <Input
                label="Job Name"
                value={values.job_name}
                onChange={(e) => setValue('job_name', e.target.value)}
                onBlur={() => onBlur('job_name')}
                error={errors.job_name}
                required
              />
              <Select
                label="Job Type"
                value={values.job_type ?? ''}
                onChange={(e) => setValue('job_type', e.target.value || null)}
                options={JOB_TYPE_OPTIONS}
              />
              <div className="space-y-1.5">
                <Select
                  label="Priority"
                  value={values.priority_level ?? ''}
                  onChange={(e) => setValue('priority_level', e.target.value || null)}
                  options={PRIORITY_OPTIONS}
                />
                {values.priority_level && (
                  <div className="pt-1">
                    <Badge color={PRIORITY_BADGE_COLORS[values.priority_level] ?? 'gray'} dot={false}>
                      {values.priority_level}
                    </Badge>
                  </div>
                )}
              </div>
              <Select
                label="Assigned Team / Supervisor"
                value={values.job_assigned_to ?? ''}
                onChange={(e) => setValue('job_assigned_to', e.target.value || null)}
                options={assignmentOptions}
              />
              <Select
                label="Service Template"
                value={values.service_id ?? ''}
                onChange={(e) => setValue('service_id', e.target.value || null)}
                options={[{ value: '', label: 'None' }, ...services]}
              />
            </div>
          </FormSection>
        )}

        {wizard.currentStep === 1 && (
          <FormSection
            title="Step 2 — Schedule & Billing"
            icon={<CalendarClock className="h-4 w-4" />}
            description="Frequency, service windows, and billing setup."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Frequency"
                value={values.frequency}
                onChange={(e) => setValue('frequency', e.target.value)}
                options={FREQUENCY_OPTIONS}
                required
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Schedule Days</label>
                <div className="flex flex-wrap gap-2">
                  {DAY_OPTIONS.map((d) => {
                    const active = selectedDayCodes.includes(d.code);
                    return (
                      <button
                        key={d.code}
                        type="button"
                        onClick={() => toggleDay(d.code)}
                        className={cn(
                          'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                          active
                            ? 'bg-module-accent text-module-accent-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        )}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedDayCodes.length ? serializeDayCodes(selectedDayCodes) : 'No days selected'}
                </p>
              </div>
              <Input
                label="Earliest Start Time"
                type="time"
                value={values.start_time ?? ''}
                onChange={(e) => setValue('start_time', e.target.value || null)}
              />
              <Input
                label="Latest Start Time"
                type="time"
                value={values.end_time ?? ''}
                onChange={(e) => setValue('end_time', e.target.value || null)}
              />
              <Input
                label="Billing Amount"
                type="number"
                min={0}
                step="0.01"
                value={values.billing_amount ?? ''}
                onChange={(e) => setValue('billing_amount', e.target.value ? Number(e.target.value) : null)}
                required
              />
              <Select
                label="Billing Period"
                value={values.billing_uom ?? ''}
                onChange={(e) => setValue('billing_uom', e.target.value || null)}
                options={BILLING_PERIOD_OPTIONS}
                required
              />
              <div className="md:col-span-2">
                <Textarea
                  label="Invoice Description"
                  value={values.invoice_description ?? ''}
                  onChange={(e) => setValue('invoice_description', e.target.value || null)}
                  rows={2}
                />
              </div>
            </div>
          </FormSection>
        )}

        {wizard.currentStep === 2 && (
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-4">
            <FormSection
              title="Step 3 — Tasks & Details"
              icon={<Layers3 className="h-4 w-4" />}
              description="Build the job task list and capture operational notes."
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_auto] gap-3 items-end">
                  <Select
                    label="Add Task"
                    value={taskSelectId}
                    onChange={(e) => setTaskSelectId(e.target.value)}
                    options={taskSelectOptions}
                  />
                  <Input
                    label="Qty"
                    type="number"
                    min={1}
                    value={taskQuantity}
                    onChange={(e) => setTaskQuantity(e.target.value ? Number(e.target.value) : 1)}
                  />
                  <div className="flex gap-2">
                    <Button type="button" onClick={addTaskFromCatalog}>
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setTaskCatalogOpen(true)}>
                      Add from Task Catalog
                    </Button>
                  </div>
                </div>

                {values.service_id && (
                  <div className="flex justify-start">
                    <Button type="button" variant="secondary" loading={loadingServiceTemplate} onClick={loadFromServiceTemplate}>
                      Load from Service Template
                    </Button>
                  </div>
                )}

                {selectedTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tasks added yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {selectedTasks.map((task) => (
                      <li key={task.taskId} className="rounded-xl border border-border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{task.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{task.taskCode}</p>
                          </div>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedTasks((prev) => prev.filter((t) => t.taskId !== task.taskId))}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <Input
                            label="Qty"
                            type="number"
                            min={1}
                            value={task.quantity}
                            onChange={(e) =>
                              setSelectedTasks((prev) =>
                                prev.map((t) =>
                                  t.taskId === task.taskId
                                    ? { ...t, quantity: e.target.value ? Math.max(1, Number(e.target.value)) : 1 }
                                    : t
                                )
                              )
                            }
                          />
                          <Input
                            label="Minutes / Qty"
                            type="number"
                            min={1}
                            value={task.minutesPerVisit}
                            onChange={(e) =>
                              setSelectedTasks((prev) =>
                                prev.map((t) =>
                                  t.taskId === task.taskId
                                    ? { ...t, minutesPerVisit: e.target.value ? Math.max(1, Number(e.target.value)) : 1 }
                                    : t
                                )
                              )
                            }
                          />
                          <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-foreground">Total Minutes</label>
                            <div className="h-11 rounded-[var(--radius-input)] border border-border bg-background px-3.5 flex items-center text-sm">
                              {Math.round(task.quantity * task.minutesPerVisit)}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {siteBlueprintEditor}

                <Textarea
                  label="Special Requirements"
                  value={values.special_requirements ?? ''}
                  onChange={(e) => setValue('special_requirements', e.target.value || null)}
                  rows={2}
                />
                <Textarea
                  label="Specifications"
                  value={values.specifications ?? ''}
                  onChange={(e) => setValue('specifications', e.target.value || null)}
                  rows={2}
                />
                <Textarea
                  label="Notes"
                  value={values.notes ?? ''}
                  onChange={(e) => setValue('notes', e.target.value || null)}
                  rows={2}
                />
              </div>
            </FormSection>

            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Live Estimate
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  label="Labor Cost / Hour"
                  type="number"
                  min={1}
                  step="0.01"
                  value={hourlyCostRate}
                  onChange={(e) => setHourlyCostRate(e.target.value ? Number(e.target.value) : 25)}
                />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Task Lines</span>
                    <span className="font-medium">{liveEstimate.lineItems}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Qty</span>
                    <span className="font-medium">{liveEstimate.totalQuantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Minutes / Visit</span>
                    <span className="font-medium">{Math.round(liveEstimate.totalMinutesPerVisit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hours / Visit</span>
                    <span className="font-medium">{liveEstimate.hoursPerVisit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cost / Visit</span>
                    <span className="font-medium">{formatCurrency(liveEstimate.costPerVisit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Visits / Month</span>
                    <span className="font-medium">{liveEstimate.visitsPerMonth.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monthly Hours</span>
                    <span className="font-medium">{liveEstimate.monthlyHours.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monthly Cost</span>
                    <span className="font-medium">{formatCurrency(liveEstimate.monthlyCost)}</span>
                  </div>
                  <div className="pt-2 border-t border-border" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Billing / Visit</span>
                    <span className="font-medium">{formatCurrency(liveEstimate.billingPerVisit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Margin / Visit</span>
                    <span className={cn('font-semibold', liveEstimate.marginPerVisit >= 0 ? 'text-success' : 'text-destructive')}>
                      {formatCurrency(liveEstimate.marginPerVisit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Margin %</span>
                    <span className={cn('font-semibold', liveEstimate.marginPct >= 0 ? 'text-success' : 'text-destructive')}>
                      {liveEstimate.marginPct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </FormWizard>
      </SlideOver>
      <SlideOver
        open={taskCatalogOpen}
        onClose={() => setTaskCatalogOpen(false)}
        title="Task Catalog"
        subtitle="Select one or more standardized tasks"
        wide
      >
        <div className="space-y-4">
          <Input
            label="Search Tasks"
            value={taskCatalogSearch}
            onChange={(e) => setTaskCatalogSearch(e.target.value)}
            placeholder="Search by name, code, or category..."
          />

          <div className="max-h-[62vh] space-y-2 overflow-y-auto pr-1">
            {filteredCatalogRows.map((task) => {
              const checked = selectedCatalogTaskIds.includes(task.id);
              return (
                <label
                  key={task.id}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors',
                    checked ? 'border-module-accent bg-module-accent/5' : 'border-border hover:bg-muted/40'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      setSelectedCatalogTaskIds((prev) =>
                        e.target.checked
                          ? [...prev, task.id]
                          : prev.filter((id) => id !== task.id)
                      )
                    }
                    className="mt-1 h-4 w-4"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{task.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{task.task_code}</p>
                    <p className="text-xs text-muted-foreground">
                      {(task.category ?? 'General')}{task.subcategory ? ` - ${task.subcategory}` : ''} · {task.default_minutes ?? 30} min
                      {task.priority_level ? ` · ${task.priority_level}` : ''}
                    </p>
                  </div>
                </label>
              );
            })}
            {filteredCatalogRows.length === 0 && (
              <p className="text-sm text-muted-foreground">No tasks match this search.</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="secondary" onClick={() => setTaskCatalogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={addSelectedCatalogTasks} disabled={selectedCatalogTaskIds.length === 0}>
              Add Selected ({selectedCatalogTaskIds.length})
            </Button>
          </div>
        </div>
      </SlideOver>
    </>
  );
}
