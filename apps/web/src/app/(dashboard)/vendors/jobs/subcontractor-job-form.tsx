'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { SlideOver, Input, Select, Textarea, Button } from '@gleamops/ui';
import type { SubcontractorJobAssignment } from '@gleamops/shared';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'CANCELED', label: 'Canceled' },
];

const BILLING_TYPE_OPTIONS = [
  { value: 'PER_SERVICE', label: 'Per Service' },
  { value: 'HOURLY', label: 'Hourly' },
  { value: 'FLAT_MONTHLY', label: 'Flat Monthly' },
  { value: 'PER_SQFT', label: 'Per Sq Ft' },
];

interface SubcontractorOption {
  value: string;
  label: string;
}

interface JobOption {
  value: string;
  label: string;
  site_id: string;
  site_name: string;
}

interface SubcontractorJobFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: SubcontractorJobAssignment | null;
  onSuccess?: () => void;
}

export function SubcontractorJobForm({ open, onClose, initialData, onSuccess }: SubcontractorJobFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();

  // Options
  const [subcontractors, setSubcontractors] = useState<SubcontractorOption[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);

  // Form values
  const [subcontractorId, setSubcontractorId] = useState(initialData?.subcontractor_id ?? '');
  const [siteJobId, setSiteJobId] = useState(initialData?.site_job_id ?? '');
  const [siteId, setSiteId] = useState(initialData?.site_id ?? '');
  const [billingRate, setBillingRate] = useState(initialData?.billing_rate?.toString() ?? '');
  const [billingType, setBillingType] = useState(initialData?.billing_type ?? 'PER_SERVICE');
  const [status, setStatus] = useState(initialData?.status ?? 'ACTIVE');
  const [startDate, setStartDate] = useState(initialData?.start_date ?? '');
  const [endDate, setEndDate] = useState(initialData?.end_date ?? '');
  const [scopeDescription, setScopeDescription] = useState(initialData?.scope_description ?? '');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch dropdown options
  useEffect(() => {
    if (!open) return;

    async function load() {
      const [subRes, jobRes] = await Promise.all([
        supabase
          .from('subcontractors')
          .select('id, subcontractor_code, company_name')
          .is('archived_at', null)
          .not('subcontractor_code', 'like', 'VEN-%')
          .order('company_name'),
        supabase
          .from('site_jobs')
          .select('id, job_code, job_name, site_id, site:sites!site_jobs_site_id_fkey(name)')
          .is('archived_at', null)
          .order('job_code'),
      ]);

      if (subRes.data) {
        setSubcontractors(
          subRes.data.map((s: Record<string, unknown>) => ({
            value: s.id as string,
            label: `${s.company_name} (${s.subcontractor_code})`,
          }))
        );
      }

      if (jobRes.data) {
        setJobs(
          jobRes.data.map((j: Record<string, unknown>) => ({
            value: j.id as string,
            label: `${j.job_code}${j.job_name ? ` — ${j.job_name}` : ''}`,
            site_id: j.site_id as string,
            site_name: (j.site as { name: string } | null)?.name ?? '',
          }))
        );
      }
    }

    load();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset form when opening
  useEffect(() => {
    if (open) {
      setSubcontractorId(initialData?.subcontractor_id ?? '');
      setSiteJobId(initialData?.site_job_id ?? '');
      setSiteId(initialData?.site_id ?? '');
      setBillingRate(initialData?.billing_rate?.toString() ?? '');
      setBillingType(initialData?.billing_type ?? 'PER_SERVICE');
      setStatus(initialData?.status ?? 'ACTIVE');
      setStartDate(initialData?.start_date ?? '');
      setEndDate(initialData?.end_date ?? '');
      setScopeDescription(initialData?.scope_description ?? '');
      setNotes('');
    }
  }, [open, initialData]);

  // Auto-fill site when job is selected
  useEffect(() => {
    if (!siteJobId) return;
    const job = jobs.find((j) => j.value === siteJobId);
    if (job) setSiteId(job.site_id);
  }, [siteJobId, jobs]);

  const selectedSiteName = jobs.find((j) => j.value === siteJobId)?.site_name ?? '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subcontractorId || !siteJobId) return;

    setLoading(true);
    try {
      const payload = {
        subcontractor_id: subcontractorId,
        site_job_id: siteJobId,
        site_id: siteId,
        billing_rate: billingRate ? parseFloat(billingRate) : null,
        billing_type: billingType,
        status,
        start_date: startDate || null,
        end_date: endDate || null,
        scope_description: scopeDescription || null,
        notes: notes || null,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('subcontractor_jobs')
          .update({
            billing_rate: payload.billing_rate,
            billing_type: payload.billing_type,
            status: payload.status,
            start_date: payload.start_date,
            end_date: payload.end_date,
            scope_description: payload.scope_description,
            notes: payload.notes,
          })
          .eq('id', initialData!.id);
        if (error) throw error;
        toast.success('Job assignment updated');
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const tenantId = user?.app_metadata?.tenant_id;
        const { error } = await supabase.from('subcontractor_jobs').insert({
          ...payload,
          tenant_id: tenantId,
        });
        if (error) throw error;
        toast.success('Job assigned to subcontractor');
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('SubcontractorJobForm submit error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save', { duration: Infinity });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Assignment' : 'Assign Job to Subcontractor'}
      subtitle={isEdit ? initialData?.job_code : undefined}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <Select
            label="Subcontractor"
            value={subcontractorId}
            onChange={(e) => setSubcontractorId(e.target.value)}
            placeholder="Select subcontractor..."
            options={subcontractors}
            disabled={isEdit}
            required
          />
          <Select
            label="Job"
            value={siteJobId}
            onChange={(e) => setSiteJobId(e.target.value)}
            placeholder="Select job..."
            options={jobs}
            disabled={isEdit}
            required
          />
          {selectedSiteName && (
            <Input label="Site" value={selectedSiteName} readOnly disabled hint="Auto-filled from job" />
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Billing</h3>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Billing Rate"
              type="number"
              step="0.01"
              value={billingRate}
              onChange={(e) => setBillingRate(e.target.value)}
              placeholder="0.00"
            />
            <Select
              label="Billing Type"
              value={billingType}
              onChange={(e) => setBillingType(e.target.value)}
              options={BILLING_TYPE_OPTIONS}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Schedule</h3>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={STATUS_OPTIONS}
          />
        </div>

        <div className="space-y-4">
          <Textarea
            label="Scope Description"
            value={scopeDescription}
            onChange={(e) => setScopeDescription(e.target.value)}
            placeholder="Describe the scope of work..."
          />
          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading} disabled={!subcontractorId || !siteJobId}>
            {isEdit ? 'Save Changes' : 'Assign Job'}
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
