'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { fetchJsonWithSupabaseAuth } from '@/lib/supabase/authenticated-fetch';
import { SlideOver, Input, Select, Button, FormSection } from '@gleamops/ui';
import type { SchedulePolicy, EnforcementMode } from '@gleamops/shared';

interface SchedulePolicyFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: SchedulePolicy | null;
  siteId: string | null;
  onSuccess?: () => void;
}

const ENFORCEMENT_OPTIONS = [
  { value: 'warn', label: 'Warn — show warning but allow' },
  { value: 'block', label: 'Block — prevent action' },
  { value: 'override_required', label: 'Override Required — block unless manager overrides' },
];

const DEFAULTS = {
  min_rest_hours: 8,
  max_weekly_hours: 40,
  overtime_warning_at_hours: 38,
  rest_enforcement: 'warn' as EnforcementMode,
  weekly_hours_enforcement: 'warn' as EnforcementMode,
  subcontractor_capacity_enforcement: 'warn' as EnforcementMode,
  availability_enforcement: 'warn' as EnforcementMode,
};

export function SchedulePolicyForm({
  open,
  onClose,
  initialData,
  siteId,
  onSuccess,
}: SchedulePolicyFormProps) {
  const supabase = getSupabaseBrowserClient();
  const isEdit = !!initialData?.id;

  const [minRestHours, setMinRestHours] = useState(DEFAULTS.min_rest_hours);
  const [maxWeeklyHours, setMaxWeeklyHours] = useState(DEFAULTS.max_weekly_hours);
  const [overtimeWarning, setOvertimeWarning] = useState(DEFAULTS.overtime_warning_at_hours);
  const [restEnforcement, setRestEnforcement] = useState<EnforcementMode>(DEFAULTS.rest_enforcement);
  const [weeklyHoursEnforcement, setWeeklyHoursEnforcement] = useState<EnforcementMode>(DEFAULTS.weekly_hours_enforcement);
  const [subCapacityEnforcement, setSubCapacityEnforcement] = useState<EnforcementMode>(DEFAULTS.subcontractor_capacity_enforcement);
  const [availabilityEnforcement, setAvailabilityEnforcement] = useState<EnforcementMode>(DEFAULTS.availability_enforcement);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      setMinRestHours(initialData.min_rest_hours);
      setMaxWeeklyHours(initialData.max_weekly_hours);
      setOvertimeWarning(initialData.overtime_warning_at_hours);
      setRestEnforcement(initialData.rest_enforcement);
      setWeeklyHoursEnforcement(initialData.weekly_hours_enforcement);
      setSubCapacityEnforcement(initialData.subcontractor_capacity_enforcement);
      setAvailabilityEnforcement(initialData.availability_enforcement);
    } else {
      setMinRestHours(DEFAULTS.min_rest_hours);
      setMaxWeeklyHours(DEFAULTS.max_weekly_hours);
      setOvertimeWarning(DEFAULTS.overtime_warning_at_hours);
      setRestEnforcement(DEFAULTS.rest_enforcement);
      setWeeklyHoursEnforcement(DEFAULTS.weekly_hours_enforcement);
      setSubCapacityEnforcement(DEFAULTS.subcontractor_capacity_enforcement);
      setAvailabilityEnforcement(DEFAULTS.availability_enforcement);
    }
  }, [open, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetchJsonWithSupabaseAuth(supabase, '/api/schedule/policies', {
        method: 'PUT',
        body: JSON.stringify({
          site_id: siteId || null,
          min_rest_hours: minRestHours,
          max_weekly_hours: maxWeeklyHours,
          overtime_warning_at_hours: overtimeWarning,
          rest_enforcement: restEnforcement,
          weekly_hours_enforcement: weeklyHoursEnforcement,
          subcontractor_capacity_enforcement: subCapacityEnforcement,
          availability_enforcement: availabilityEnforcement,
        }),
      });
      toast.success(isEdit ? 'Policy updated.' : 'Policy created.');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save policy');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Schedule Policy' : 'Create Schedule Policy'}
      subtitle={siteId ? 'Site-specific override' : 'Global (tenant-wide)'}
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        <FormSection
          title="Thresholds"
          icon={<ShieldCheck className="h-4 w-4" />}
          description="Numeric limits for scheduling rules."
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Min Rest Hours"
              type="number"
              value={minRestHours}
              onChange={(e) => setMinRestHours(Number(e.target.value))}
            />
            <Input
              label="Max Weekly Hours"
              type="number"
              value={maxWeeklyHours}
              onChange={(e) => setMaxWeeklyHours(Number(e.target.value))}
            />
            <Input
              label="Overtime Warning At"
              type="number"
              value={overtimeWarning}
              onChange={(e) => setOvertimeWarning(Number(e.target.value))}
            />
          </div>
        </FormSection>

        <FormSection
          title="Enforcement Rules"
          icon={<ShieldCheck className="h-4 w-4" />}
          description="How each rule is enforced when a conflict is detected."
        >
          <Select
            label="Rest Period"
            value={restEnforcement}
            onChange={(e) => setRestEnforcement(e.target.value as EnforcementMode)}
            options={ENFORCEMENT_OPTIONS}
          />
          <Select
            label="Weekly Hours"
            value={weeklyHoursEnforcement}
            onChange={(e) => setWeeklyHoursEnforcement(e.target.value as EnforcementMode)}
            options={ENFORCEMENT_OPTIONS}
          />
          <Select
            label="Subcontractor Capacity"
            value={subCapacityEnforcement}
            onChange={(e) => setSubCapacityEnforcement(e.target.value as EnforcementMode)}
            options={ENFORCEMENT_OPTIONS}
          />
          <Select
            label="Availability"
            value={availabilityEnforcement}
            onChange={(e) => setAvailabilityEnforcement(e.target.value as EnforcementMode)}
            options={ENFORCEMENT_OPTIONS}
          />
        </FormSection>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>
            {isEdit ? 'Save Changes' : 'Create Policy'}
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
