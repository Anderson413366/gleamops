'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BriefcaseBusiness,
  CalendarClock,
  ClipboardCheck,
  DollarSign,
  MapPin,
  PlusSquare,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  FormSection,
  FormWizard,
  Input,
  Select,
  SlideOver,
  Textarea,
  useWizardSteps,
} from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { CompletionTemplateForm } from './completion-template-form';

type WorkOrderFormData = {
  siteId: string;
  serviceType: string;
  priority: string;
  requestedBy: string;
  scope: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  crewLead: string;
  crewSize: string;
  equipmentNotes: string;
  estimatedHours: string;
  laborBudget: string;
  materialsBudget: string;
  completionTemplate: string;
  photoProofRequired: string;
  completionNotes: string;
};

export interface WorkOrderCreateResult {
  ticketId: string;
  ticketCode: string;
  scheduledDate: string;
  jobId: string;
  siteId: string;
}

interface ServicePlanOptionData {
  id: string;
  jobCode: string;
  jobName: string;
  siteId: string;
  siteCode: string;
  siteName: string;
  startTime: string | null;
  endTime: string | null;
}

interface CrewOptionData {
  id: string;
  label: string;
}

const STEPS = [
  { id: 'site-service', title: 'Site & Service', description: 'Choose site scope and service package' },
  { id: 'schedule-crew', title: 'Schedule & Crew', description: 'Plan timing and assigned team' },
  { id: 'financial-completion', title: 'Financial & Completion', description: 'Set budget and completion rules' },
  { id: 'review', title: 'Review', description: 'Confirm and submit work order' },
] as const;

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const DEFAULT_COMPLETION_TEMPLATE_OPTIONS = [
  { value: 'standard', label: 'Standard Completion' },
  { value: 'project-heavy', label: 'Project Heavy Cleanup' },
  { value: 'client-signoff', label: 'Client Sign-off Required' },
];

const PROOF_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

const DEFAULT_VALUES: WorkOrderFormData = {
  siteId: '',
  serviceType: '',
  priority: 'standard',
  requestedBy: '',
  scope: '',
  scheduledDate: '',
  startTime: '',
  endTime: '',
  crewLead: '',
  crewSize: '3',
  equipmentNotes: '',
  estimatedHours: '',
  laborBudget: '',
  materialsBudget: '',
  completionTemplate: 'standard',
  photoProofRequired: 'yes',
  completionNotes: '',
};

type FieldName = keyof WorkOrderFormData;
type FormErrors = Partial<Record<FieldName, string>>;

function toFiniteNumber(value: string): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function relationOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function timeInputFromDb(value: string | null | undefined): string {
  if (!value) return '';
  return value.slice(0, 5);
}

function toDbTime(value: string): string | null {
  if (!value) return null;
  return `${value}:00`;
}

function mergeInitialValues(initialValues?: Partial<WorkOrderFormData>) {
  return {
    ...DEFAULT_VALUES,
    ...initialValues,
  };
}

async function requestTicketCode() {
  const supabase = getSupabaseBrowserClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    throw new Error('Missing session token for code generation.');
  }

  const response = await fetch('/api/codes/next', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ prefix: 'TKT' }),
  });

  if (!response.ok) {
    throw new Error('Unable to generate work order code.');
  }

  const payload = await response.json() as { data?: unknown };
  if (typeof payload.data !== 'string' || !payload.data.trim()) {
    throw new Error('Invalid work order code response.');
  }

  return payload.data.trim();
}

interface WorkOrderFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (result: WorkOrderCreateResult) => void;
  initialValues?: Partial<WorkOrderFormData>;
}

