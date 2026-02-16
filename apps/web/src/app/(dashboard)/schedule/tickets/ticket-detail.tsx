'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ClipboardList, MapPin, Briefcase, Calendar, Clock,
  UserPlus, X, Users, CheckSquare, Square, Camera, ImageIcon,
  AlertTriangle, Filter, Eye, Timer, Shield, Star,
  ExternalLink, Key, MessageSquare,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  SlideOver,
  Badge,
  Button,
  Card,
  CardContent,
  Skeleton,
  Select,
} from '@gleamops/ui';
import { TICKET_STATUS_COLORS, INSPECTION_STATUS_COLORS, ISSUE_SEVERITY_COLORS } from '@gleamops/shared';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import type {
  WorkTicket, TicketAssignment, Staff, TicketChecklistItem, TicketPhoto,
  Inspection, InspectionIssue, TimeException,
  SiteSupply, SiteAssetRequirement, TicketAssetCheckout,
} from '@gleamops/shared';
import { formatDate, formatDateLong } from '@/lib/utils/date';
import { ComposeMessage } from '../../workforce/messages/compose-message';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
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

interface StaffBusyInfo {
  staffId: string;
  tickets: { ticketId: string; ticketCode: string; siteName: string; startTime: string | null; endTime: string | null }[];
}

interface InspectionWithInspector extends Inspection {
  inspector?: { full_name: string } | null;
}

interface TimeExceptionWithStaff extends TimeException {
  staff?: { full_name: string; staff_code: string } | null;
}

interface InspectionIssueWithContext extends InspectionIssue {
  inspection?: { inspection_code: string } | null;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface TicketDetailProps {
  ticket: TicketWithRelations | null;
  open: boolean;
  onClose: () => void;
  onStatusChange?: () => void;
}

type TabKey = 'overview' | 'checklist' | 'photos' | 'time' | 'safety' | 'crew' | 'assets' | 'quality';

const STATUS_OPTIONS = [
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'CANCELED', label: 'Canceled' },
];

