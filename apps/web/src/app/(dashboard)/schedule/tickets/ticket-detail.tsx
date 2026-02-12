'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  ClipboardList, MapPin, Briefcase, Calendar, Clock,
  UserPlus, X, Users, CheckSquare, Square, Camera, ImageIcon,
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

  // Checklist state
  const [checklistId, setChecklistId] = useState<string | null>(null);
  const [checklistStatus, setChecklistStatus] = useState<string>('PENDING');
  const [checklistItems, setChecklistItems] = useState<ChecklistItemRow[]>([]);
  const [checklistLoading, setChecklistLoading] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!ticket || !open) return;
    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    const [assignRes, staffRes] = await Promise.all([
      supabase
        .from('ticket_assignments')
        .select('*, staff:staff_id(staff_code, full_name, role)')
        .eq('ticket_id', ticket.id)
        .is('archived_at', null),
      supabase
        .from('staff')
        .select('*')
        .is('archived_at', null)
        .order('full_name'),
    ]);

    if (assignRes.data) setAssignments(assignRes.data as unknown as AssignmentWithStaff[]);
    if (staffRes.data) setAllStaff(staffRes.data as unknown as Staff[]);
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

  // Staff already assigned (to filter from dropdown)
  const assignedStaffIds = new Set(assignments.map((a) => a.staff_id));
  const availableStaff = allStaff.filter((s) => !assignedStaffIds.has(s.id));

  // Checklist progress
  const checkedCount = checklistItems.filter((i) => i.is_checked).length;
  const totalCount = checklistItems.length;
  const progressPct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

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
      <div className="space-y-6">
        {/* Status + Change */}
        <div className="flex items-center justify-between">
          <Badge color={TICKET_STATUS_COLORS[ticket.status] ?? 'gray'}>{ticket.status}</Badge>
          <div className="flex items-center gap-2">
            <Select
              value={ticket.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              options={STATUS_OPTIONS}
              className="text-xs"
            />
          </div>
        </div>

        {/* Schedule Info */}
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

        {/* Site + Job Info */}
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
                  <p className="text-xs text-muted">Job</p>
                  <p className="text-sm font-mono">{ticket.job?.job_code ?? '—'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Checklist Section */}
        {checklistLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : checklistItems.length > 0 ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  <span className="inline-flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-muted" />
                    Checklist
                  </span>
                </CardTitle>
                <Badge
                  color={
                    checklistStatus === 'COMPLETED' ? 'green'
                    : checklistStatus === 'IN_PROGRESS' ? 'yellow'
                    : 'gray'
                  }
                >
                  {checkedCount}/{totalCount}
                </Badge>
              </div>
              {/* Progress Bar */}
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    progressPct === 100 ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from(sections.entries()).map(([sectionName, items]) => (
                  <div key={sectionName}>
                    {sections.size > 1 && (
                      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                        {sectionName}
                      </p>
                    )}
                    <div className="space-y-1">
                      {items.map((item) => (
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
                            {item.notes && (
                              <p className="text-xs text-muted mt-0.5">{item.notes}</p>
                            )}
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
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Assigned Staff */}
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  <span className="inline-flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted" />
                    Assigned Staff ({assignments.length})
                  </span>
                </CardTitle>
                <Button size="sm" variant="secondary" onClick={() => setShowAssignForm(!showAssignForm)}>
                  <UserPlus className="h-3 w-3" />
                  Assign
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Assign form */}
              {showAssignForm && (
                <div className="mb-4 p-3 rounded-lg border border-border bg-gray-50/50 space-y-3">
                  <Select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    placeholder="Select staff member..."
                    options={availableStaff.map((s) => ({
                      value: s.id,
                      label: `${s.full_name} (${s.staff_code}) — ${s.role}`,
                    }))}
                  />
                  <Select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    options={ROLE_OPTIONS}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAssign} disabled={!selectedStaffId || assigning}>
                      {assigning ? 'Assigning...' : 'Add'}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setShowAssignForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Assigned list */}
              {assignments.length === 0 ? (
                <p className="text-sm text-muted">No staff assigned yet.</p>
              ) : (
                <div className="space-y-2">
                  {assignments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between p-2 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gleam-100 flex items-center justify-center text-xs font-bold text-gleam-700">
                          {a.staff?.full_name?.split(' ').map((n) => n[0]).join('') ?? '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{a.staff?.full_name ?? '—'}</p>
                          <p className="text-xs text-muted">{a.staff?.staff_code}</p>
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
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Metadata */}
        <div className="text-xs text-muted space-y-1 pt-4 border-t border-border">
          <p>Created: {new Date(ticket.created_at).toLocaleDateString()}</p>
          <p>Updated: {new Date(ticket.updated_at).toLocaleDateString()}</p>
        </div>
      </div>
    </SlideOver>
  );
}
