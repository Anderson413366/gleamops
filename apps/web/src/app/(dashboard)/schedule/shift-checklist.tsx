'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardList, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Card, CardContent, CardHeader, CardTitle, Select } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { resolveCurrentStaff } from '@/lib/staff/resolve-current-staff';
import { ChecklistSection, type ShiftChecklistItemView } from './checklist-section';

interface ShiftChecklistProps {
  search?: string;
}

interface StaffContext {
  id: string;
  tenant_id: string;
  full_name: string;
  staff_code: string;
}

interface AssignmentRow {
  ticket_id: string;
  assignment_status: string | null;
}

interface TicketRow {
  id: string;
  ticket_code: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  site:
    | {
        name: string;
        site_code: string | null;
      }
    | Array<{
        name: string;
        site_code: string | null;
      }>
    | null;
}

interface TicketChecklistRow {
  id: string;
  status: string;
}

interface TicketChecklistItemRow {
  id: string;
  section: string | null;
  label: string;
  is_required: boolean;
  requires_photo: boolean;
  is_checked: boolean;
  notes: string | null;
  checked_at: string | null;
}

interface TicketOption {
  id: string;
  label: string;
  scheduledDate: string;
  startTime: string | null;
  endTime: string | null;
}

const SECTION_ORDER = ['Opening', 'Cleaning', 'Closing', 'Special', 'General'];

function statusColor(status: string): 'gray' | 'blue' | 'green' {
  if (status === 'COMPLETED') return 'green';
  if (status === 'IN_PROGRESS') return 'blue';
  return 'gray';
}

