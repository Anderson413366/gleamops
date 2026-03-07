'use client';

import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { Button, Input, Select, SlideOver, Textarea } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { normalizeRoleCode } from '@gleamops/shared';

interface LeaveRequestFormProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const LEAVE_TYPES = [
  { value: 'Annual Leave', label: 'Annual Leave' },
  { value: 'Sick Leave', label: 'Sick Leave' },
  { value: 'Personal Leave', label: 'Personal Leave' },
  { value: 'Bereavement', label: 'Bereavement' },
  { value: 'Jury Duty', label: 'Jury Duty' },
  { value: 'Other', label: 'Other' },
];

function toDateInputValue(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

interface ProblemDetails {
  detail?: string;
  error?: string;
  message?: string;
}

function errorMessageFromPayload(payload: unknown, fallback: string): string {
  if (typeof payload !== 'object' || payload === null) return fallback;
  const details = payload as ProblemDetails;
  return details.detail || details.error || details.message || fallback;
}

export function LeaveRequestForm({ open, onClose, onCreated }: LeaveRequestFormProps) {
  const { tenantId, user, role } = useAuth();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [saving, setSaving] = useState(false);
  const [leaveType, setLeaveType] = useState('Annual Leave');
  const [startDate, setStartDate] = useState(() => toDateInputValue(new Date()));
  const [endDate, setEndDate] = useState(() => toDateInputValue(new Date()));
  const [reason, setReason] = useState('');
  const [isPaid, setIsPaid] = useState(true);
  const [staffId, setStaffId] = useState('');
  const [staffOptions, setStaffOptions] = useState<Array<{ value: string; label: string }>>([]);
  const normalizedRole = normalizeRoleCode(role);
  const canManageLeaveForOthers =
    normalizedRole === 'OWNER_ADMIN' || normalizedRole === 'MANAGER' || normalizedRole === 'SUPERVISOR';

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function loadStaff() {
      if (!canManageLeaveForOthers) {
        let selfQuery = supabase
          .from('staff')
          .select('id, full_name, staff_code, email')
          .is('archived_at', null)
          .eq('status', 'ACTIVE')
          .limit(1);

        if (user?.id) {
          selfQuery = selfQuery.eq('user_id', user.id);
        } else if (user?.email) {
          selfQuery = selfQuery.ilike('email', user.email);
        } else {
          setStaffOptions([]);
          setStaffId('');
          return;
        }

        const { data: selfRows, error: selfError } = await selfQuery.maybeSingle<{
          id: string;
          full_name: string | null;
          staff_code: string | null;
          email: string | null;
        }>();

        if (cancelled) return;

        if (selfError) {
          toast.error(selfError.message);
          setStaffOptions([]);
          setStaffId('');
          return;
        }

        if (!selfRows?.id) {
          toast.error('No staff profile is linked to this account. Contact an administrator.');
          setStaffOptions([]);
          setStaffId('');
          return;
        }

        const code = selfRows.staff_code ?? '';
        const rawName = selfRows.full_name ?? '';
        const name = rawName && rawName !== code ? rawName : '(Name not set)';
        const option = { value: selfRows.id, label: `${code} - ${name}` };
        setStaffOptions([option]);
        setStaffId(selfRows.id);
        return;
      }

      const { data } = await supabase
        .from('staff')
        .select('id, full_name, staff_code')
        .is('archived_at', null)
        .eq('status', 'ACTIVE')
        .order('full_name')
        .limit(200);

      if (cancelled) return;
      const options = (data ?? []).map((s: Record<string, unknown>) => {
        const code = (s.staff_code as string) ?? '';
        const rawName = (s.full_name as string) ?? '';
        const name = rawName && rawName !== code ? rawName : '(Name not set)';
        return { value: s.id as string, label: `${code} - ${name}` };
      });
      setStaffOptions(options);
      setStaffId((current) => {
        if (current && options.some((option) => option.value === current)) return current;
        return options[0]?.value ?? '';
      });
    }

    void loadStaff();
    return () => { cancelled = true; };
  }, [open, supabase, canManageLeaveForOthers, user?.id, user?.email]);

  async function handleSubmit() {
    if (!tenantId || !staffId) {
      toast.error('Please select a staff member.');
      return;
    }
    if (!startDate || !endDate) {
      toast.error('Please select start and end dates.');
      return;
    }

    setSaving(true);

    // Store as staff_availability_rules with ONE_OFF type
    const notes = `[${leaveType}]${isPaid ? '[PAID]' : '[UNPAID]'} ${reason}`.trim();

    const response = await fetch('/api/operations/schedule/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: staffId,
        rule_type: 'ONE_OFF',
        availability_type: 'UNAVAILABLE',
        one_off_start: startDate,
        one_off_end: endDate,
        valid_from: null,
        valid_to: null,
        notes,
      }),
    });
    const payload = await response.json().catch(() => null);

    setSaving(false);

    if (!response.ok || (payload && payload.success === false)) {
      toast.error(errorMessageFromPayload(payload, 'Failed to submit leave request.'));
      return;
    }

    toast.success('Leave request submitted.');
    onCreated();
    onClose();

    // Reset form
    setLeaveType('Annual Leave');
    setStartDate(toDateInputValue(new Date()));
    setEndDate(toDateInputValue(new Date()));
    setReason('');
    setIsPaid(true);
  }

  return (
    <SlideOver open={open} onClose={onClose} title="Request Leave">
      <div className="space-y-4 p-1">
        <Select
          label="Staff Member"
          value={staffId}
          onChange={(e) => setStaffId(e.target.value)}
          options={staffOptions}
          disabled={!canManageLeaveForOthers}
        />

        <Select
          label="Leave Type"
          value={leaveType}
          onChange={(e) => setLeaveType(e.target.value)}
          options={LEAVE_TYPES}
        />

        <div className="grid gap-3 sm:grid-cols-2">
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

        <Textarea
          label="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for leave request..."
          rows={3}
        />

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-foreground">Paid/Unpaid</label>
          <button
            type="button"
            onClick={() => setIsPaid(!isPaid)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isPaid ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                isPaid ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm text-muted-foreground">{isPaid ? 'Paid' : 'Unpaid'}</span>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} loading={saving}>
            Submit Leave Request
          </Button>
        </div>
      </div>
    </SlideOver>
  );
}
