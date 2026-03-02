'use client';

import { useCallback, useEffect, useState } from 'react';
import { Clock, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRole } from '@/hooks/use-role';
import { normalizeRoleCode } from '@gleamops/shared';
import { SlideOver, Input, Select, Button, FormSection } from '@gleamops/ui';
import { formatTimeEventNotes } from '@/lib/timekeeping/breaks';

interface StaffOption {
  value: string;
  label: string;
}

interface SiteOption {
  id: string;
  name: string;
  site_code: string;
}

interface TicketOption {
  id: string;
  ticket_code: string;
}

interface AddClockTimeProps {
  search: string;
  onSaved?: () => void;
}

const INITIAL_VALUES = {
  staff_id: '',
  date: new Date().toISOString().slice(0, 10),
  start_time: '08:00',
  end_time: '17:00',
  site_id: '',
  ticket_id: '',
  break_minutes: 0,
  notes: '',
};

export default function AddClockTime({ search: _search, onSaved }: AddClockTimeProps) {
  const { role } = useRole();
  const normalizedRole = normalizeRoleCode(role);
  const canManage =
    normalizedRole === 'OWNER_ADMIN' ||
    normalizedRole === 'MANAGER' ||
    normalizedRole === 'SUPERVISOR';

  const [formOpen, setFormOpen] = useState(false);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [siteOptions, setSiteOptions] = useState<SiteOption[]>([]);
  const [ticketOptions, setTicketOptions] = useState<TicketOption[]>([]);
  const [values, setValues] = useState(INITIAL_VALUES);
  const [submitting, setSubmitting] = useState(false);

  const setValue = <K extends keyof typeof INITIAL_VALUES>(key: K, val: (typeof INITIAL_VALUES)[K]) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const loadDropdowns = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const [staffRes, siteRes] = await Promise.all([
      supabase
        .from('staff')
        .select('id, full_name, staff_code')
        .is('archived_at', null)
        .eq('staff_status', 'ACTIVE')
        .order('full_name'),
      supabase
        .from('sites')
        .select('id, name, site_code')
        .is('archived_at', null)
        .order('name'),
    ]);

    if (staffRes.data) {
      setStaffOptions(
        staffRes.data.map((s) => ({
          value: s.id,
          label: `${s.full_name} (${s.staff_code})`,
        }))
      );
    }
    if (siteRes.data) {
      setSiteOptions(siteRes.data as SiteOption[]);
    }
  }, []);

  useEffect(() => {
    if (formOpen) {
      loadDropdowns();
      setTicketOptions([]);
    }
  }, [formOpen, loadDropdowns]);

  // Load tickets when site changes
  useEffect(() => {
    if (!values.site_id) {
      setTicketOptions([]);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    supabase
      .from('work_tickets')
      .select('id, ticket_code')
      .eq('site_id', values.site_id)
      .is('archived_at', null)
      .order('ticket_code')
      .then(({ data }) => {
        if (data) setTicketOptions(data as TicketOption[]);
      });
  }, [values.site_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!values.staff_id) {
      toast.error('Please select a staff member.');
      return;
    }
    if (!values.notes.trim()) {
      toast.error('Please provide a reason for the manual entry.');
      return;
    }

    setSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const tenantId = user.app_metadata?.tenant_id;
      const startAt = `${values.date}T${values.start_time}:00`;
      const endAt = `${values.date}T${values.end_time}:00`;

      const startMs = new Date(startAt).getTime();
      const endMs = new Date(endAt).getTime();
      if (endMs <= startMs) {
        toast.error('End time must be after start time.');
        setSubmitting(false);
        return;
      }

      const shiftMinutes = Math.round((endMs - startMs) / 60000);
      const durationMinutes = Math.max(0, shiftMinutes - values.break_minutes);

      // 1. Insert time_event (MANUAL_ADJUSTMENT)
      const { data: timeEvent, error: eventError } = await supabase
        .from('time_events')
        .insert({
          tenant_id: tenantId,
          staff_id: values.staff_id,
          site_id: values.site_id || null,
          event_type: 'MANUAL_ADJUSTMENT',
          recorded_at: new Date().toISOString(),
          lat: null,
          lng: null,
          accuracy_meters: null,
          is_within_geofence: null,
          pin_used: false,
          notes: formatTimeEventNotes({
            source: 'TEAM_ATTENDANCE',
            action: 'MANUAL_ADD',
            reason: values.notes,
          }),
        })
        .select('id')
        .single();

      if (eventError || !timeEvent) {
        throw new Error(eventError?.message ?? 'Failed to create time event.');
      }

      // 2. Insert time_entry (CLOSED)
      const { error: entryError } = await supabase
        .from('time_entries')
        .insert({
          tenant_id: tenantId,
          staff_id: values.staff_id,
          site_id: values.site_id || null,
          ticket_id: values.ticket_id || null,
          check_in_event_id: timeEvent.id,
          start_at: startAt,
          end_at: endAt,
          clock_in: startAt,
          clock_in_at: startAt,
          clock_out: endAt,
          clock_out_at: endAt,
          break_minutes: values.break_minutes,
          duration_minutes: durationMinutes,
          status: 'CLOSED',
        });

      if (entryError) {
        throw new Error(entryError.message);
      }

      toast.success('Manual time entry added successfully.');
      setFormOpen(false);
      setValues(INITIAL_VALUES);
      onSaved?.();
    } catch (err) {
      console.error('Add clock time error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to add time entry.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canManage) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center">
        <p className="text-sm text-muted-foreground">Only managers and supervisors can add manual clock time.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Manually add time entries for staff who missed a clock-in or need corrections.
        </p>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Clock Time
        </Button>
      </div>

      <div className="rounded-xl border border-dashed border-border p-12 text-center">
        <Clock className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-foreground mb-1">Manual Time Entries</p>
        <p className="text-xs text-muted-foreground">
          Use the &quot;Add Clock Time&quot; button to create manual entries for staff.
          These entries will appear in the Overview tab.
        </p>
      </div>

      <SlideOver
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Add Clock Time"
      >
        <form onSubmit={handleSubmit} className="space-y-8">
          <FormSection
            title="Entry Details"
            icon={<Clock className="h-4 w-4" />}
            description="Create a manual time entry for a staff member."
          >
            <Select
              label="Staff Member"
              value={values.staff_id}
              onChange={(e) => setValue('staff_id', e.target.value)}
              options={[{ value: '', label: 'Select staff...' }, ...staffOptions]}
              required
            />
            <Input
              label="Date"
              type="date"
              value={values.date}
              onChange={(e) => setValue('date', e.target.value)}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Start Time"
                type="time"
                value={values.start_time}
                onChange={(e) => setValue('start_time', e.target.value)}
                required
              />
              <Input
                label="End Time"
                type="time"
                value={values.end_time}
                onChange={(e) => setValue('end_time', e.target.value)}
                required
              />
            </div>
            <Select
              label="Site (optional)"
              value={values.site_id}
              onChange={(e) => {
                setValue('site_id', e.target.value);
                setValue('ticket_id', '');
              }}
              options={[
                { value: '', label: 'No site' },
                ...siteOptions.map((s) => ({
                  value: s.id,
                  label: `${s.name} (${s.site_code})`,
                })),
              ]}
            />
            {ticketOptions.length > 0 && (
              <Select
                label="Work Ticket (optional)"
                value={values.ticket_id}
                onChange={(e) => setValue('ticket_id', e.target.value)}
                options={[
                  { value: '', label: 'No ticket' },
                  ...ticketOptions.map((t) => ({
                    value: t.id,
                    label: t.ticket_code,
                  })),
                ]}
              />
            )}
            <Input
              label="Break Minutes"
              type="number"
              value={values.break_minutes}
              onChange={(e) => setValue('break_minutes', Math.max(0, Number(e.target.value) || 0))}
              hint="Deducted from total duration"
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={values.notes}
                onChange={(e) => setValue('notes', e.target.value)}
                placeholder="Explain why this manual entry is needed..."
                rows={3}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </FormSection>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="secondary" type="button" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Add Entry
            </Button>
          </div>
        </form>
      </SlideOver>
    </>
  );
}