export function WorkOrderForm({ open, onClose, onSuccess, initialValues }: WorkOrderFormProps) {
  const { currentStep, goToStep, reset } = useWizardSteps(STEPS.length);
  const [values, setValues] = useState<WorkOrderFormData>(() => mergeInitialValues(initialValues));
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [templateDrawerOpen, setTemplateDrawerOpen] = useState(false);

  const [servicePlans, setServicePlans] = useState<ServicePlanOptionData[]>([]);
  const [crewOptions, setCrewOptions] = useState<CrewOptionData[]>([]);
  const [completionTemplateOptions, setCompletionTemplateOptions] = useState(DEFAULT_COMPLETION_TEMPLATE_OPTIONS);

  const loadCompletionTemplates = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('checklist_templates')
      .select('id, name, template_name, template_type')
      .eq('template_type', 'Work Order Completion')
      .is('archived_at', null)
      .order('updated_at', { ascending: false });

    if (error || !data) return;

    const dynamicOptions = (data as Array<{
      id: string;
      name: string | null;
      template_name: string | null;
      template_type: string | null;
    }>)
      .filter((row) => row.template_type === 'Work Order Completion')
      .map((row) => ({
        value: row.id,
        label: row.template_name ?? row.name ?? row.id,
      }));

    const merged = [...DEFAULT_COMPLETION_TEMPLATE_OPTIONS];
    for (const option of dynamicOptions) {
      if (!merged.some((existing) => existing.value === option.value)) {
        merged.push(option);
      }
    }
    setCompletionTemplateOptions(merged);
  }, []);

  const loadFormOptions = useCallback(async () => {
    setLoadingOptions(true);
    const supabase = getSupabaseBrowserClient();

    const [jobsRes, staffRes] = await Promise.all([
      supabase
        .from('site_jobs')
        .select('id, job_code, job_name, site_id, start_time, end_time, site:site_id(name, site_code)')
        .eq('status', 'ACTIVE')
        .is('archived_at', null)
        .order('job_code', { ascending: true }),
      supabase
        .from('staff')
        .select('id, full_name, staff_code')
        .eq('staff_status', 'ACTIVE')
        .is('archived_at', null)
        .order('full_name', { ascending: true }),
    ]);

    if (!jobsRes.error && jobsRes.data) {
      const parsed = (jobsRes.data as Array<{
        id: string;
        job_code: string;
        job_name: string | null;
        site_id: string;
        start_time: string | null;
        end_time: string | null;
        site:
          | {
              name: string | null;
              site_code: string | null;
            }
          | Array<{
              name: string | null;
              site_code: string | null;
            }>
          | null;
      }>).map((row) => {
        const site = relationOne(row.site);
        return {
          id: row.id,
          jobCode: row.job_code,
          jobName: row.job_name ?? 'Unnamed Service Plan',
          siteId: row.site_id,
          siteCode: site?.site_code ?? 'SITE',
          siteName: site?.name ?? 'Unknown Site',
          startTime: row.start_time,
          endTime: row.end_time,
        } satisfies ServicePlanOptionData;
      });
      setServicePlans(parsed);
    } else {
      setServicePlans([]);
    }

    if (!staffRes.error && staffRes.data) {
      const parsedCrew = (staffRes.data as Array<{
        id: string;
        full_name: string;
        staff_code: string;
      }>).map((staff) => ({
        id: staff.id,
        label: `${staff.full_name} (${staff.staff_code})`,
      }));
      setCrewOptions(parsedCrew);
    } else {
      setCrewOptions([]);
    }

    setLoadingOptions(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    setValues(mergeInitialValues(initialValues));
    setErrors({});
    reset();

    void Promise.all([
      loadFormOptions(),
      loadCompletionTemplates(),
    ]);
  }, [initialValues, loadCompletionTemplates, loadFormOptions, open, reset]);

  const siteOptions = useMemo(() => {
    const unique = new Map<string, { value: string; label: string }>();
    for (const plan of servicePlans) {
      if (!unique.has(plan.siteId)) {
        unique.set(plan.siteId, {
          value: plan.siteId,
          label: `${plan.siteCode} - ${plan.siteName}`,
        });
      }
    }
    return Array.from(unique.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [servicePlans]);

  const serviceOptions = useMemo(() => {
    const filtered = values.siteId
      ? servicePlans.filter((plan) => plan.siteId === values.siteId)
      : servicePlans;

    return filtered.map((plan) => ({
      value: plan.id,
      label: `${plan.jobCode} - ${plan.jobName}`,
    }));
  }, [servicePlans, values.siteId]);

  const crewLeadOptions = useMemo(() => ([
    { value: '', label: loadingOptions ? 'Loading crew...' : crewOptions.length ? 'Select crew lead...' : 'No active staff found' },
    ...crewOptions.map((crew) => ({ value: crew.id, label: crew.label })),
  ]), [crewOptions, loadingOptions]);

  const selectedServicePlan = useMemo(
    () => servicePlans.find((plan) => plan.id === values.serviceType) ?? null,
    [servicePlans, values.serviceType],
  );

  const selectedSiteLabel = useMemo(
    () => siteOptions.find((site) => site.value === values.siteId)?.label ?? 'Not selected',
    [siteOptions, values.siteId],
  );

  const selectedServiceLabel = useMemo(
    () => serviceOptions.find((service) => service.value === values.serviceType)?.label ?? 'Not selected',
    [serviceOptions, values.serviceType],
  );

  const selectedCrewLeadLabel = useMemo(
    () => crewLeadOptions.find((lead) => lead.value === values.crewLead)?.label ?? 'Not assigned',
    [crewLeadOptions, values.crewLead],
  );

  const selectedCompletionTemplateLabel = useMemo(
    () => completionTemplateOptions.find((template) => template.value === values.completionTemplate)?.label ?? values.completionTemplate,
    [completionTemplateOptions, values.completionTemplate],
  );

  useEffect(() => {
    if (!values.siteId || !values.serviceType) return;
    const activePlan = servicePlans.find((plan) => plan.id === values.serviceType);
    if (activePlan && activePlan.siteId !== values.siteId) {
      setValues((prev) => ({ ...prev, serviceType: '' }));
    }
  }, [servicePlans, values.serviceType, values.siteId]);

  const setValue = (field: FieldName, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const setServicePlan = (planId: string) => {
    const plan = servicePlans.find((entry) => entry.id === planId);
    setValues((prev) => ({
      ...prev,
      serviceType: planId,
      siteId: plan?.siteId ?? prev.siteId,
      startTime: prev.startTime || timeInputFromDb(plan?.startTime),
      endTime: prev.endTime || timeInputFromDb(plan?.endTime),
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.serviceType;
      delete next.siteId;
      return next;
    });
  };

  const validateStep = (step: number) => {
    const nextErrors: FormErrors = {};

    if (step === 0) {
      if (!values.siteId) nextErrors.siteId = 'Site is required.';
      if (!values.serviceType) nextErrors.serviceType = 'Service plan is required.';
      if (!values.requestedBy.trim()) nextErrors.requestedBy = 'Requester name is required.';
      if (!values.scope.trim()) nextErrors.scope = 'Scope details are required.';
    }

    if (step === 1) {
      if (!values.scheduledDate) nextErrors.scheduledDate = 'Scheduled date is required.';
      if (!values.startTime) nextErrors.startTime = 'Start time is required.';
      if (!values.endTime) nextErrors.endTime = 'End time is required.';
      if (values.startTime && values.endTime && values.endTime <= values.startTime) {
        nextErrors.endTime = 'End time must be later than start time.';
      }
      if (!values.crewLead) nextErrors.crewLead = 'Crew lead is required.';
      const crewSize = toFiniteNumber(values.crewSize);
      if (crewSize == null || crewSize <= 0) {
        nextErrors.crewSize = 'Crew size must be at least 1.';
      }
    }

    if (step === 2) {
      const estimatedHours = toFiniteNumber(values.estimatedHours);
      if (estimatedHours == null || estimatedHours <= 0) {
        nextErrors.estimatedHours = 'Estimated hours must be greater than 0.';
      }

      const laborBudget = toFiniteNumber(values.laborBudget);
      if (laborBudget == null || laborBudget <= 0) {
        nextErrors.laborBudget = 'Labor budget must be greater than 0.';
      }

      const materialsBudget = toFiniteNumber(values.materialsBudget);
      if (materialsBudget == null || materialsBudget < 0) {
        nextErrors.materialsBudget = 'Materials budget must be 0 or greater.';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleClose = () => {
    setValues(mergeInitialValues(initialValues));
    setErrors({});
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (currentStep < STEPS.length - 1) {
      if (!validateStep(currentStep)) {
        return;
      }
      goToStep(currentStep + 1);
      return;
    }

    if (!validateStep(2)) {
      goToStep(2);
      return;
    }

    const selectedPlan = servicePlans.find((plan) => plan.id === values.serviceType);
    if (!selectedPlan) {
      setErrors((prev) => ({ ...prev, serviceType: 'Select a valid service plan.' }));
      goToStep(0);
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('You must be signed in to create a work order.');
      }

      const tenantId = user.app_metadata?.tenant_id ?? null;
      if (!tenantId) {
        throw new Error('Missing tenant context.');
      }

      const ticketCode = await requestTicketCode();

      const requiredStaffCount = Math.max(1, Math.floor(toFiniteNumber(values.crewSize) ?? 1));

      const { data: createdTicket, error: createTicketError } = await supabase
        .from('work_tickets')
        .insert({
          tenant_id: tenantId,
          ticket_code: ticketCode,
          job_id: selectedPlan.id,
          site_id: selectedPlan.siteId,
          scheduled_date: values.scheduledDate,
          start_time: toDbTime(values.startTime),
          end_time: toDbTime(values.endTime),
          status: 'SCHEDULED',
          required_staff_count: requiredStaffCount,
          planning_status: 'READY',
        })
        .select('id, ticket_code')
        .single();

      if (createTicketError || !createdTicket) {
        throw new Error(createTicketError?.message ?? 'Unable to create work order ticket.');
      }

      if (values.crewLead) {
        const { error: assignmentError } = await supabase
          .from('ticket_assignments')
          .insert({
            tenant_id: tenantId,
            ticket_id: createdTicket.id,
            staff_id: values.crewLead,
            role: 'LEAD',
            assignment_status: 'ASSIGNED',
            assignment_type: 'DIRECT',
            overtime_flag: false,
          });

        if (assignmentError) {
          // Keep create operation atomic from the user's perspective.
          await supabase
            .from('work_tickets')
            .delete()
            .eq('id', createdTicket.id);

          throw new Error(`Unable to assign crew lead: ${assignmentError.message}`);
        }
      }

      const isTemplateId = completionTemplateOptions
        .some((template) => template.value === values.completionTemplate)
        && !DEFAULT_COMPLETION_TEMPLATE_OPTIONS.some((template) => template.value === values.completionTemplate);

      if (isTemplateId) {
        const { error: checklistError } = await supabase
          .from('ticket_checklists')
          .insert({
            tenant_id: tenantId,
            ticket_id: createdTicket.id,
            template_id: values.completionTemplate,
            status: 'PENDING',
          });

        if (checklistError) {
          toast.error(`Work order created, but checklist template failed: ${checklistError.message}`);
        }
      }

      toast.success(`Work order ${createdTicket.ticket_code} created.`);
      onSuccess?.({
        ticketId: createdTicket.id,
        ticketCode: createdTicket.ticket_code,
        scheduledDate: values.scheduledDate,
        jobId: selectedPlan.id,
        siteId: selectedPlan.siteId,
      });
      handleClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create work order right now.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SlideOver open={open} onClose={handleClose} title="New Work Order" wide>
      <FormWizard
        steps={STEPS.map((step) => ({ ...step }))}
        currentStep={currentStep}
        onStepChange={goToStep}
        onSubmit={handleSubmit}
        onCancel={handleClose}
        submitLabel="Create Work Order"
        loading={loading}
        validateStep={validateStep}
      >
        {currentStep === 0 && (
          <div className="space-y-6">
            <FormSection
              title="Site & Service"
              icon={<MapPin className="h-4 w-4" />}
              description="Choose where the work is happening and the service package to execute."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Select
                  label="Site"
                  value={values.siteId}
                  onChange={(event) => setValue('siteId', event.target.value)}
                  options={[
                    {
                      value: '',
                      label: loadingOptions
                        ? 'Loading sites...'
                        : siteOptions.length
                          ? 'Select a site...'
                          : 'No active sites found',
                    },
                    ...siteOptions,
                  ]}
                  error={errors.siteId}
                  disabled={loadingOptions || siteOptions.length === 0}
                  required
                />
                <Select
                  label="Service Plan"
                  value={values.serviceType}
                  onChange={(event) => setServicePlan(event.target.value)}
                  options={[
                    {
                      value: '',
                      label: loadingOptions
                        ? 'Loading service plans...'
                        : serviceOptions.length
                          ? 'Select a service plan...'
                          : values.siteId
                            ? 'No active plans for selected site'
                            : 'Select a site first',
                    },
                    ...serviceOptions,
                  ]}
                  error={errors.serviceType}
                  disabled={loadingOptions || serviceOptions.length === 0}
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Select
                  label="Priority"
                  value={values.priority}
                  onChange={(event) => setValue('priority', event.target.value)}
                  options={PRIORITY_OPTIONS}
                />
                <Input
                  label="Requested By"
                  value={values.requestedBy}
                  onChange={(event) => setValue('requestedBy', event.target.value)}
                  error={errors.requestedBy}
                  placeholder="Manager or customer contact"
                  required
                />
              </div>

              <Textarea
                label="Scope Details"
                value={values.scope}
                onChange={(event) => setValue('scope', event.target.value)}
                error={errors.scope}
                placeholder="Describe requested outcome, restrictions, and special handling."
                rows={4}
                required
              />
            </FormSection>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-6">
            <FormSection
              title="Schedule & Crew"
              icon={<Users className="h-4 w-4" />}
              description="Set timing, staffing, and execution notes for the assigned team."
            >
              <div className="grid gap-4 md:grid-cols-3">
                <Input
                  type="date"
                  label="Scheduled Date"
                  value={values.scheduledDate}
                  onChange={(event) => setValue('scheduledDate', event.target.value)}
                  error={errors.scheduledDate}
                  required
                />
                <Input
                  type="time"
                  label="Start Time"
                  value={values.startTime}
                  onChange={(event) => setValue('startTime', event.target.value)}
                  error={errors.startTime}
                  required
                />
                <Input
                  type="time"
                  label="End Time"
                  value={values.endTime}
                  onChange={(event) => setValue('endTime', event.target.value)}
                  error={errors.endTime}
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Select
                  label="Crew Lead"
                  value={values.crewLead}
                  onChange={(event) => setValue('crewLead', event.target.value)}
                  options={crewLeadOptions}
                  error={errors.crewLead}
                  disabled={loadingOptions || crewOptions.length === 0}
                  required
                />
                <Input
                  type="number"
                  min={1}
                  label="Crew Size"
                  value={values.crewSize}
                  onChange={(event) => setValue('crewSize', event.target.value)}
                  error={errors.crewSize}
                  required
                />
              </div>

              <Textarea
                label="Equipment / Access Notes"
                value={values.equipmentNotes}
                onChange={(event) => setValue('equipmentNotes', event.target.value)}
                placeholder="List required equipment, loading dock timing, or key access needs."
                rows={3}
              />
            </FormSection>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <FormSection
              title="Financial & Completion"
              icon={<DollarSign className="h-4 w-4" />}
              description="Capture budget assumptions and completion requirements before dispatch."
            >
              <div className="grid gap-4 md:grid-cols-3">
                <Input
                  type="number"
                  min={0.5}
                  step={0.5}
                  label="Estimated Hours"
                  value={values.estimatedHours}
                  onChange={(event) => setValue('estimatedHours', event.target.value)}
                  error={errors.estimatedHours}
                  required
                />
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  label="Labor Budget"
                  value={values.laborBudget}
                  onChange={(event) => setValue('laborBudget', event.target.value)}
                  error={errors.laborBudget}
                  required
                />
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  label="Materials Budget"
                  value={values.materialsBudget}
                  onChange={(event) => setValue('materialsBudget', event.target.value)}
                  error={errors.materialsBudget}
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Select
                  label="Completion Template"
                  value={values.completionTemplate}
                  onChange={(event) => setValue('completionTemplate', event.target.value)}
                  options={completionTemplateOptions}
                />
                <Select
                  label="Photo Proof Required"
                  value={values.photoProofRequired}
                  onChange={(event) => setValue('photoProofRequired', event.target.value)}
                  options={PROOF_OPTIONS}
                />
              </div>

              <div className="flex justify-end">
                <Button type="button" variant="secondary" onClick={() => setTemplateDrawerOpen(true)}>
                  <PlusSquare className="h-4 w-4" />
                  New Completion Template
                </Button>
              </div>

              <Textarea
                label="Completion Notes"
                value={values.completionNotes}
                onChange={(event) => setValue('completionNotes', event.target.value)}
                placeholder="Include sign-off expectations, QA checklist notes, or client communication details."
                rows={3}
              />
            </FormSection>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <FormSection
              title="Review Work Order"
              icon={<ClipboardCheck className="h-4 w-4" />}
              description="Verify details before creating the work order."
            >
              <dl className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Site</dt>
                  <dd className="text-sm font-medium text-foreground">{selectedSiteLabel}</dd>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Service Plan</dt>
                  <dd className="text-sm font-medium text-foreground">{selectedServiceLabel}</dd>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Priority</dt>
                  <dd className="text-sm font-medium text-foreground">{values.priority.toUpperCase()}</dd>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Crew Lead</dt>
                  <dd className="text-sm font-medium text-foreground">{selectedCrewLeadLabel}</dd>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Schedule</dt>
                  <dd className="text-sm font-medium text-foreground">
                    {values.scheduledDate || 'Not set'}{values.startTime ? ` (${values.startTime} - ${values.endTime})` : ''}
                  </dd>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Budget</dt>
                  <dd className="text-sm font-medium text-foreground">
                    Labor ${values.laborBudget || '0'} / Materials ${values.materialsBudget || '0'}
                  </dd>
                </div>
              </dl>

              <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-3 text-sm text-foreground">
                <p className="inline-flex items-center gap-2 font-medium">
                  <BriefcaseBusiness className="h-4 w-4 text-module-accent" aria-hidden="true" />
                  Scope
                </p>
                <p className="mt-1 text-muted-foreground">{values.scope || 'No scope details provided.'}</p>
              </div>

              <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-3 text-sm text-foreground">
                <p className="inline-flex items-center gap-2 font-medium">
                  <CalendarClock className="h-4 w-4 text-module-accent" aria-hidden="true" />
                  Completion Settings
                </p>
                <p className="mt-1 text-muted-foreground">
                  Template: {selectedCompletionTemplateLabel} - Photo proof: {values.photoProofRequired === 'yes' ? 'Required' : 'Optional'}
                </p>
              </div>

              {selectedServicePlan ? (
                <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-3 text-sm text-foreground">
                  <p className="inline-flex items-center gap-2 font-medium">
                    <MapPin className="h-4 w-4 text-module-accent" aria-hidden="true" />
                    Service Plan Mapping
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {selectedServicePlan.jobCode} - {selectedServicePlan.jobName}
                  </p>
                </div>
              ) : null}
            </FormSection>
          </div>
        )}
      </FormWizard>

      <CompletionTemplateForm
        open={templateDrawerOpen}
        onClose={() => setTemplateDrawerOpen(false)}
        onCreated={(template) => {
          setCompletionTemplateOptions((current) => (
            current.some((item) => item.value === template.value)
              ? current
              : [...current, template]
          ));
          setValue('completionTemplate', template.value);
          setTemplateDrawerOpen(false);
        }}
      />
    </SlideOver>
  );
}
