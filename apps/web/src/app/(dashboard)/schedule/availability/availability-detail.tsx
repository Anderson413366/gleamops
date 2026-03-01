'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Button, Input, Select, SlideOver, Textarea } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';

interface AvailabilityRule {
  id: string;
  staff_id: string;
  staff_name: string;
  staff_code: string | null;
  rule_type: 'WEEKLY_RECURRING' | 'ONE_OFF';
  availability_type: 'AVAILABLE' | 'UNAVAILABLE';
  weekday: string | null;
  start_time: string | null;
  end_time: string | null;
  one_off_start: string | null;
  one_off_end: string | null;
  notes: string | null;
}

interface AvailabilityDetailProps {
  open: boolean;
  onClose: () => void;
  rule: AvailabilityRule | null;
  onSaved: () => void;
}

const WEEKDAY_OPTIONS = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

export function AvailabilityDetail({ open, onClose, rule, onSaved }: AvailabilityDetailProps) {
  const { tenantId } = useAuth();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [saving, setSaving] = useState(false);

  const [isAvailable, setIsAvailable] = useState(rule?.availability_type === 'AVAILABLE');
  const [ruleType, setRuleType] = useState<'WEEKLY_RECURRING' | 'ONE_OFF'>(rule?.rule_type ?? 'WEEKLY_RECURRING');
  const [weekday, setWeekday] = useState(rule?.weekday ?? '1');
  const [startTime, setStartTime] = useState(rule?.start_time?.slice(0, 5) ?? '09:00');
  const [endTime, setEndTime] = useState(rule?.end_time?.slice(0, 5) ?? '17:00');
  const [oneOffStart, setOneOffStart] = useState(rule?.one_off_start ?? '');
  const [oneOffEnd, setOneOffEnd] = useState(rule?.one_off_end ?? '');
  const [notes, setNotes] = useState(rule?.notes ?? '');

  async function handleSave() {
    if (!tenantId) {
      toast.error('Unable to detect tenant context.');
      return;
    }

    setSaving(true);

    const payload: Record<string, unknown> = {
      availability_type: isAvailable ? 'AVAILABLE' : 'UNAVAILABLE',
      rule_type: ruleType,
      notes: notes.trim() || null,
    };

    if (ruleType === 'WEEKLY_RECURRING') {
      payload.day_of_week = parseInt(weekday, 10);
      payload.start_time = `${startTime}:00`;
      payload.end_time = `${endTime}:00`;
      payload.one_off_start = null;
      payload.one_off_end = null;
    } else {
      payload.one_off_start = oneOffStart || null;
      payload.one_off_end = oneOffEnd || null;
      payload.day_of_week = null;
      payload.start_time = null;
      payload.end_time = null;
    }

    if (rule?.id) {
      const { error } = await supabase
        .from('staff_availability_rules')
        .update(payload)
        .eq('id', rule.id);

      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success('Availability rule updated.');
    } else {
      payload.tenant_id = tenantId;
      payload.staff_id = rule?.staff_id;

      const { error } = await supabase
        .from('staff_availability_rules')
        .insert(payload);

      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success('Availability rule created.');
    }

    onSaved();
  }

  return (
    <SlideOver open={open} onClose={onClose} title={rule ? `Availability — ${rule.staff_name}` : 'Edit Availability'}>
      <div className="space-y-4 p-1">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-foreground">Available</label>
          <button
            type="button"
            onClick={() => setIsAvailable(!isAvailable)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isAvailable ? 'bg-green-500' : 'bg-red-400'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                isAvailable ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm text-muted-foreground">{isAvailable ? 'Available' : 'Unavailable'}</span>
        </div>

        <Select
          label="Rule Type"
          value={ruleType}
          onChange={(e) => setRuleType(e.target.value as 'WEEKLY_RECURRING' | 'ONE_OFF')}
          options={[
            { value: 'WEEKLY_RECURRING', label: 'Weekly (Recurring)' },
            { value: 'ONE_OFF', label: 'One-off' },
          ]}
        />

        {ruleType === 'WEEKLY_RECURRING' ? (
          <>
            <Select
              label="Day"
              value={weekday}
              onChange={(e) => setWeekday(e.target.value)}
              options={WEEKDAY_OPTIONS}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Start Time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              <Input label="End Time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Start Date" type="date" value={oneOffStart} onChange={(e) => setOneOffStart(e.target.value)} />
            <Input label="End Date" type="date" value={oneOffEnd} onChange={(e) => setOneOffEnd(e.target.value)} />
          </div>
        )}

        <Textarea
          label="Reason (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Reason for availability change..."
          rows={2}
        />

        <div className="flex justify-end">
          <Button onClick={handleSave} loading={saving}>
            Save Availability
          </Button>
        </div>
      </div>
    </SlideOver>
  );
}