const ROLE_OPTIONS = [
  { value: 'LEAD', label: 'Lead' },
  { value: 'CLEANER', label: 'Cleaner' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function TicketDetail({ ticket, open, onClose, onStatusChange }: TicketDetailProps) {
  const messagingEnabled = useFeatureFlag('messaging_v1');
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [composeOpen, setComposeOpen] = useState(false);
  const [supervisorUserId, setSupervisorUserId] = useState<string | null>(null);

  // Assets (staff assignments)
  const [assignments, setAssignments] = useState<AssignmentWithStaff[]>([]);
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedRole, setSelectedRole] = useState('CLEANER');
  const [busyMap, setBusyMap] = useState<Map<string, StaffBusyInfo>>(new Map());
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);

  // Time
  const [timeEntries, setTimeEntries] = useState<{ id: string; staff_name: string; start_at: string; end_at: string | null; duration_minutes: number | null; status: string }[]>([]);

  // Checklist
  const [checklistId, setChecklistId] = useState<string | null>(null);
  const [checklistStatus, setChecklistStatus] = useState<string>('PENDING');
  const [checklistItems, setChecklistItems] = useState<ChecklistItemRow[]>([]);
  const [checklistLoading, setChecklistLoading] = useState(false);

  // Safety
  const [timeExceptions, setTimeExceptions] = useState<TimeExceptionWithStaff[]>([]);
  const [inspectionIssues, setInspectionIssues] = useState<InspectionIssueWithContext[]>([]);
  const [siteSupplies, setSiteSupplies] = useState<SiteSupply[]>([]);

  // Asset gating
  const [assetRequirements, setAssetRequirements] = useState<SiteAssetRequirement[]>([]);
  const [assetCheckouts, setAssetCheckouts] = useState<TicketAssetCheckout[]>([]);

  // Quality
  const [inspections, setInspections] = useState<InspectionWithInspector[]>([]);

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------
  const fetchDetails = useCallback(async () => {
    if (!ticket || !open) return;
    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    const [assignRes, staffRes, dayAssignRes, timeRes, exceptionsRes, inspectionsRes, issuesRes, suppliesRes, requirementsRes, checkoutsRes] = await Promise.all([
      // Staff assignments for this ticket
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
      // Assignments on same date (availability)
      supabase
        .from('ticket_assignments')
        .select(`
          staff_id,
          ticket:ticket_id!inner(
            id, ticket_code, start_time, end_time, status, scheduled_date,
            site:site_id(name)
          )
        `)
        .eq('ticket.scheduled_date', ticket.scheduled_date)
        .neq('ticket.status', 'CANCELED')
        .is('archived_at', null),
      // Time entries
      supabase
        .from('time_entries')
        .select('id, start_at, end_at, duration_minutes, status, staff:staff_id(full_name)')
        .eq('ticket_id', ticket.id)
        .is('archived_at', null)
        .order('start_at', { ascending: false }),
      // Time exceptions (via time_entries for this ticket)
      supabase
        .from('time_exceptions')
        .select('*, staff:staff_id(full_name, staff_code)')
        .is('archived_at', null)
        .order('created_at', { ascending: false }),
      // Inspections for this ticket
      supabase
        .from('inspections')
        .select('*, inspector:inspector_id(full_name)')
        .eq('ticket_id', ticket.id)
        .is('archived_at', null)
        .order('created_at', { ascending: false }),
      // Inspection issues (via inspections for this ticket)
      supabase
        .from('inspection_issues')
        .select('*, inspection:inspection_id(inspection_code)')
        .is('archived_at', null)
        .order('created_at', { ascending: false }),
      // Site supplies (SDS)
      supabase
        .from('site_supplies')
        .select('*')
        .eq('site_id', ticket.site_id)
        .is('archived_at', null)
        .order('name'),
      // Site asset requirements
      supabase
        .from('site_asset_requirements')
        .select('*')
        .eq('site_id', ticket.site_id)
        .is('archived_at', null)
        .order('asset_type'),
      // Ticket asset checkouts
      supabase
        .from('ticket_asset_checkouts')
        .select('*')
        .eq('ticket_id', ticket.id),
    ]);

    if (assignRes.data) setAssignments(assignRes.data as unknown as AssignmentWithStaff[]);
    if (staffRes.data) setAllStaff(staffRes.data as unknown as Staff[]);

    // Time entries
    if (timeRes.data) {
      setTimeEntries(timeRes.data.map((t: Record<string, unknown>) => ({
        id: t.id as string,
        staff_name: (t.staff as { full_name: string } | null)?.full_name ?? '—',
        start_at: t.start_at as string,
        end_at: t.end_at as string | null,
        duration_minutes: t.duration_minutes as number | null,
        status: t.status as string,
      })));
    }

    // Filter time exceptions to only those linked to this ticket's time entries
    if (exceptionsRes.data && timeRes.data) {
      const ticketTimeEntryIds = new Set((timeRes.data as { id: string }[]).map((t) => t.id));
      const filtered = (exceptionsRes.data as unknown as TimeExceptionWithStaff[]).filter(
        (ex) => ex.time_entry_id && ticketTimeEntryIds.has(ex.time_entry_id)
      );
      setTimeExceptions(filtered);
    } else {
      setTimeExceptions([]);
    }

    // Inspections
    if (inspectionsRes.data) {
      setInspections(inspectionsRes.data as unknown as InspectionWithInspector[]);

      // Filter inspection issues to this ticket's inspections
      const ticketInspectionIds = new Set((inspectionsRes.data as { id: string }[]).map((i) => i.id));
      if (issuesRes.data) {
        setInspectionIssues(
          (issuesRes.data as unknown as InspectionIssueWithContext[]).filter(
            (issue) => ticketInspectionIds.has(issue.inspection_id)
          )
        );
      }
    } else {
      setInspections([]);
      setInspectionIssues([]);
    }

    // Build busy map
    const newBusyMap = new Map<string, StaffBusyInfo>();
    if (dayAssignRes.data) {
      for (const row of dayAssignRes.data as unknown as {
        staff_id: string;
        ticket: { id: string; ticket_code: string; start_time: string | null; end_time: string | null; status: string; site: { name: string } | null } | null;
      }[]) {
        if (!row.ticket || row.ticket.id === ticket.id || row.ticket.status === 'CANCELED') continue;
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

    // Resolve site supervisor → user_id for messaging
    if (messagingEnabled && ticket.site_id) {
      const { data: siteRow } = await supabase
        .from('sites')
        .select('supervisor_id')
        .eq('id', ticket.site_id)
        .maybeSingle();
      if (siteRow?.supervisor_id) {
        const { data: supStaff } = await supabase
          .from('staff')
          .select('user_id')
          .eq('id', siteRow.supervisor_id)
          .maybeSingle();
        setSupervisorUserId(supStaff?.user_id ?? null);
      } else {
        setSupervisorUserId(null);
      }
    }

    // Site supplies / SDS
    if (suppliesRes.data) setSiteSupplies(suppliesRes.data as unknown as SiteSupply[]);
    else setSiteSupplies([]);

    // Asset requirements + checkouts
    if (requirementsRes.data) setAssetRequirements(requirementsRes.data as unknown as SiteAssetRequirement[]);
    else setAssetRequirements([]);
    if (checkoutsRes.data) setAssetCheckouts(checkoutsRes.data as unknown as TicketAssetCheckout[]);
    else setAssetCheckouts([]);

    setLoading(false);
  }, [ticket, open, messagingEnabled]);

  const fetchChecklist = useCallback(async () => {
    if (!ticket || !open) return;
    setChecklistLoading(true);
    const supabase = getSupabaseBrowserClient();

    const { data: checklist } = await supabase
      .from('ticket_checklists')
      .select('*')
      .eq('ticket_id', ticket.id)
      .is('archived_at', null)
      .maybeSingle();

    if (checklist) {
      setChecklistId(checklist.id);
      setChecklistStatus(checklist.status);

      const { data: items } = await supabase
        .from('ticket_checklist_items')
        .select('*')
        .eq('checklist_id', checklist.id)
        .is('archived_at', null)
        .order('sort_order');

      if (items && items.length > 0) {
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

  useEffect(() => {
    setShowAssignForm(false);
    setSelectedStaffId('');
    setSelectedRole('CLEANER');
    setShowAvailableOnly(false);
    setActiveTab('overview');
  }, [ticket]);

  useEffect(() => { fetchDetails(); fetchChecklist(); }, [fetchDetails, fetchChecklist]);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------
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
    const { error } = await supabase.rpc('set_ticket_status', {
      p_ticket_id: ticket.id,
      p_status: newStatus,
    });

    if (error) {
      if (error.code === 'P0001') {
        // ASSET_GATE — required assets not checked out
        setActiveTab('assets');
        return;
      }
      if (error.code === 'P0002') {
        // KEY_RETURN_GATE — keys not returned
        setActiveTab('assets');
        return;
      }
      console.error('Status change failed:', error.message);
      return;
    }

    onStatusChange?.();
  };

  const handleAssetCheckout = async (requirementId: string) => {
    if (!ticket) return;
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Look up staff for current user
    const { data: staffRow } = await supabase
      .from('staff')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!staffRow) {
      console.error('No staff record linked to current user — cannot check out assets');
      return;
    }

    await supabase.from('ticket_asset_checkouts').insert({
      tenant_id: ticket.tenant_id,
      ticket_id: ticket.id,
      requirement_id: requirementId,
      staff_id: staffRow.id,
    });
    fetchDetails();
  };

  const handleAssetReturn = async (checkoutId: string) => {
    const supabase = getSupabaseBrowserClient();
    await supabase
      .from('ticket_asset_checkouts')
      .update({ returned_at: new Date().toISOString() })
      .eq('id', checkoutId);
    fetchDetails();
  };

  const handleToggleItem = async (item: ChecklistItemRow) => {
    const supabase = getSupabaseBrowserClient();
    const newChecked = !item.is_checked;

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

  // -----------------------------------------------------------------------
  // Derived data
  // -----------------------------------------------------------------------
  const assignedStaffIds = useMemo(() => new Set(assignments.map((a) => a.staff_id)), [assignments]);

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

  if (!ticket) return null;

  const site = ticket.site;
  const addressParts = [site?.address?.street, site?.address?.city, site?.address?.state, site?.address?.zip].filter(Boolean);

  // Photos
  const allPhotos = checklistItems.flatMap((i) => (i.photos ?? []).map((p) => ({ ...p, itemLabel: i.label })));

  // Checklist progress
  const checkedCount = checklistItems.filter((i) => i.is_checked).length;
  const totalCount = checklistItems.length;
  const progressPct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  // Safety count: exceptions + unresolved issues + supplies
  const unresolvedIssues = inspectionIssues.filter((i) => !i.resolved_at);
  const safetyCount = timeExceptions.length + unresolvedIssues.length + siteSupplies.length;

  // Asset gating
  const requiredAssets = assetRequirements.filter((r) => r.is_required);
  const allRequiredCheckedOut = requiredAssets.every((r) =>
    assetCheckouts.some((c) => c.requirement_id === r.id && !c.returned_at),
  );
  const assetGatingBlocked = requiredAssets.length > 0 && !allRequiredCheckedOut;

  // Quality: best inspection score
  const latestInspection = inspections[0] ?? null;

  // Checklist sections
  const sections = new Map<string, ChecklistItemRow[]>();
  for (const item of checklistItems) {
    const key = item.section || 'General';
    const existing = sections.get(key) || [];
    existing.push(item);
    sections.set(key, existing);
  }

  // -----------------------------------------------------------------------
  // Tab config
  // -----------------------------------------------------------------------
  const TABS: { key: TabKey; label: string; icon: React.ReactNode; count?: string }[] = [
    { key: 'overview', label: 'Overview', icon: <Eye className="h-3.5 w-3.5" /> },
    { key: 'checklist', label: 'Checklist', icon: <ClipboardList className="h-3.5 w-3.5" />, count: totalCount > 0 ? `${checkedCount}/${totalCount}` : undefined },
    { key: 'photos', label: 'Photos', icon: <Camera className="h-3.5 w-3.5" />, count: allPhotos.length > 0 ? String(allPhotos.length) : undefined },
    { key: 'time', label: 'Time', icon: <Timer className="h-3.5 w-3.5" />, count: timeEntries.length > 0 ? String(timeEntries.length) : undefined },
    { key: 'safety', label: 'Safety', icon: <Shield className="h-3.5 w-3.5" />, count: safetyCount > 0 ? String(safetyCount) : undefined },
    { key: 'crew', label: 'Crew', icon: <Users className="h-3.5 w-3.5" />, count: assignments.length > 0 ? String(assignments.length) : undefined },
    { key: 'assets', label: 'Assets', icon: <Key className="h-3.5 w-3.5" />, count: assetRequirements.length > 0 ? String(assetRequirements.length) : undefined },
    { key: 'quality', label: 'Quality', icon: <Star className="h-3.5 w-3.5" />, count: inspections.length > 0 ? String(inspections.length) : undefined },
  ];

  return (
    <SlideOver open={open} onClose={onClose} title={ticket.ticket_code} subtitle={site?.client?.name} wide>
      <div className="space-y-4">
        {/* Status + Change */}
        <div className="flex items-center justify-between">
          <Badge color={TICKET_STATUS_COLORS[ticket.status] ?? 'gray'}>{ticket.status}</Badge>
          <div className="flex items-center gap-2">
            {messagingEnabled && supervisorUserId && (
              <Button size="sm" variant="secondary" onClick={() => setComposeOpen(true)}>
                <MessageSquare className="h-3 w-3" />
                Contact Supervisor
              </Button>
            )}
            <Select
              value={ticket.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              options={STATUS_OPTIONS}
              className="text-xs"
            />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-0.5 border-b border-border overflow-x-auto pb-0">
          {TABS.map((tab) => (
            <button
              type="button"
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1 px-2.5 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === tab.key ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
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
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="text-sm font-medium">{formatDateLong(ticket.scheduled_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Time</p>
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
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Site</p>
                      <p className="text-sm font-medium">{site?.name ?? '—'}</p>
                      {addressParts.length > 0 && (
                        <p className="text-xs text-muted-foreground">{addressParts.join(', ')}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Service Plan</p>
                      <p className="text-sm font-mono">{ticket.job?.job_code ?? '—'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick summary — all tabs at a glance */}
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={() => setActiveTab('checklist')} className="p-2.5 rounded-lg border border-border hover:border-primary/30 text-center transition-colors">
                <p className="text-lg font-bold text-foreground">{progressPct}%</p>
                <p className="text-[10px] text-muted-foreground">Checklist</p>
              </button>
              <button type="button" onClick={() => setActiveTab('crew')} className="p-2.5 rounded-lg border border-border hover:border-primary/30 text-center transition-colors">
                <p className="text-lg font-bold text-foreground">{assignments.length}</p>
                <p className="text-[10px] text-muted-foreground">Crew</p>
              </button>
              <button type="button" onClick={() => setActiveTab('time')} className="p-2.5 rounded-lg border border-border hover:border-primary/30 text-center transition-colors">
                <p className="text-lg font-bold text-foreground">{timeEntries.length}</p>
                <p className="text-[10px] text-muted-foreground">Time Logs</p>
              </button>
              <button type="button" onClick={() => setActiveTab('photos')} className="p-2.5 rounded-lg border border-border hover:border-primary/30 text-center transition-colors">
                <p className="text-lg font-bold text-foreground">{allPhotos.length}</p>
                <p className="text-[10px] text-muted-foreground">Photos</p>
              </button>
              <button type="button" onClick={() => setActiveTab('safety')} className={`p-2.5 rounded-lg border text-center transition-colors ${
                safetyCount > 0 ? 'border-destructive/30 hover:border-destructive bg-destructive/10' : 'border-border hover:border-primary/30'
              }`}>
                <p className={`text-lg font-bold ${safetyCount > 0 ? 'text-destructive' : 'text-foreground'}`}>{safetyCount}</p>
                <p className="text-[10px] text-muted-foreground">Flags</p>
              </button>
              <button type="button" onClick={() => setActiveTab('quality')} className="p-2.5 rounded-lg border border-border hover:border-primary/30 text-center transition-colors">
                <p className="text-lg font-bold text-foreground">
                  {latestInspection?.score_pct != null ? `${Math.round(latestInspection.score_pct)}%` : '—'}
                </p>
                <p className="text-[10px] text-muted-foreground">Quality</p>
              </button>
            </div>

            <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
              <p>Created: {formatDate(ticket.created_at)}</p>
              <p>Updated: {formatDate(ticket.updated_at)}</p>
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
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-muted rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        progressPct === 100 ? 'bg-success' : 'bg-primary'
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

                {Array.from(sections.entries()).map(([sectionName, sectionItems]) => (
                  <div key={sectionName}>
                    {sections.size > 1 && (
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        {sectionName}
                      </p>
                    )}
                    <div className="space-y-1">
                      {sectionItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer group"
                          onClick={() => handleToggleItem(item)}
                        >
                          {item.is_checked ? (
                            <CheckSquare className="h-5 w-5 text-success mt-0.5 shrink-0" />
                          ) : (
                            <Square className="h-5 w-5 text-muted-foreground group-hover:text-muted-foreground mt-0.5 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${item.is_checked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                              {item.label}
                              {item.is_required && <span className="text-destructive ml-1">*</span>}
                            </p>
                            {item.notes && <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {item.requires_photo && (
                              <Camera className={`h-4 w-4 ${(item.photos?.length ?? 0) > 0 ? 'text-success' : 'text-muted-foreground'}`} />
                            )}
                            {(item.photos?.length ?? 0) > 0 && (
                              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
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
              <div className="text-center py-8 text-sm text-muted-foreground">
                No checklist for this ticket.
              </div>
            )}
          </div>
        )}

        {/* ========== TAB: Photos ========== */}
        {activeTab === 'photos' && (
          <div className="space-y-3">
            {allPhotos.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No photos uploaded yet. Photos can be added from the mobile app.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {allPhotos.map((photo) => (
                  <div key={photo.id} className="rounded-lg border border-border overflow-hidden">
                    <div className="aspect-square bg-muted flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium truncate">{photo.original_filename}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{photo.itemLabel}</p>
                      {photo.caption && <p className="text-xs text-muted-foreground mt-0.5">{photo.caption}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========== TAB: Time ========== */}
        {activeTab === 'time' && (
          <div className="space-y-3">
            {timeEntries.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No time entries yet. Staff can clock in from the mobile app.
              </div>
            ) : (
              timeEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium">{entry.staff_name}</p>
                    <p className="text-xs text-muted-foreground">
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

        {/* ========== TAB: Safety ========== */}
        {activeTab === 'safety' && (
          <div className="space-y-4">
            {/* Site Supplies & SDS */}
            {siteSupplies.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Site Supplies & SDS</p>
                {siteSupplies.map((supply) => (
                  <div key={supply.id} className="p-3 rounded-lg border border-border flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{supply.name}</p>
                      {supply.category && <p className="text-xs text-muted-foreground">{supply.category}</p>}
                      {supply.notes && <p className="text-xs text-muted-foreground italic mt-0.5">{supply.notes}</p>}
                    </div>
                    {supply.sds_url ? (
                      <a
                        href={supply.sds_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-medium text-destructive hover:text-destructive shrink-0 px-2.5 py-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View SDS
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground shrink-0">No SDS</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Time exceptions (geofence, late arrival, etc.) */}
            {timeExceptions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Time Exceptions</p>
                {timeExceptions.map((ex) => (
                  <div key={ex.id} className={`p-3 rounded-lg border ${
                    ex.severity === 'CRITICAL' ? 'border-destructive/30 bg-destructive/10' :
                    ex.severity === 'WARNING' ? 'border-warning/30 bg-warning/10' :
                    'border-border'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Shield className={`h-4 w-4 ${
                          ex.severity === 'CRITICAL' ? 'text-destructive' :
                          ex.severity === 'WARNING' ? 'text-warning' :
                          'text-muted-foreground'
                        }`} />
                        <span className="text-sm font-medium">{ex.exception_type.replace(/_/g, ' ')}</span>
                      </div>
                      <Badge color={ex.severity === 'CRITICAL' ? 'red' : ex.severity === 'WARNING' ? 'yellow' : 'gray'}>
                        {ex.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{ex.staff?.full_name ?? '—'}</p>
                    {ex.description && <p className="text-xs text-muted-foreground mt-1">{ex.description}</p>}
                    {ex.resolved_at && (
                      <p className="text-xs text-success mt-1">Resolved: {formatDate(ex.resolved_at)}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Inspection issues */}
            {inspectionIssues.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Inspection Issues</p>
                {inspectionIssues.map((issue) => (
                  <div key={issue.id} className={`p-3 rounded-lg border ${
                    issue.severity === 'CRITICAL' ? 'border-destructive/30 bg-destructive/10' :
                    issue.severity === 'MAJOR' ? 'border-warning/30 bg-warning/10' :
                    'border-border'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{issue.description}</span>
                      <Badge color={ISSUE_SEVERITY_COLORS[issue.severity] ?? 'gray'}>
                        {issue.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">{issue.inspection?.inspection_code}</p>
                    {issue.resolved_at ? (
                      <p className="text-xs text-success mt-1">Resolved: {formatDate(issue.resolved_at)}</p>
                    ) : (
                      <p className="text-xs text-destructive mt-1">Unresolved</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {safetyCount === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No safety data, supplies, or flags for this ticket.
              </div>
            )}
          </div>
        )}

        {/* ========== TAB: Crew (Staff Assignments) ========== */}
        {activeTab === 'crew' && (
          <div className="space-y-4">
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{assignments.length} staff assigned</p>
                  <Button size="sm" variant="secondary" onClick={() => setShowAssignForm(!showAssignForm)}>
                    <UserPlus className="h-3 w-3" />
                    Assign
                  </Button>
                </div>

                {showAssignForm && (
                  <div className="p-3 rounded-lg border border-border bg-muted/50 space-y-3">
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showAvailableOnly}
                        onChange={(e) => setShowAvailableOnly(e.target.checked)}
                        className="rounded border-border"
                      />
                      <Filter className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Show available only</span>
                      {showAvailableOnly && <Badge color="green">{staffForDropdown.length} available</Badge>}
                    </label>
                    <Select
                      value={selectedStaffId}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                      placeholder="Select staff member..."
                      options={staffForDropdown}
                    />
                    {selectedStaffId && busyMap.has(selectedStaffId) && (
                      <div className="flex items-start gap-2 p-2 rounded-lg bg-warning/10 border border-warning/30">
                        <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <p className="font-semibold text-warning">Double-booking warning</p>
                          <p className="text-warning">
                            Already assigned to:{' '}
                            {busyMap.get(selectedStaffId)!.tickets.map((t, i) => (
                              <span key={t.ticketId}>
                                {i > 0 && ', '}
                                <span className="font-mono">{t.ticketCode} ({t.siteName}{t.startTime ? ` ${t.startTime}` : ''})</span>
                              </span>
                            ))}
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
                  <p className="text-sm text-muted-foreground py-4 text-center">No staff assigned yet.</p>
                ) : (
                  <div className="space-y-2">
                    {assignments.map((a) => {
                      const busy = busyMap.get(a.staff_id);
                      const isBusyElsewhere = !!busy && busy.tickets.length > 0;
                      return (
                        <div key={a.id} className={`flex items-center justify-between p-2 rounded-lg border ${
                          isBusyElsewhere ? 'border-warning/30 bg-warning/10' : 'border-border'
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                              {a.staff?.full_name?.split(' ').map((n) => n[0]).join('') ?? '?'}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{a.staff?.full_name ?? '—'}</p>
                              <div className="flex items-center gap-1">
                                <p className="text-xs text-muted-foreground">{a.staff?.staff_code}</p>
                                {isBusyElsewhere && (
                                  <span className="text-xs text-warning font-medium ml-1">
                                    +{busy.tickets.length} other ticket{busy.tickets.length > 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge color={a.role === 'LEAD' ? 'purple' : 'blue'}>{a.role ?? 'CLEANER'}</Badge>
                            <button
                              type="button"
                              onClick={() => handleRemoveAssignment(a.id)}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
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

        {/* ========== TAB: Assets (Checkout / Return) ========== */}
        {activeTab === 'assets' && (
          <div className="space-y-4">
            {assetRequirements.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No asset requirements for this site.
              </div>
            ) : (
              <>
                {assetGatingBlocked && ticket.status === 'SCHEDULED' && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
                    <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                    <p className="text-xs text-warning">
                      All required assets must be checked out before starting work.
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  {assetRequirements.map((req) => {
                    const checkout = assetCheckouts.find((c) => c.requirement_id === req.id && !c.returned_at);
                    const isCheckedOut = !!checkout;
                    const ICONS: Record<string, string> = { KEY: '\uD83D\uDD11', VEHICLE: '\uD83D\uDE90', EQUIPMENT: '\uD83E\uDDF9' };

                    return (
                      <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-lg">{ICONS[req.asset_type] ?? '\uD83D\uDCE6'}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium">
                              {req.description}
                              {req.is_required && <span className="text-destructive ml-1">*</span>}
                            </p>
                            <p className="text-[10px] text-muted-foreground uppercase">{req.asset_type}</p>
                          </div>
                        </div>
                        {isCheckedOut ? (
                          <Button size="sm" variant="secondary" onClick={() => handleAssetReturn(checkout!.id)}>
                            Return
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => handleAssetCheckout(req.id)}>
                            Check Out
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ========== TAB: Quality ========== */}
        {activeTab === 'quality' && (
          <div className="space-y-4">
            {inspections.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No inspections for this ticket yet.
              </div>
            ) : (
              inspections.map((insp) => (
                <div key={insp.id} className="p-4 rounded-lg border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono font-medium">{insp.inspection_code}</span>
                    <Badge color={INSPECTION_STATUS_COLORS[insp.status] ?? 'gray'}>
                      {insp.status}
                    </Badge>
                  </div>

                  {/* Score bar */}
                  {insp.score_pct != null && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Score</span>
                        <span className={`font-bold ${insp.passed ? 'text-success' : 'text-destructive'}`}>
                          {Math.round(insp.score_pct)}%
                          {insp.passed != null && (insp.passed ? ' — Pass' : ' — Fail')}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            insp.passed ? 'bg-success' : 'bg-destructive'
                          }`}
                          style={{ width: `${Math.min(100, Math.round(insp.score_pct))}%` }}
                        />
                      </div>
                      {insp.total_score != null && insp.max_score != null && (
                        <p className="text-xs text-muted-foreground text-right">{insp.total_score}/{insp.max_score} points</p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Inspector: {insp.inspector?.full_name ?? '—'}</span>
                    {insp.completed_at && (
                      <span>{formatDate(insp.completed_at)}</span>
                    )}
                  </div>

                  {insp.notes && (
                    <p className="text-xs text-muted-foreground border-t border-border pt-2">{insp.notes}</p>
                  )}

                  {/* Related issues for this inspection */}
                  {inspectionIssues.filter((i) => i.inspection_id === insp.id).length > 0 && (
                    <div className="border-t border-border pt-2 space-y-1.5">
                      <p className="text-xs font-semibold text-muted-foreground">Issues</p>
                      {inspectionIssues
                        .filter((i) => i.inspection_id === insp.id)
                        .map((issue) => (
                          <div key={issue.id} className="flex items-center justify-between text-xs">
                            <span className="text-foreground">{issue.description}</span>
                            <Badge color={ISSUE_SEVERITY_COLORS[issue.severity] ?? 'gray'}>
                              {issue.severity}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Contact Supervisor compose */}
      {messagingEnabled && supervisorUserId && (
        <ComposeMessage
          open={composeOpen}
          onClose={() => setComposeOpen(false)}
          onCreated={() => setComposeOpen(false)}
          presetRecipientId={supervisorUserId}
          presetSubject={`Re: ${ticket.ticket_code}`}
          presetTicketId={ticket.id}
        />
      )}
    </SlideOver>
  );
}
