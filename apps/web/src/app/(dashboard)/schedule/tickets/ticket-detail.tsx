'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ClipboardList, MapPin, Briefcase, Calendar, Clock,
  UserPlus, X, Users, CheckSquare, Square, Camera, ImageIcon,
  AlertTriangle, Filter, Eye, Timer,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  SlideOver,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Select,
} from '@gleamops/ui';
import { TICKET_STATUS_COLORS } from '@gleamops/shared';
import type { WorkTicket, TicketAssignment, Staff, TicketChecklistItem, TicketPhoto } from '@gleamops/shared';

interface TicketWithRelations extends WorkTicket {
  job?: { job_code: string; billing_amount?: number | null } | null;
  site?: {
    site_code: string;
    name: string;
    address?: { street?: string; city?: string; state?: string; zip?: string } | null;
    client?: { name: string; client_code?: string } | null;
  } | null;
}

interface AssignmentWithStaff extends TicketAssignment {
  staff?: { staff_code: string; full_name: string; role: string } | null;
}

interface ChecklistItemRow extends TicketChecklistItem {
  photos?: TicketPhoto[];
}

// Tracks which tickets a staff member is already assigned to on the same day
interface StaffBusyInfo {
  staffId: string;
  tickets: { ticketId: string; ticketCode: string; siteName: string; startTime: string | null; endTime: string | null }[];
}

interface TicketDetailProps {
  ticket: TicketWithRelations | null;
  open: boolean;
  onClose: () => void;
  onStatusChange?: () => void;
}

