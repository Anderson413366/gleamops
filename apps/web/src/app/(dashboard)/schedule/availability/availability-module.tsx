'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, X, Check, MessageSquare } from 'lucide-react';
import { Button, Card, CardContent, EmptyState, Badge, Input } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AvailabilityRule {
  id: string;
  staff_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  notes: string | null;
}

interface StaffOption {
  id: string;
  full_name: string;
}

interface PendingRequest {
  id: string;
  staff_id: string;
  staff_name: string;
  rule_type: string;
  availability_type: string;
  one_off_start: string | null;
  one_off_end: string | null;
  notes: string | null;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

// Map weekday index to a color for multi-employee chips
const EMPLOYEE_COLORS = [
  'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
];

function formatTime12(time: string | null): string {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function getEmployeeColor(index: number): string {
  return EMPLOYEE_COLORS[index % EMPLOYEE_COLORS.length];
}

// ---------------------------------------------------------------------------
// Popover Form for Add/Edit
// ---------------------------------------------------------------------------

function AvailabilityPopover({
  dayIndex,
  rule,
  staffId,
  tenantId,
  onSaved,
  onClose,
}: {
  dayIndex: number;
  rule?: AvailabilityRule;
  staffId: string;
  tenantId: string;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [startTime, setStartTime] = useState(rule?.start_time?.slice(0, 5) ?? '09:00');
  const [endTime, setEndTime] = useState(rule?.end_time?.slice(0, 5) ?? '17:00');
  const [note, setNote] = useState(rule?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  async function handleSave() {
    if (!startTime || !endTime) {
      setError('Both From and To times are required.');
      return;
    }
    if (endTime <= startTime) {
      setError('To time must be after From time.');
      return;
    }
    setError('');
    setSaving(true);

    const supabase = getSupabaseBrowserClient();
    const payload = {
      staff_id: staffId,
      tenant_id: tenantId,
      rule_type: 'WEEKLY_RECURRING',
      availability_type: 'AVAILABLE',
      weekday: dayIndex,
      start_time: `${startTime}:00`,
      end_time: `${endTime}:00`,
      notes: note.trim() || null,
    };

    if (rule?.id) {
      const { error: err } = await supabase
        .from('staff_availability_rules')
        .update({
          start_time: payload.start_time,
          end_time: payload.end_time,
          notes: payload.notes,
        })
        .eq('id', rule.id);
      setSaving(false);
      if (err) { toast.error(err.message); return; }
      toast.success('Availability updated.');
    } else {
      const { error: err } = await supabase
        .from('staff_availability_rules')
        .insert(payload);
      setSaving(false);
      if (err) { toast.error(err.message); return; }
      toast.success('Availability added.');
    }
    onSaved();
    onClose();
  }

  return (
    <div
      ref={ref}
      className="absolute left-1/2 -translate-x-1/2 top-full z-50 mt-1 w-56 rounded-xl border border-border bg-card p-3 shadow-xl space-y-3"
    >
      <p className="text-xs font-semibold text-foreground">{WEEKDAYS[dayIndex]}</p>
      <Input label="From" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
      <Input label="To" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
      <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g., Available if no OT" />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex items-center justify-between">
        <button type="button" onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
        <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Module
// ---------------------------------------------------------------------------

export function AvailabilityModule() {
  const { tenantId } = useAuth();
  const [subView, setSubView] = useState<'requests' | 'weekly'>('weekly');
  const [allStaff, setAllStaff] = useState<StaffOption[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [popover, setPopover] = useState<{ dayIndex: number; rule?: AvailabilityRule } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAllSelected = selectedStaffIds.length === 0;
  const isSingleEmployee = selectedStaffIds.length === 1;
  const canEdit = isSingleEmployee;

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    const [staffRes, rulesRes] = await Promise.all([
      supabase.from('staff').select('id, full_name').is('archived_at', null).eq('staff_status', 'ACTIVE').order('full_name'),
      supabase.from('staff_availability_rules').select('id, staff_id, weekday, start_time, end_time, notes, rule_type, availability_type, one_off_start, one_off_end, staff:staff_id(full_name)').is('archived_at', null),
    ]);

    if (staffRes.data) setAllStaff(staffRes.data as StaffOption[]);

    const allRules = (rulesRes.data ?? []) as Array<Record<string, unknown>>;

    // Separate weekly recurring vs one-off requests
    const weekly: AvailabilityRule[] = [];
    const requests: PendingRequest[] = [];

    for (const r of allRules) {
      const staff = r.staff as { full_name?: string } | null;
      if (r.rule_type === 'WEEKLY_RECURRING' && r.weekday != null) {
        weekly.push({
          id: r.id as string,
          staff_id: r.staff_id as string,
          weekday: r.weekday as number,
          start_time: r.start_time as string,
          end_time: r.end_time as string,
          notes: r.notes as string | null,
        });
      } else if (r.rule_type === 'ONE_OFF') {
        requests.push({
          id: r.id as string,
          staff_id: r.staff_id as string,
          staff_name: staff?.full_name ?? 'Unknown',
          rule_type: r.rule_type as string,
          availability_type: r.availability_type as string,
          one_off_start: r.one_off_start as string | null,
          one_off_end: r.one_off_end as string | null,
          notes: r.notes as string | null,
        });
      }
    }

    setRules(weekly);
    setPendingRequests(requests);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter rules by selected employees
  const visibleRules = useMemo(() => {
    if (isAllSelected) return rules;
    const idSet = new Set(selectedStaffIds);
    return rules.filter((r) => idSet.has(r.staff_id));
  }, [rules, selectedStaffIds, isAllSelected]);

  // Group rules by day
  const rulesByDay = useMemo(() => {
    const map: Record<number, Array<AvailabilityRule & { staffName?: string }>> = {};
    for (let d = 0; d < 7; d++) map[d] = [];
    for (const r of visibleRules) {
      const staffName = allStaff.find((s) => s.id === r.staff_id)?.full_name;
      map[r.weekday]?.push({ ...r, staffName });
    }
    return map;
  }, [visibleRules, allStaff]);

  // Staff color map for multi-employee view
  const staffColorMap = useMemo(() => {
    const map = new Map<string, string>();
    allStaff.forEach((s, i) => map.set(s.id, getEmployeeColor(i)));
    return map;
  }, [allStaff]);

  // Employee dropdown label
  const dropdownLabel = isAllSelected
    ? 'All Employees'
    : isSingleEmployee
      ? allStaff.find((s) => s.id === selectedStaffIds[0])?.full_name ?? '1 Employee'
      : `${selectedStaffIds.length} Employees`;

  const toggleStaff = (id: string) => {
    setSelectedStaffIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  async function handleDeleteRule(ruleId: string) {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from('staff_availability_rules').delete().eq('id', ruleId);
    if (error) { toast.error(error.message); return; }
    toast.success('Availability window removed.');
    fetchData();
  }

  const toggleSelectAll = () => {
    if (selected.size === pendingRequests.length) setSelected(new Set());
    else setSelected(new Set(pendingRequests.map((r) => r.id)));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">Loading availability...</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar: Employee selector (left) + View toggle (right) */}
      <div className="flex items-center justify-between">
        {/* Employee multi-select dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            {dropdownLabel}
            <svg className={`h-3 w-3 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {dropdownOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 w-64 max-h-72 overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-xl">
              <button
                type="button"
                onClick={() => { setSelectedStaffIds([]); setDropdownOpen(false); }}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${isAllSelected ? 'bg-module-accent/10 text-module-accent font-medium' : 'text-foreground hover:bg-muted'}`}
              >
                All Employees
              </button>
              <div className="my-1 border-t border-border" />
              {allStaff.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleStaff(s.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${selectedStaffIds.includes(s.id) ? 'bg-module-accent/10 text-module-accent font-medium' : 'text-foreground hover:bg-muted'}`}
                >
                  <span className={`h-3.5 w-3.5 rounded border ${selectedStaffIds.includes(s.id) ? 'bg-module-accent border-module-accent' : 'border-border'} flex items-center justify-center`}>
                    {selectedStaffIds.includes(s.id) && <Check className="h-2.5 w-2.5 text-white" />}
                  </span>
                  {s.full_name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* View toggle */}
        <div className="inline-flex items-center rounded-lg border border-border bg-muted p-0.5">
          <button
            type="button"
            onClick={() => setSubView('requests')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              subView === 'requests' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Availability Requests
          </button>
          <button
            type="button"
            onClick={() => setSubView('weekly')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              subView === 'weekly' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Weekly View
          </button>
        </div>
      </div>

      {subView === 'weekly' ? (
        /* ---------------------------------------------------------------- */
        /* Weekly calendar grid                                              */
        /* ---------------------------------------------------------------- */
        <div className="grid grid-cols-7 gap-2">
          {WEEKDAYS.map((dayLabel, dayIndex) => {
            const dayRules = rulesByDay[dayIndex] ?? [];
            return (
              <div key={dayLabel} className="relative rounded-xl border border-border bg-card">
                <div className="border-b border-border px-2 py-2 text-center">
                  <span className="text-xs font-bold text-foreground">{dayLabel}</span>
                </div>
                <div className="min-h-[200px] p-2 space-y-1.5">
                  {dayRules.map((rule) => (
                    <div
                      key={rule.id}
                      className={`group relative rounded-lg px-2 py-1.5 text-[11px] cursor-pointer transition-colors ${
                        isSingleEmployee
                          ? 'bg-primary/10 text-primary hover:bg-primary/20'
                          : staffColorMap.get(rule.staff_id) ?? 'bg-muted text-foreground'
                      }`}
                      onClick={() => {
                        if (canEdit) setPopover({ dayIndex, rule });
                      }}
                    >
                      <div className="font-medium">
                        {formatTime12(rule.start_time)} – {formatTime12(rule.end_time)}
                      </div>
                      {!isSingleEmployee && rule.staffName && (
                        <div className="text-[11px] opacity-80 truncate">{rule.staffName}</div>
                      )}
                      {rule.notes && (
                        <MessageSquare className="inline h-2.5 w-2.5 ml-1 opacity-60" />
                      )}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDeleteRule(rule.id); }}
                          className="absolute -top-1 -right-1 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-white"
                          aria-label="Delete"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {dayRules.length === 0 && !canEdit && (
                    <div className="flex items-center justify-center h-full min-h-[60px] text-[11px] text-muted-foreground">
                      —
                    </div>
                  )}
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setPopover({ dayIndex })}
                    className="flex w-full items-center justify-center gap-1 border-t border-border px-2 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                )}
                {popover?.dayIndex === dayIndex && canEdit && (
                  <AvailabilityPopover
                    dayIndex={dayIndex}
                    rule={popover.rule}
                    staffId={selectedStaffIds[0]}
                    tenantId={tenantId ?? ''}
                    onSaved={fetchData}
                    onClose={() => setPopover(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ---------------------------------------------------------------- */
        /* Requests view                                                     */
        /* ---------------------------------------------------------------- */
        <div>
          {pendingRequests.length === 0 ? (
            <EmptyState title="No Pending Requests" description="No pending availability requests at this time." />
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={selected.size === pendingRequests.length && pendingRequests.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-border"
                  />
                  Select All
                </label>
                {selected.size > 0 && (
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" className="border-red-300 text-red-700 hover:bg-red-50">
                      <X className="h-3.5 w-3.5" /> Decline
                    </Button>
                    <Button variant="secondary" size="sm" className="border-green-300 text-green-700 hover:bg-green-50">
                      <Check className="h-3.5 w-3.5" /> Approve
                    </Button>
                  </div>
                )}
              </div>
              {pendingRequests.map((req) => (
                <div key={req.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <input
                    type="checkbox"
                    checked={selected.has(req.id)}
                    onChange={() => {
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(req.id)) next.delete(req.id);
                        else next.add(req.id);
                        return next;
                      });
                    }}
                    className="rounded border-border"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{req.staff_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {req.one_off_start && req.one_off_end
                        ? `${new Date(`${req.one_off_start}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(`${req.one_off_end}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                        : 'Recurring'}
                    </p>
                    {req.notes && <p className="text-xs text-muted-foreground italic">{req.notes}</p>}
                  </div>
                  <Badge color={req.availability_type === 'AVAILABLE' ? 'green' : 'red'}>
                    {req.availability_type}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