function localDateKey(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

function formatDateLabel(dateString: string): string {
  return new Date(`${dateString}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function normalizeSection(value: string | null): string {
  const raw = value?.trim();
  if (!raw) return 'General';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function relationOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function buildChecklistStatus(items: ShiftChecklistItemView[]): 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' {
  if (items.length === 0) return 'PENDING';
  const checked = items.filter((item) => item.isChecked).length;
  if (checked === 0) return 'PENDING';
  if (checked === items.length) return 'COMPLETED';
  return 'IN_PROGRESS';
}

export function ShiftChecklist({ search = '' }: ShiftChecklistProps) {
  const [loading, setLoading] = useState(true);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffContext | null>(null);
  const [ticketOptions, setTicketOptions] = useState<TicketOption[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [checklistId, setChecklistId] = useState<string | null>(null);
  const [checklistStatus, setChecklistStatus] = useState<string>('PENDING');
  const [items, setItems] = useState<ShiftChecklistItemView[]>([]);

  const loadChecklist = useCallback(
    async (ticketId: string) => {
      const supabase = getSupabaseBrowserClient();

      const { data: checklistRow, error: checklistError } = await supabase
        .from('ticket_checklists')
        .select('id, status')
        .eq('ticket_id', ticketId)
        .is('archived_at', null)
        .maybeSingle();

      if (checklistError || !checklistRow) {
        setChecklistId(null);
        setChecklistStatus('PENDING');
        setItems([]);
        return;
      }

      const parsedChecklist = checklistRow as TicketChecklistRow;
      setChecklistId(parsedChecklist.id);
      setChecklistStatus(parsedChecklist.status ?? 'PENDING');

      const { data: itemRows, error: itemsError } = await supabase
        .from('ticket_checklist_items')
        .select('id, section, label, is_required, requires_photo, is_checked, notes, checked_at')
        .eq('checklist_id', parsedChecklist.id)
        .is('archived_at', null)
        .order('sort_order', { ascending: true });

      if (itemsError) {
        setItems([]);
        return;
      }

      setItems(
        ((itemRows ?? []) as TicketChecklistItemRow[]).map((row) => ({
          id: row.id,
          section: normalizeSection(row.section),
          label: row.label,
          isRequired: row.is_required,
          requiresPhoto: row.requires_photo,
          isChecked: row.is_checked,
          notes: row.notes,
          checkedAt: row.checked_at,
        })),
      );
    },
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { user, staff: staffRow } = await resolveCurrentStaff<StaffContext>(
      supabase,
      'id, tenant_id, full_name, staff_code',
    );

    if (!user) {
      setStaff(null);
      setTicketOptions([]);
      setItems([]);
      setChecklistId(null);
      setLoading(false);
      return;
    }

    if (!staffRow) {
      setStaff(null);
      setTicketOptions([]);
      setItems([]);
      setChecklistId(null);
      setLoading(false);
      return;
    }

    const currentStaff = staffRow as StaffContext;
    setStaff(currentStaff);

    const { data: assignmentsData } = await supabase
      .from('ticket_assignments')
      .select('ticket_id, assignment_status')
      .eq('staff_id', currentStaff.id)
      .is('archived_at', null);

    const assignmentRows = (assignmentsData ?? []) as AssignmentRow[];
    const ticketIds = Array.from(
      new Set(
        assignmentRows
          .filter((row) => row.assignment_status !== 'CANCELED' && row.assignment_status !== 'REMOVED')
          .map((row) => row.ticket_id),
      ),
    );

    if (ticketIds.length === 0) {
      setTicketOptions([]);
      setItems([]);
      setChecklistId(null);
      setLoading(false);
      return;
    }

    const today = localDateKey(new Date());
    const horizonEnd = addDays(today, 7);

    const { data: ticketRowsData } = await supabase
      .from('work_tickets')
      .select('id, ticket_code, scheduled_date, start_time, end_time, status, site:site_id(name, site_code)')
      .in('id', ticketIds)
      .gte('scheduled_date', today)
      .lte('scheduled_date', horizonEnd)
      .is('archived_at', null)
      .order('scheduled_date', { ascending: true })
      .order('start_time', { ascending: true });

    const ticketRows = (ticketRowsData ?? []) as TicketRow[];
    const options: TicketOption[] = ticketRows.map((ticket) => {
      const site = relationOne(ticket.site);
      return {
        id: ticket.id,
        label: `${ticket.ticket_code} · ${site?.site_code ? `${site.site_code} - ` : ''}${site?.name ?? 'Unknown Site'} · ${formatDateLabel(ticket.scheduled_date)}`,
        scheduledDate: ticket.scheduled_date,
        startTime: ticket.start_time,
        endTime: ticket.end_time,
      };
    });

    setTicketOptions(options);

    const effectiveTicketId = selectedTicketId && options.some((option) => option.id === selectedTicketId)
      ? selectedTicketId
      : options[0]?.id ?? '';

    setSelectedTicketId(effectiveTicketId);

    if (effectiveTicketId) {
      await loadChecklist(effectiveTicketId);
    } else {
      setChecklistId(null);
      setChecklistStatus('PENDING');
      setItems([]);
    }

    setLoading(false);
  }, [loadChecklist, selectedTicketId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedTicketId) return;
    if (!staff) return;
    void loadChecklist(selectedTicketId);
  }, [loadChecklist, selectedTicketId, staff]);

  const handleToggle = useCallback(
    async (item: ShiftChecklistItemView) => {
      if (!checklistId || !staff) return;
      setSavingItemId(item.id);

      const nextChecked = !item.isChecked;
      const nowIso = new Date().toISOString();
      const supabase = getSupabaseBrowserClient();

      const { error } = await supabase
        .from('ticket_checklist_items')
        .update({
          is_checked: nextChecked,
          checked_at: nextChecked ? nowIso : null,
          checked_by: nextChecked ? staff.id : null,
        })
        .eq('id', item.id);

      if (error) {
        toast.error(error.message);
        setSavingItemId(null);
        return;
      }

      const updatedItems = items.map((current) => (
        current.id === item.id
          ? {
              ...current,
              isChecked: nextChecked,
              checkedAt: nextChecked ? nowIso : null,
            }
          : current
      ));
      setItems(updatedItems);

      const nextChecklistStatus = buildChecklistStatus(updatedItems);
      setChecklistStatus(nextChecklistStatus);

      await supabase
        .from('ticket_checklists')
        .update({
          status: nextChecklistStatus,
          completed_at: nextChecklistStatus === 'COMPLETED' ? nowIso : null,
          completed_by: nextChecklistStatus === 'COMPLETED' ? staff.id : null,
        })
        .eq('id', checklistId);

      setSavingItemId(null);
    },
    [checklistId, items, staff],
  );

  const selectedTicket = useMemo(
    () => ticketOptions.find((option) => option.id === selectedTicketId) ?? null,
    [selectedTicketId, ticketOptions],
  );

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => (
      item.label.toLowerCase().includes(query)
      || item.section.toLowerCase().includes(query)
    ));
  }, [items, search]);

  const sectionGroups = useMemo(() => {
    const groups = new Map<string, ShiftChecklistItemView[]>();
    for (const item of filteredItems) {
      const section = normalizeSection(item.section);
      const existing = groups.get(section) ?? [];
      existing.push(item);
      groups.set(section, existing);
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => {
        const aIndex = SECTION_ORDER.indexOf(a);
        const bIndex = SECTION_ORDER.indexOf(b);
        if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex;
        if (aIndex >= 0) return -1;
        if (bIndex >= 0) return 1;
        return a.localeCompare(b);
      })
      .map(([title, rows]) => ({ title, rows }));
  }, [filteredItems]);

  const checkedCount = filteredItems.filter((item) => item.isChecked).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Loading shift checklist...
        </CardContent>
      </Card>
    );
  }

  if (!staff) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4 text-warning" />
            Shift Checklist Access
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No staff profile is linked to your account. Ask admin to map your user to a staff record.
        </CardContent>
      </Card>
    );
  }

  if (ticketOptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4 text-module-accent" />
            Shift Checklist
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No assigned shifts were found for the next 7 days.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Shift Checklist</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {staff.full_name} · {selectedTicket ? formatDateLabel(selectedTicket.scheduledDate) : ''}
              </p>
            </div>
            <Badge color={statusColor(checklistStatus)}>{checklistStatus}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select
            label="Assigned Shift"
            value={selectedTicketId}
            onChange={(event) => setSelectedTicketId(event.target.value)}
            options={ticketOptions.map((ticket) => ({ value: ticket.id, label: ticket.label }))}
          />
          <div className="rounded-lg border border-border/70 bg-muted/15 px-3 py-2 text-sm">
            <p className="text-xs text-muted-foreground">Progress</p>
            <p className="font-semibold">{checkedCount}/{filteredItems.length} checklist items completed</p>
          </div>
        </CardContent>
      </Card>

      {checklistId && sectionGroups.length > 0 ? (
        sectionGroups.map((section) => (
          <ChecklistSection
            key={section.title}
            title={section.title}
            items={section.rows}
            savingItemId={savingItemId}
            onToggle={handleToggle}
          />
        ))
      ) : (
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground text-center">
            No checklist is linked to this shift yet. Ask a manager to apply a checklist template.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