const STATUS_OPTIONS = [
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const ROLE_OPTIONS = [
  { value: 'LEAD', label: 'Lead' },
  { value: 'CLEANER', label: 'Cleaner' },
];

export function TicketDetail({ ticket, open, onClose, onStatusChange }: TicketDetailProps) {
  const [assignments, setAssignments] = useState<AssignmentWithStaff[]>([]);
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedRole, setSelectedRole] = useState('CLEANER');

  // Availability state
  const [busyMap, setBusyMap] = useState<Map<string, StaffBusyInfo>>(new Map());
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [dayTicketCount, setDayTicketCount] = useState(0);

  // Tab state for progressive disclosure
  const [activeTab, setActiveTab] = useState<'overview' | 'checklist' | 'dispatch' | 'time' | 'photos'>('overview');

  // Time entries state
  const [timeEntries, setTimeEntries] = useState<{ id: string; staff_name: string; start_at: string; end_at: string | null; duration_minutes: number | null; status: string }[]>([]);

  // Checklist state
  const [checklistId, setChecklistId] = useState<string | null>(null);
  const [checklistStatus, setChecklistStatus] = useState<string>('PENDING');
  const [checklistItems, setChecklistItems] = useState<ChecklistItemRow[]>([]);
  const [checklistLoading, setChecklistLoading] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!ticket || !open) return;
    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    const [assignRes, staffRes, dayAssignRes, dayTicketRes] = await Promise.all([
      // Current ticket assignments
      supabase
        .from('ticket_assignments')
        .select('*, staff:staff_id(staff_code, full_name, role)')
        .eq('ticket_id', ticket.id)
        .is('archived_at', null),
      // All active staff
      supabase
        .from('staff')
        .select('*')
        .is('archived_at', null)
        .order('full_name'),
      // All assignments on the same date (for availability check)
      // Use !inner join so we can filter on the ticket's scheduled_date
      supabase
        .from('ticket_assignments')
        .select(`
          staff_id,
          ticket:ticket_id!inner(
            id,
            ticket_code,
            start_time,
            end_time,
            status,
            scheduled_date,
            site:site_id(name)
          )
        `)
        .eq('ticket.scheduled_date', ticket.scheduled_date)
        .neq('ticket.status', 'CANCELLED')
        .is('archived_at', null),
      // Count tickets on same date
      supabase
        .from('work_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('scheduled_date', ticket.scheduled_date)
        .is('archived_at', null)
        .neq('status', 'CANCELLED'),
    ]);

    if (assignRes.data) setAssignments(assignRes.data as unknown as AssignmentWithStaff[]);
    if (staffRes.data) setAllStaff(staffRes.data as unknown as Staff[]);
    if (dayTicketRes.count != null) setDayTicketCount(dayTicketRes.count);

    // Build busy map: staff_id → list of tickets they're assigned to on this date
    const newBusyMap = new Map<string, StaffBusyInfo>();
    if (dayAssignRes.data) {
      for (const row of dayAssignRes.data as unknown as {
        staff_id: string;
        ticket: {
          id: string;
          ticket_code: string;
          start_time: string | null;
          end_time: string | null;
          status: string;
          site: { name: string } | null;
        } | null;
      }[]) {
        // Skip this ticket's own assignments and cancelled tickets
        if (!row.ticket || row.ticket.id === ticket.id || row.ticket.status === 'CANCELLED') continue;

        const existing = newBusyMap.get(row.staff_id) || { staffId: row.staff_id, tickets: [] };
        existing.tickets.push({
          ticketId: row.ticket.id,
          ticketCode: row.ticket.ticket_code,
          siteName: row.ticket.site?.name ?? '—',
          startTime: row.ticket.start_time,
          endTime: row.ticket.end_time,
        });
        newBusyMap.set(row.staff_id, existing);
      }
    }
    setBusyMap(newBusyMap);

    // Fetch time entries for this ticket
    const { data: timeData } = await supabase
      .from('time_entries')
      .select('id, start_at, end_at, duration_minutes, status, staff:staff_id(full_name)')
      .eq('ticket_id', ticket.id)
      .is('archived_at', null)
      .order('start_at', { ascending: false });
    if (timeData) {
      setTimeEntries(timeData.map((t: Record<string, unknown>) => ({
        id: t.id as string,
        staff_name: (t.staff as { full_name: string } | null)?.full_name ?? '—',
        start_at: t.start_at as string,
        end_at: t.end_at as string | null,
        duration_minutes: t.duration_minutes as number | null,
        status: t.status as string,
      })));
    }

    setLoading(false);
  }, [ticket, open]);

  // Fetch checklist data
  const fetchChecklist = useCallback(async () => {
    if (!ticket || !open) return;
    setChecklistLoading(true);
    const supabase = getSupabaseBrowserClient();

    // Get or create checklist for this ticket
    const { data: checklist } = await supabase
      .from('ticket_checklists')
      .select('*')
      .eq('ticket_id', ticket.id)
      .is('archived_at', null)
      .maybeSingle();

    if (checklist) {
      setChecklistId(checklist.id);
      setChecklistStatus(checklist.status);

      // Fetch items with photos
      const { data: items } = await supabase
        .from('ticket_checklist_items')
        .select('*')
        .eq('checklist_id', checklist.id)
        .is('archived_at', null)
        .order('sort_order');

      if (items && items.length > 0) {
        // Fetch photos for all items
        const itemIds = items.map((i: { id: string }) => i.id);
        const { data: photos } = await supabase
          .from('ticket_photos')
          .select('*')
          .in('checklist_item_id', itemIds)
          .is('archived_at', null);

        const photoMap = new Map<string, TicketPhoto[]>();
        if (photos) {
          for (const p of photos as unknown as TicketPhoto[]) {
            if (p.checklist_item_id) {
              const existing = photoMap.get(p.checklist_item_id) || [];
              existing.push(p);
              photoMap.set(p.checklist_item_id, existing);
            }
          }
        }

        setChecklistItems(
          (items as unknown as TicketChecklistItem[]).map((item) => ({
            ...item,
            photos: photoMap.get(item.id) || [],
          }))
        );
      } else {
        setChecklistItems([]);
      }
    } else {
      setChecklistId(null);
      setChecklistStatus('PENDING');
      setChecklistItems([]);
    }

    setChecklistLoading(false);
  }, [ticket, open]);

  // Reset form state when ticket changes
  useEffect(() => {
    setShowAssignForm(false);
    setSelectedStaffId('');
    setSelectedRole('CLEANER');
    setShowAvailableOnly(false);
    setActiveTab('overview');
  }, [ticket]);

  useEffect(() => { fetchDetails(); fetchChecklist(); }, [fetchDetails, fetchChecklist]);

  const handleAssign = async () => {
    if (!ticket || !selectedStaffId) return;
    setAssigning(true);
    const supabase = getSupabaseBrowserClient();

    await supabase.from('ticket_assignments').insert({
      tenant_id: ticket.tenant_id,
      ticket_id: ticket.id,
      staff_id: selectedStaffId,
      role: selectedRole,
    });

    setSelectedStaffId('');
    setSelectedRole('CLEANER');
    setShowAssignForm(false);
    setAssigning(false);
    fetchDetails();
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    const supabase = getSupabaseBrowserClient();
    await supabase
      .from('ticket_assignments')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', assignmentId);
    fetchDetails();
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket) return;
    const supabase = getSupabaseBrowserClient();
    await supabase
      .from('work_tickets')
      .update({ status: newStatus })
      .eq('id', ticket.id);
    onStatusChange?.();
  };

  // Toggle checklist item
  const handleToggleItem = async (item: ChecklistItemRow) => {
    const supabase = getSupabaseBrowserClient();
    const newChecked = !item.is_checked;

    // Optimistic update
    setChecklistItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, is_checked: newChecked, checked_at: newChecked ? new Date().toISOString() : null }
          : i
      )
    );

    await supabase
      .from('ticket_checklist_items')
      .update({
        is_checked: newChecked,
        checked_at: newChecked ? new Date().toISOString() : null,
      })
      .eq('id', item.id);

    // Update checklist status based on items
    const updatedItems = checklistItems.map((i) =>
      i.id === item.id ? { ...i, is_checked: newChecked } : i
    );
    const allChecked = updatedItems.every((i) => i.is_checked);
    const someChecked = updatedItems.some((i) => i.is_checked);
    const newStatus = allChecked ? 'COMPLETED' : someChecked ? 'IN_PROGRESS' : 'PENDING';

    if (newStatus !== checklistStatus && checklistId) {
      setChecklistStatus(newStatus);
      await supabase
        .from('ticket_checklists')
        .update({
          status: newStatus,
          completed_at: allChecked ? new Date().toISOString() : null,
        })
        .eq('id', checklistId);
    }
  };

  if (!ticket) return null;

  const site = ticket.site;
  const addressParts = [site?.address?.street, site?.address?.city, site?.address?.state, site?.address?.zip].filter(Boolean);

  // Staff already assigned to THIS ticket
  const assignedStaffIds = new Set(assignments.map((a) => a.staff_id));

  // Filter staff: not already assigned to this ticket + availability filter
  const staffForDropdown = useMemo(() => {
    return allStaff
      .filter((s) => !assignedStaffIds.has(s.id))
      .filter((s) => !showAvailableOnly || !busyMap.has(s.id))
      .map((s) => {
        const busy = busyMap.get(s.id);
        const isBusy = !!busy && busy.tickets.length > 0;
        const busyLabel = isBusy
          ? ` [BUSY: ${busy.tickets.map((t) => t.siteName).join(', ')}]`
          : '';
        return {
          value: s.id,
          label: `${s.full_name} (${s.staff_code}) — ${s.role}${busyLabel}`,
          isBusy,
        };
      });
  }, [allStaff, assignedStaffIds, busyMap, showAvailableOnly]);

  // Collect all photos across checklist items
  const allPhotos = checklistItems.flatMap((i) => (i.photos ?? []).map((p) => ({ ...p, itemLabel: i.label })));

  // Checklist progress
  const checkedCount = checklistItems.filter((i) => i.is_checked).length;
  const totalCount = checklistItems.length;
  const progressPct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  // Tab configuration with counts
  const TABS = [
    { key: 'overview' as const, label: 'Overview', icon: <Eye className="h-3.5 w-3.5" /> },
    { key: 'checklist' as const, label: 'Checklist', icon: <ClipboardList className="h-3.5 w-3.5" />, count: totalCount > 0 ? `${checkedCount}/${totalCount}` : undefined },
    { key: 'dispatch' as const, label: 'Dispatch', icon: <Users className="h-3.5 w-3.5" />, count: assignments.length > 0 ? String(assignments.length) : undefined },
    { key: 'time' as const, label: 'Time', icon: <Timer className="h-3.5 w-3.5" />, count: timeEntries.length > 0 ? String(timeEntries.length) : undefined },
    { key: 'photos' as const, label: 'Photos', icon: <Camera className="h-3.5 w-3.5" />, count: allPhotos.length > 0 ? String(allPhotos.length) : undefined },
  ];

  // Group checklist items by section
  const sections = new Map<string, ChecklistItemRow[]>();
  for (const item of checklistItems) {
    const key = item.section || 'General';
    const existing = sections.get(key) || [];
    existing.push(item);
    sections.set(key, existing);
  }

  return (
    <SlideOver open={open} onClose={onClose} title={ticket.ticket_code} subtitle={site?.client?.name} wide>
      <div className="space-y-4">
        {/* Status + Change — always visible */}
        <div className="flex items-center justify-between">
          <Badge color={TICKET_STATUS_COLORS[ticket.status] ?? 'gray'}>{ticket.status}</Badge>
          <Select
            value={ticket.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            options={STATUS_OPTIONS}
            className="text-xs"
          />
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 border-b border-border overflow-x-auto pb-0">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-gleam-500 text-gleam-600'
                  : 'border-transparent text-muted hover:text-foreground hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === tab.key ? 'bg-gleam-100 text-gleam-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ========== TAB: Overview ========== */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted mt-0.5" />
                    <div>
                      <p className="text-xs text-muted">Date</p>
                      <p className="text-sm font-medium">{new Date(ticket.scheduled_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-muted mt-0.5" />
                    <div>
                      <p className="text-xs text-muted">Time</p>
                      <p className="text-sm font-medium">
                        {ticket.start_time && ticket.end_time
                          ? `${ticket.start_time} — ${ticket.end_time}`
                          : 'Not set'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted mt-0.5" />
                    <div>
                      <p className="text-xs text-muted">Site</p>
                      <p className="text-sm font-medium">{site?.name ?? '—'}</p>
                      {addressParts.length > 0 && (
                        <p className="text-xs text-muted">{addressParts.join(', ')}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Briefcase className="h-4 w-4 text-muted mt-0.5" />
                    <div>
                      <p className="text-xs text-muted">Service Plan</p>
                      <p className="text-sm font-mono">{ticket.job?.job_code ?? '—'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick summary of other tabs */}
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => setActiveTab('checklist')} className="p-3 rounded-lg border border-border hover:border-gleam-300 text-center transition-colors">
                <p className="text-lg font-bold text-foreground">{progressPct}%</p>
                <p className="text-xs text-muted">Checklist</p>
              </button>
              <button onClick={() => setActiveTab('dispatch')} className="p-3 rounded-lg border border-border hover:border-gleam-300 text-center transition-colors">
                <p className="text-lg font-bold text-foreground">{assignments.length}</p>
                <p className="text-xs text-muted">Staff</p>
              </button>
              <button onClick={() => setActiveTab('time')} className="p-3 rounded-lg border border-border hover:border-gleam-300 text-center transition-colors">
                <p className="text-lg font-bold text-foreground">{timeEntries.length}</p>
                <p className="text-xs text-muted">Time Logs</p>
              </button>
            </div>

            <div className="text-xs text-muted space-y-1 pt-4 border-t border-border">
              <p>Created: {new Date(ticket.created_at).toLocaleDateString()}</p>
              <p>Updated: {new Date(ticket.updated_at).toLocaleDateString()}</p>
            </div>
          </div>
        )}

        {/* ========== TAB: Checklist ========== */}
        {activeTab === 'checklist' && (
          <div className="space-y-4">
            {checklistLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : checklistItems.length > 0 ? (
              <>
                {/* Progress Bar */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        progressPct === 100 ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <Badge
                    color={checklistStatus === 'COMPLETED' ? 'green' : checklistStatus === 'IN_PROGRESS' ? 'yellow' : 'gray'}
                  >
                    {checkedCount}/{totalCount}
                  </Badge>
                </div>

                {/* Items by section */}
                {Array.from(sections.entries()).map(([sectionName, sectionItems]) => (
                  <div key={sectionName}>
                    {sections.size > 1 && (
                      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                        {sectionName}
                      </p>
                    )}
                    <div className="space-y-1">
                      {sectionItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
                          onClick={() => handleToggleItem(item)}
                        >
                          {item.is_checked ? (
                            <CheckSquare className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-300 group-hover:text-gray-400 mt-0.5 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${item.is_checked ? 'line-through text-muted' : 'text-foreground'}`}>
                              {item.label}
                              {item.is_required && <span className="text-red-500 ml-1">*</span>}
                            </p>
                            {item.notes && <p className="text-xs text-muted mt-0.5">{item.notes}</p>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {item.requires_photo && (
                              <Camera className={`h-4 w-4 ${(item.photos?.length ?? 0) > 0 ? 'text-green-500' : 'text-gray-300'}`} />
                            )}
                            {(item.photos?.length ?? 0) > 0 && (
                              <span className="text-xs text-muted flex items-center gap-0.5">
                                <ImageIcon className="h-3 w-3" />
                                {item.photos!.length}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="text-center py-8 text-sm text-muted">
                No checklist for this ticket. Checklists are created from templates when tickets are generated.
              </div>
            )}
          </div>
        )}

        {/* ========== TAB: Dispatch ========== */}
        {activeTab === 'dispatch' && (
          <div className="space-y-4">
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted">
                    {dayTicketCount} ticket{dayTicketCount !== 1 ? 's' : ''} on {new Date(ticket.scheduled_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                  <Button size="sm" variant="secondary" onClick={() => setShowAssignForm(!showAssignForm)}>
                    <UserPlus className="h-3 w-3" />
                    Assign
                  </Button>
                </div>

                {showAssignForm && (
                  <div className="p-3 rounded-lg border border-border bg-gray-50/50 space-y-3">
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showAvailableOnly}
                        onChange={(e) => setShowAvailableOnly(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <Filter className="h-3 w-3 text-muted" />
                      <span className="text-muted">Show available only</span>
                      {showAvailableOnly && <Badge color="green">{staffForDropdown.length} available</Badge>}
                    </label>
                    <Select
                      value={selectedStaffId}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                      placeholder="Select staff member..."
                      options={staffForDropdown}
                    />
                    {selectedStaffId && busyMap.has(selectedStaffId) && (
                      <div className="flex items-start gap-2 p-2 rounded-lg bg-yellow-50 border border-yellow-200">
                        <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <p className="font-semibold text-yellow-800">Double-booking warning</p>
                          <p className="text-yellow-700">
                            Already assigned to:{' '}
                            {busyMap.get(selectedStaffId)!.tickets.map((t) => (
                              <span key={t.ticketId} className="font-mono">
                                {t.ticketCode} ({t.siteName}{t.startTime ? ` ${t.startTime}` : ''})
                              </span>
                            )).reduce((prev, curr, i) => i === 0 ? [curr] : [...prev, ', ', curr], [] as React.ReactNode[])}
                          </p>
                        </div>
                      </div>
                    )}
                    <Select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} options={ROLE_OPTIONS} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAssign} disabled={!selectedStaffId || assigning}>
                        {assigning ? 'Assigning...' : 'Add'}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setShowAssignForm(false)}>Cancel</Button>
                    </div>
                  </div>
                )}

                {assignments.length === 0 ? (
                  <p className="text-sm text-muted py-4 text-center">No staff assigned yet.</p>
                ) : (
                  <div className="space-y-2">
                    {assignments.map((a) => {
                      const busy = busyMap.get(a.staff_id);
                      const isBusyElsewhere = !!busy && busy.tickets.length > 0;
                      return (
                        <div key={a.id} className={`flex items-center justify-between p-2 rounded-lg border ${
                          isBusyElsewhere ? 'border-yellow-300 bg-yellow-50/50' : 'border-border'
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-gleam-100 flex items-center justify-center text-xs font-bold text-gleam-700">
                              {a.staff?.full_name?.split(' ').map((n) => n[0]).join('') ?? '?'}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{a.staff?.full_name ?? '—'}</p>
                              <div className="flex items-center gap-1">
                                <p className="text-xs text-muted">{a.staff?.staff_code}</p>
                                {isBusyElsewhere && (
                                  <span className="text-xs text-yellow-600 font-medium ml-1">
                                    +{busy.tickets.length} other ticket{busy.tickets.length > 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge color={a.role === 'LEAD' ? 'purple' : 'blue'}>{a.role ?? 'CLEANER'}</Badge>
                            <button
                              onClick={() => handleRemoveAssignment(a.id)}
                              className="p-1 rounded hover:bg-gray-100 text-muted hover:text-red-500 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ========== TAB: Time ========== */}
        {activeTab === 'time' && (
          <div className="space-y-3">
            {timeEntries.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted">
                No time entries for this ticket yet. Staff can clock in from the mobile app.
              </div>
            ) : (
              timeEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium">{entry.staff_name}</p>
                    <p className="text-xs text-muted">
                      {new Date(entry.start_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      {entry.end_at && ` — ${new Date(entry.end_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.duration_minutes != null && (
                      <span className="text-sm font-mono font-bold">
                        {Math.floor(entry.duration_minutes / 60)}h {entry.duration_minutes % 60}m
                      </span>
                    )}
                    <Badge color={entry.status === 'OPEN' ? 'yellow' : entry.status === 'CLOSED' ? 'green' : 'gray'}>
                      {entry.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ========== TAB: Photos ========== */}
        {activeTab === 'photos' && (
          <div className="space-y-3">
            {allPhotos.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted">
                No photos uploaded for this ticket yet. Photos can be added from the mobile app checklist.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {allPhotos.map((photo) => (
                  <div key={photo.id} className="rounded-lg border border-border overflow-hidden">
                    <div className="aspect-square bg-gray-100 flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-gray-300" />
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium truncate">{photo.original_filename}</p>
                      <p className="text-[10px] text-muted truncate">{photo.itemLabel}</p>
                      {photo.caption && <p className="text-xs text-muted mt-0.5">{photo.caption}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </SlideOver>
  );
}
