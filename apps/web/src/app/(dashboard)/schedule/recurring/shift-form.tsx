'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Search, Trash2, UserPlus } from 'lucide-react';
import { Button, Input, Select, SlideOver, Textarea, Badge, ConfirmDialog } from '@gleamops/ui';
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
  /** When provided, form opens in edit mode */
  initialData?: {
    id: string;
    version_etag?: string;
    siteId: string;
    jobId: string;
    positionCode: string;
    requiredStaff: number;
    startDate: string;
    startTime: string;
    endTime: string;
    weeksAhead: number;
    selectedDays: string[];
    note: string;
    title: string;
    openSlots: number;
    breakMinutes: number;
    breakPaid: boolean;
    remoteSite: string;
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

interface StaffCandidate {
  id: string;
  full_name: string;
  staff_code: string;
  status: 'available' | 'overlapping' | 'multiple-conflicts';
  conflict_detail?: string;
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

export function ShiftForm({ open, onClose, onCreated, prefill, initialData }: ShiftFormProps) {
  const { tenantId } = useAuth();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const isEdit = !!initialData?.id;
  const [saving, setSaving] = useState(false);
  const [loadingSites, setLoadingSites] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);

  // Form fields
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [siteId, setSiteId] = useState(initialData?.siteId ?? '');
  const [jobId, setJobId] = useState(initialData?.jobId ?? '');
  const [positionCode, setPositionCode] = useState(initialData?.positionCode ?? 'GENERAL_SPECIALIST');
  const [requiredStaffCount, setRequiredStaffCount] = useState(String(initialData?.requiredStaff ?? 1));
  const [startDate, setStartDate] = useState(initialData?.startDate ?? toDateInputValue(new Date()));
  const [startTime, setStartTime] = useState(initialData?.startTime ?? '18:00');
  const [endTime, setEndTime] = useState(initialData?.endTime ?? '22:00');
  const [weeksAhead, setWeeksAhead] = useState(String(initialData?.weeksAhead ?? 1));
  const [selectedDays, setSelectedDays] = useState<string[]>(initialData?.selectedDays ?? ['MON', 'TUE', 'WED', 'THU', 'FRI']);
  const [note, setNote] = useState(initialData?.note ?? '');

  // New fields
  const [openSlots, setOpenSlots] = useState(String(initialData?.openSlots ?? 0));
  const [breakMinutes, setBreakMinutes] = useState(String(initialData?.breakMinutes ?? 0));
  const [breakPaid, setBreakPaid] = useState(initialData?.breakPaid ?? false);
  const [remoteSite, setRemoteSite] = useState(initialData?.remoteSite ?? '');

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Employee assignment panel
  const [staffSearch, setStaffSearch] = useState('');
  const [assignedStaff, setAssignedStaff] = useState<StaffCandidate[]>([]);
  const [availableStaff, setAvailableStaff] = useState<StaffCandidate[]>([]);
  const [overlappingStaff] = useState<StaffCandidate[]>([]);

  // Apply prefill when form opens
  useEffect(() => {
    if (!open || !prefill) return;
    if (prefill.date) setStartDate(prefill.date);
  }, [open, prefill]);

  // Reset form fields when initialData changes (opening form for a different shift)
  useEffect(() => {
    if (!open) return;
    setTitle(initialData?.title ?? '');
    setSiteId(initialData?.siteId ?? '');
    setJobId(initialData?.jobId ?? '');
    setPositionCode(initialData?.positionCode ?? 'GENERAL_SPECIALIST');
    setRequiredStaffCount(String(initialData?.requiredStaff ?? 1));
    setStartDate(initialData?.startDate ?? toDateInputValue(new Date()));
    setStartTime(initialData?.startTime ?? '18:00');
    setEndTime(initialData?.endTime ?? '22:00');
    setWeeksAhead(String(initialData?.weeksAhead ?? 1));
    setSelectedDays(initialData?.selectedDays ?? ['MON', 'TUE', 'WED', 'THU', 'FRI']);
    setNote(initialData?.note ?? '');
    setOpenSlots(String(initialData?.openSlots ?? 0));
    setBreakMinutes(String(initialData?.breakMinutes ?? 0));
    setBreakPaid(initialData?.breakPaid ?? false);
    setRemoteSite(initialData?.remoteSite ?? '');
  }, [open, initialData]);

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

  // Load available staff for employee assignment
  useEffect(() => {
    if (!open || !positionCode) return;
    let cancelled = false;

    async function loadStaffCandidates() {
      // Fetch eligible staff for this position
      const { data: eligible } = await supabase
        .from('staff_eligible_positions')
        .select('staff_id, staff:staff_id(id, full_name, staff_code)')
        .eq('position_code', positionCode)
        .is('archived_at', null);

      if (cancelled) return;

      const candidates: StaffCandidate[] = ((eligible ?? []) as Array<Record<string, unknown>>).map((e) => {
        const staff = e.staff as { id: string; full_name: string; staff_code: string } | null;
        return {
          id: staff?.id ?? (e.staff_id as string),
          full_name: staff?.full_name ?? 'Unknown',
          staff_code: staff?.staff_code ?? '',
          status: 'available' as const,
        };
      });

      if (!cancelled) setAvailableStaff(candidates);
    }

    void loadStaffCandidates();
    return () => { cancelled = true; };
  }, [open, positionCode, supabase]);

  const filteredAvailable = useMemo(() => {
    if (!staffSearch) return availableStaff;
    const q = staffSearch.toLowerCase();
    return availableStaff.filter((s) =>
      s.full_name.toLowerCase().includes(q) || s.staff_code.toLowerCase().includes(q),
    );
  }, [availableStaff, staffSearch]);

  const toggleDay = (day: string) => {
    setSelectedDays((current) => (
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day]
    ));
  };

  const assignStaff = (staff: StaffCandidate) => {
    setAssignedStaff((prev) => [...prev, staff]);
    setAvailableStaff((prev) => prev.filter((s) => s.id !== staff.id));
  };

  const unassignStaff = (staff: StaffCandidate) => {
    setAvailableStaff((prev) => [...prev, staff]);
    setAssignedStaff((prev) => prev.filter((s) => s.id !== staff.id));
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

    const requiredStaff = Math.max(1, Number(requiredStaffCount) || 1);

    setSaving(true);

    // Edit mode: update the existing work_ticket
    if (isEdit && initialData?.id) {
      const { error } = await supabase
        .from('work_tickets')
        .update({
          site_id: siteId,
          job_id: jobId,
          position_code: positionCode,
          start_time: `${startTime}:00`,
          end_time: `${endTime}:00`,
          scheduled_date: startDate,
          required_staff_count: requiredStaff,
          note: [title, note].filter(Boolean).join(' — ').trim() || null,
        })
        .eq('id', initialData.id);

      setSaving(false);

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('Shift updated.');
      onCreated();
      onClose();
      return;
    }

    const weeks = Math.max(1, Math.min(Number(weeksAhead) || 1, 8));
    const start = new Date(`${startDate}T00:00:00`);

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
          note: [title, note].filter(Boolean).join(' — ').trim() || null,
        });
      }
    }

    const { data: newTickets, error } = await supabase
      .from('work_tickets')
      .insert(inserts)
      .select('id');

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    // Create assignments for assigned staff
    if (assignedStaff.length > 0 && newTickets && newTickets.length > 0) {
      const assignmentInserts = [];
      for (const ticket of newTickets) {
        for (const staff of assignedStaff) {
          assignmentInserts.push({
            tenant_id: tenantId,
            ticket_id: ticket.id,
            staff_id: staff.id,
            assignment_status: 'ASSIGNED',
            assignment_type: 'DIRECT',
            role: positionCode,
          });
        }
      }
      if (assignmentInserts.length > 0) {
        await supabase.from('ticket_assignments').insert(assignmentInserts);
      }
    }

    setSaving(false);

    toast.success(`Created ${inserts.length} recurring shift ticket${inserts.length === 1 ? '' : 's'}.`);
    onCreated();
    onClose();
  }

  async function handleDelete() {
    if (!initialData?.id) return;
    setSaving(true);
    let query = supabase
      .from('work_tickets')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', initialData.id);
    if (initialData.version_etag) {
      query = query.eq('version_etag', initialData.version_etag);
    }
    const { error } = await query;
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Shift deleted.');
    onCreated();
    onClose();
  }

  return (
    <SlideOver open={open} onClose={onClose} title={isEdit ? 'Edit Recurring Shift' : 'Create Recurring Shift'} wide>
      <div className="flex gap-6 p-1">
        {/* Left column — Form fields */}
        <div className="flex-1 space-y-4 min-w-0">
          <Input
            label="Shift Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Evening Floor Shift"
          />

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

          {/* Break management */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              label="Break Duration"
              value={breakMinutes}
              onChange={(e) => setBreakMinutes(e.target.value)}
              options={[
                { value: '0', label: 'No break' },
                { value: '15', label: '15 min' },
                { value: '30', label: '30 min' },
                { value: '45', label: '45 min' },
                { value: '60', label: '60 min' },
              ]}
            />
            <div className="flex items-end gap-2 pb-0.5">
              <label className="text-sm font-medium text-foreground">Paid Break</label>
              <button
                type="button"
                onClick={() => setBreakPaid(!breakPaid)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  breakPaid ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${breakPaid ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <Input
              label="Open Slots"
              type="number"
              min={0}
              value={openSlots}
              onChange={(e) => setOpenSlots(e.target.value)}
              placeholder="Max open slots"
            />
          </div>

          {/* Remote site */}
          <Select
            label="Remote Site"
            value={remoteSite}
            onChange={(e) => setRemoteSite(e.target.value)}
            options={[
              { value: '', label: 'No remote site' },
              ...sites.map((site) => ({
                value: site.id,
                label: site.site_code ? `${site.site_code} · ${site.name}` : site.name,
              })),
            ]}
          />

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

          <div className="flex items-center justify-between">
            {isEdit && (
              <Button variant="danger" onClick={() => setDeleteConfirmOpen(true)} loading={saving}>
                <Trash2 className="h-4 w-4" />
                Delete Shift
              </Button>
            )}
            <div className="flex justify-end flex-1">
              <Button onClick={handleCreate} loading={saving}>
                {isEdit ? 'Update Shift' : 'Create Recurring Shift'}
              </Button>
            </div>
          </div>
        </div>

        {/* Right column — Employee Assignment Panel */}
        <div className="w-72 shrink-0 border-l border-border pl-4 space-y-4 hidden lg:block">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Employee Assignment</h3>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
              placeholder="Search by Employee Name"
              className="w-full rounded-lg border border-border bg-card pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Who Is Working */}
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground mb-2">
              Who Is Working ({assignedStaff.length})
            </p>
            {assignedStaff.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No staff assigned yet.</p>
            ) : (
              <div className="space-y-1.5">
                {assignedStaff.map((staff) => (
                  <div key={staff.id} className="flex items-center justify-between rounded-md border border-border px-2 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center text-[11px] font-medium text-green-700 shrink-0">
                        {staff.full_name.charAt(0)}
                      </div>
                      <span className="text-xs text-foreground truncate">{staff.full_name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => unassignStaff(staff)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available */}
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground mb-2">
              Available ({filteredAvailable.length})
            </p>
            {filteredAvailable.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No eligible staff found for this position.</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {filteredAvailable.map((staff) => (
                  <div key={staff.id} className="flex items-center justify-between rounded-md border border-border px-2 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[11px] font-medium text-muted-foreground shrink-0">
                        {staff.full_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs text-foreground truncate block">{staff.full_name}</span>
                        <Badge color="green" className="text-[9px]">Available</Badge>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => assignStaff(staff)}
                      className="text-green-600 hover:text-green-800 shrink-0"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Overlapping */}
          {overlappingStaff.length > 0 && (
            <div>
              <p className="text-xs font-medium tracking-wide text-amber-600 mb-2">
                Overlapping ({overlappingStaff.length})
              </p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {overlappingStaff.map((staff) => (
                  <div key={staff.id} className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-2 py-1.5">
                    <div className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center text-[11px] font-medium text-amber-700 shrink-0">
                      {staff.full_name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs text-amber-800 dark:text-amber-300 truncate block">{staff.full_name}</span>
                      {staff.conflict_detail && (
                        <span className="text-[11px] text-amber-600 dark:text-amber-400">{staff.conflict_detail}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => {
          setDeleteConfirmOpen(false);
          handleDelete();
        }}
        title="Delete Shift"
        description="Are you sure you want to delete this shift? This action will archive the work ticket and remove it from the schedule."
        confirmLabel="Delete Shift"
        variant="danger"
      />
    </SlideOver>
  );
}
