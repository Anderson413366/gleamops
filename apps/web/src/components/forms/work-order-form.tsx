'use client';

import { useMemo, useState } from 'react';
import {
  BriefcaseBusiness,
  CalendarClock,
  ClipboardCheck,
  DollarSign,
  MapPin,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  FormSection,
  FormWizard,
  Input,
  Select,
  SlideOver,
  Textarea,
  useWizardSteps,
} from '@gleamops/ui';

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

const STEPS = [
  { id: 'site-service', title: 'Site & Service', description: 'Choose site scope and service package' },
  { id: 'schedule-crew', title: 'Schedule & Crew', description: 'Plan timing and assigned team' },
  { id: 'financial-completion', title: 'Financial & Completion', description: 'Set budget and completion rules' },
  { id: 'review', title: 'Review', description: 'Confirm and submit work order' },
] as const;

const SITE_OPTIONS = [
  { value: '', label: 'Select a site...' },
  { value: 'site-018', label: 'Site 018 - Pine Medical' },
  { value: 'site-042', label: 'Site 042 - Midtown Plaza' },
  { value: 'site-099', label: 'Site 099 - Atlas Financial' },
];

const SERVICE_OPTIONS = [
  { value: '', label: 'Select service package...' },
  { value: 'strip-wax', label: 'Strip & Wax' },
  { value: 'window-clean', label: 'Window Cleaning' },
  { value: 'carpet-extract', label: 'Carpet Extraction' },
  { value: 'deep-restroom', label: 'Deep Restroom Reset' },
];

const PRIORITY_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'high', label: 'High' },
  { value: 'asap', label: 'ASAP (Urgent)' },
];

const CREW_LEAD_OPTIONS = [
  { value: '', label: 'Select crew lead...' },
  { value: 'maria-lopez', label: 'Maria Lopez' },
  { value: 'daniel-garcia', label: 'Daniel Garcia' },
  { value: 'katie-huang', label: 'Katie Huang' },
];

const COMPLETION_TEMPLATE_OPTIONS = [
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

interface WorkOrderFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (data: WorkOrderFormData) => void;
  initialValues?: Partial<WorkOrderFormData>;
}

function mergeInitialValues(initialValues?: Partial<WorkOrderFormData>) {
  return {
    ...DEFAULT_VALUES,
    ...initialValues,
  };
}

export function WorkOrderForm({ open, onClose, onSuccess, initialValues }: WorkOrderFormProps) {
  const { currentStep, goToStep, reset } = useWizardSteps(STEPS.length);
  const [values, setValues] = useState<WorkOrderFormData>(() => mergeInitialValues(initialValues));
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const selectedSiteLabel = useMemo(() => SITE_OPTIONS.find((site) => site.value === values.siteId)?.label ?? 'Not selected', [values.siteId]);
  const selectedServiceLabel = useMemo(() => SERVICE_OPTIONS.find((service) => service.value === values.serviceType)?.label ?? 'Not selected', [values.serviceType]);
  const selectedCrewLeadLabel = useMemo(() => CREW_LEAD_OPTIONS.find((lead) => lead.value === values.crewLead)?.label ?? 'Not assigned', [values.crewLead]);

  const setValue = (field: FieldName, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateStep = (step: number) => {
    const nextErrors: FormErrors = {};

    if (step === 0) {
      if (!values.siteId) nextErrors.siteId = 'Site is required.';
      if (!values.serviceType) nextErrors.serviceType = 'Service package is required.';
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
    if (!validateStep(2)) {
      return;
    }

    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 250));
      toast.success('Work order drafted successfully', { duration: 2500 });
      onSuccess?.(values);
      handleClose();
    } catch {
      toast.error('Unable to create work order right now.');
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
                  options={SITE_OPTIONS}
                  error={errors.siteId}
                  required
                />
                <Select
                  label="Service Package"
                  value={values.serviceType}
                  onChange={(event) => setValue('serviceType', event.target.value)}
                  options={SERVICE_OPTIONS}
                  error={errors.serviceType}
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
                  options={CREW_LEAD_OPTIONS}
                  error={errors.crewLead}
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
                  options={COMPLETION_TEMPLATE_OPTIONS}
                />
                <Select
                  label="Photo Proof Required"
                  value={values.photoProofRequired}
                  onChange={(event) => setValue('photoProofRequired', event.target.value)}
                  options={PROOF_OPTIONS}
                />
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
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Service</dt>
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
                    {values.scheduledDate || 'Not set'} {values.startTime ? `(${values.startTime} - ${values.endTime})` : ''}
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
                  Template: {values.completionTemplate} · Photo proof: {values.photoProofRequired === 'yes' ? 'Required' : 'Optional'}
                </p>
              </div>
            </FormSection>
          </div>
        )}
      </FormWizard>
    </SlideOver>
  );
}
