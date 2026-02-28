'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button, Input, Select, SlideOver, Textarea } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';

interface ShiftFormProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  /** Pre-fill values when creating from a cell click */
  prefill?: {
    date?: string;
    staffName?: string;
  } | null;
}

interface SiteOption {
  id: string;
  name: string;
  site_code: string | null;
}

interface JobOption {
  id: string;
  job_code: string;
  job_name: string | null;
  start_time: string | null;
  end_time: string | null;
}

const DAYS = [
  { value: 'MON', label: 'Mon', jsDay: 1 },
  { value: 'TUE', label: 'Tue', jsDay: 2 },
  { value: 'WED', label: 'Wed', jsDay: 3 },
  { value: 'THU', label: 'Thu', jsDay: 4 },
  { value: 'FRI', label: 'Fri', jsDay: 5 },
  { value: 'SAT', label: 'Sat', jsDay: 6 },
  { value: 'SUN', label: 'Sun', jsDay: 0 },
] as const;

function toDateInputValue(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function nextDateForDay(startDate: Date, targetJsDay: number): Date {
  const base = new Date(startDate);
  const current = base.getDay();
  const delta = (targetJsDay - current + 7) % 7;
  base.setDate(base.getDate() + delta);
  base.setHours(0, 0, 0, 0);
  return base;
}

function computeDuration(start: string, end: string): string {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
  if (totalMinutes <= 0) totalMinutes += 24 * 60;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function ShiftForm({ open, onClose, onCreated, prefill }: ShiftFormProps) {
  const { tenantId } = useAuth();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [saving, setSaving] = useState(false);
  const [loadingSites, setLoadingSites] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);

  const [siteId, setSiteId] = useState('');
  const [jobId, setJobId] = useState('');
  const [positionCode, setPositionCode] = useState('GENERAL_SPECIALIST');
  const [requiredStaffCount, setRequiredStaffCount] = useState('1');
  const [startDate, setStartDate] = useState(() => toDateInputValue(new Date()));
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('22:00');
  const [weeksAhead, setWeeksAhead] = useState('1');
  const [selectedDays, setSelectedDays] = useState<string[]>(['MON', 'TUE', 'WED', 'THU', 'FRI']);
  const [note, setNote] = useState('');

  // Apply prefill when form opens
  useEffect(() => {
    if (!open || !prefill) return;
    if (prefill.date) setStartDate(prefill.date);
  }, [open, prefill]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    async function loadSites() {
      setLoadingSites(true);
      const { data, error } = await supabase
        .from('sites')
        .select('id, name, site_code')
        .is('archived_at', null)
        .order('name', { ascending: true })
        .limit(200);

      if (cancelled) return;

      if (error) {
        toast.error(error.message);
        setLoadingSites(false);
        return;
      }

      const options = (data ?? []) as SiteOption[];
      setSites(options);
      if (!siteId && options[0]) setSiteId(options[0].id);
      setLoadingSites(false);
    }

    void loadSites();

    return () => {
      cancelled = true;
    };
  }, [open, siteId, supabase]);

  const loadJobs = useCallback(async (nextSiteId: string) => {
    if (!nextSiteId) {
      setJobs([]);
      setJobId('');
      return;
    }

    setLoadingJobs(true);
    const { data, error } = await supabase
      .from('site_jobs')
      .select('id, job_code, job_name, start_time, end_time')
      .eq('site_id', nextSiteId)
      .is('archived_at', null)
      .order('job_code', { ascending: true })
      .limit(200);

    if (error) {
      toast.error(error.message);
      setLoadingJobs(false);
      return;
    }

    const options = (data ?? []) as JobOption[];
    setJobs(options);
    const first = options[0];
    setJobId(first?.id ?? '');
    if (first?.start_time) setStartTime(first.start_time.slice(0, 5));
    if (first?.end_time) setEndTime(first.end_time.slice(0, 5));
    setLoadingJobs(false);
  }, [supabase]);

  useEffect(() => {
    if (!open) return;
    void loadJobs(siteId);
  }, [loadJobs, open, siteId]);

  useEffect(() => {
    if (!open) return;
    const selectedJob = jobs.find((job) => job.id === jobId);
    if (!selectedJob) return;
    if (selectedJob.start_time) setStartTime(selectedJob.start_time.slice(0, 5));
    if (selectedJob.end_time) setEndTime(selectedJob.end_time.slice(0, 5));
  }, [jobId, jobs, open]);

  const toggleDay = (day: string) => {
    setSelectedDays((current) => (
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day]
    ));
  };

  async function handleCreate() {
    if (!tenantId) {
      toast.error('Unable to detect tenant context.');
      return;
    }
    if (!siteId || !jobId) {
      toast.error('Select a site and service plan.');
      return;
    }
    if (!selectedDays.length) {
      toast.error('Select at least one weekday.');
      return;
    }

    const weeks = Math.max(1, Math.min(Number(weeksAhead) || 1, 8));
    const requiredStaff = Math.max(1, Number(requiredStaffCount) || 1);
    const start = new Date(`${startDate}T00:00:00`);

    setSaving(true);

    const inserts: Array<Record<string, unknown>> = [];
    for (const dayCode of selectedDays) {
      const day = DAYS.find((entry) => entry.value === dayCode);
      if (!day) continue;

      const firstDate = nextDateForDay(start, day.jsDay);

      for (let weekOffset = 0; weekOffset < weeks; weekOffset += 1) {
        const scheduledDate = new Date(firstDate);
        scheduledDate.setDate(firstDate.getDate() + weekOffset * 7);

        inserts.push({
          tenant_id: tenantId,
          job_id: jobId,
          site_id: siteId,
          scheduled_date: toDateInputValue(scheduledDate),
          start_time: `${startTime}:00`,
          end_time: `${endTime}:00`,
          status: 'SCHEDULED',
          required_staff_count: requiredStaff,
          position_code: positionCode,
          planning_status: 'NOT_STARTED',
          note: note.trim() || null,
        });
      }
    }

    const { error } = await supabase
      .from('work_tickets')
      .insert(inserts);

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(`Created ${inserts.length} recurring shift ticket${inserts.length === 1 ? '' : 's'}.`);
    onCreated();
    onClose();
  }

  return (
    <SlideOver open={open} onClose={onClose} title="Create Recurring Shift" wide>
      <div className="space-y-4 p-1">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Site"
            value={siteId}
            onChange={(event) => setSiteId(event.target.value)}
            options={sites.map((site) => ({
              value: site.id,
              label: site.site_code ? `${site.site_code} · ${site.name}` : site.name,
            }))}
            disabled={loadingSites}
          />
          <Select
            label="Service Plan"
            value={jobId}
            onChange={(event) => setJobId(event.target.value)}
            options={jobs.map((job) => ({
              value: job.id,
              label: job.job_name ? `${job.job_code} · ${job.job_name}` : job.job_code,
            }))}
            disabled={loadingJobs || !siteId}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Position Code"
            value={positionCode}
            onChange={(event) => setPositionCode(event.target.value)}
            placeholder="FLOOR_SPECIALIST"
          />
          <Input
            label="Required Staff"
            type="number"
            min={1}
            value={requiredStaffCount}
            onChange={(event) => setRequiredStaffCount(event.target.value)}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
          <Input
            label="Start Time"
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
          />
          <Input
            label="End Time"
            type="time"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
          />
          <Input
            label="Weeks Ahead"
            type="number"
            min={1}
            max={8}
            value={weeksAhead}
            onChange={(event) => setWeeksAhead(event.target.value)}
          />
        </div>

        {startTime && endTime && (
          <p className="text-sm text-muted-foreground">
            Shift duration: <span className="font-medium text-foreground">{computeDuration(startTime, endTime)}</span>
          </p>
        )}

        <Textarea
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Special instructions for this shift..."
          rows={2}
        />

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Recurring Days</p>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => {
              const selected = selectedDays.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                    selected
                      ? 'border-module-accent bg-module-accent/15 text-module-accent'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleCreate} loading={saving}>
            Create Recurring Shift
          </Button>
        </div>
      </div>
    </SlideOver>
  );
}
