'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, CalendarClock, ImagePlus, PauseCircle, Pencil, PlayCircle, Wrench } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Badge, Skeleton } from '@gleamops/ui';
import type { Equipment, StatusColor } from '@gleamops/shared';
import { EQUIPMENT_CONDITION_COLORS } from '@gleamops/shared';
import { EquipmentForm } from '@/components/forms/equipment-form';
import { ActivityHistorySection } from '@/components/activity/activity-history-section';
import { ProfileCompletenessCard, isFieldComplete, type CompletenessItem } from '@/components/detail/profile-completeness-card';
import { StatusToggleDialog } from '@/components/detail/status-toggle-dialog';
import { EntityLink } from '@/components/links/entity-link';
import { toast } from 'sonner';

interface EquipmentWithRelations extends Equipment {
  staff?: { full_name: string; staff_code: string } | null;
  site?: { name: string; site_code: string } | null;
}

interface EquipmentAssignmentFallback {
  id: string;
  equipment_id: string;
  assigned_date: string;
  returned_date: string | null;
  notes: string | null;
  staff?: { full_name: string; staff_code: string } | null;
  site?: { name: string; site_code: string } | null;
}

function formatCurrency(n: number | null) {
  if (n == null) return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
}

function formatDate(d: string | null) {
  if (!d) return 'Not Set';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelativeDateTime(dateStr: string): string {
  const target = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - target.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

function readNoteField(notes: string | null | undefined, label: string): string | null {
  if (!notes) return null;
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = notes.match(new RegExp(`${escaped}:\\s*([^\\n\\r]+)`, 'i'));
  const raw = match?.[1]?.trim() ?? null;
  return raw || null;
}

function notSet() {
  return <span className="italic text-muted-foreground">Not Set</span>;
}

export default function EquipmentDetailPage() {
  const { code } = useParams<{ code: string }>();
  const [equipment, setEquipment] = useState<EquipmentWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [equipmentFormFocus, setEquipmentFormFocus] = useState<'basics' | 'model' | 'purchase' | 'maintenance' | 'notes' | undefined>(undefined);
  const [assignmentHistory, setAssignmentHistory] = useState<EquipmentAssignmentFallback[]>([]);

  const fetchEquipment = async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase
      .from('equipment')
      .select('*, staff:assigned_to(full_name, staff_code), site:site_id(name, site_code)')
      .eq('equipment_code', code)
      .is('archived_at', null)
      .single();

    const eq = (data as unknown as EquipmentWithRelations | null) ?? null;
    if (!eq) {
      setEquipment(null);
      setLoading(false);
      return;
    }

    const { data: assignmentRows } = await supabase
      .from('equipment_assignments')
      .select('id, equipment_id, assigned_date, returned_date, notes, staff:staff_id(full_name, staff_code), site:site_id(name, site_code)')
      .eq('equipment_id', eq.id)
      .is('archived_at', null)
      .order('assigned_date', { ascending: false })
      .limit(20);

    const assignmentHistoryRows = (assignmentRows ?? []) as unknown as EquipmentAssignmentFallback[];
    setAssignmentHistory(assignmentHistoryRows);
    const fallback = assignmentHistoryRows.find((row) => row.returned_date == null) ?? assignmentHistoryRows[0] ?? null;
    setEquipment({
      ...eq,
      staff: eq.staff ?? fallback?.staff ?? null,
      site: eq.site ?? fallback?.site ?? null,
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchEquipment();
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusToggle = async () => {
    if (!equipment) return;
    setArchiveLoading(true);
    const supabase = getSupabaseBrowserClient();
    const current = (equipment.condition ?? '').toUpperCase();
    const isInactive = current === 'RETIRED' || current === 'OUT_OF_SERVICE';
    const nextCondition = isInactive ? 'GOOD' : 'RETIRED';
    try {
      const { error } = await supabase
        .from('equipment')
        .update({
          condition: nextCondition,
        })
        .eq('id', equipment.id)
        .eq('version_etag', equipment.version_etag);

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success(`Successfully ${isInactive ? 'reactivated' : 'deactivated'} ${equipment.name || equipment.equipment_code}`);
      await fetchEquipment();
    } finally {
      setArchiveLoading(false);
      setArchiveOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">Equipment not found.</p>
        <Link
          href="/assets"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Assets
        </Link>
      </div>
    );
  }

  const equipmentCompletenessItems: CompletenessItem[] = [
    { key: 'name', label: 'Equipment Name', isComplete: isFieldComplete(equipment.name), section: 'basics' },
    { key: 'equipment_type', label: 'Equipment Type', isComplete: isFieldComplete(equipment.equipment_type), section: 'basics' },
    { key: 'condition', label: 'Condition', isComplete: isFieldComplete(equipment.condition), section: 'basics' },
    { key: 'manufacturer', label: 'Manufacturer', isComplete: isFieldComplete(equipment.manufacturer), section: 'model' },
    { key: 'model_number', label: 'Model Number', isComplete: isFieldComplete(equipment.model_number), section: 'model' },
    { key: 'serial_number', label: 'Serial Number', isComplete: isFieldComplete(equipment.serial_number), section: 'model' },
    { key: 'purchase_date', label: 'Purchase Date', isComplete: isFieldComplete(equipment.purchase_date), section: 'purchase' },
    { key: 'maintenance_schedule', label: 'Maintenance Schedule', isComplete: isFieldComplete(equipment.maintenance_schedule), section: 'maintenance' },
    { key: 'next_maintenance', label: 'Next Maintenance Date', isComplete: isFieldComplete(equipment.next_maintenance_date), section: 'maintenance' },
    { key: 'notes', label: 'Notes', isComplete: isFieldComplete(equipment.notes), section: 'notes' },
  ];
  const isInactive = ['RETIRED', 'OUT_OF_SERVICE'].includes((equipment.condition ?? '').toUpperCase());
  const updatedAgo = formatRelativeDateTime(equipment.updated_at);
  const warrantyProvider = readNoteField(equipment.notes, 'Warranty Provider');
  const warrantyPolicy = readNoteField(equipment.notes, 'Warranty Policy');
  const warrantyExpiry = readNoteField(equipment.notes, 'Warranty Expiry');

  return (
    <div className="space-y-6">
      <Link
        href="/assets"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Assets
      </Link>
      <div className="text-xs text-muted-foreground">
        <Link href="/home" className="hover:text-foreground transition-colors">Home</Link>
        <span className="mx-1">›</span>
        <Link href="/assets" className="hover:text-foreground transition-colors">Assets</Link>
        <span className="mx-1">›</span>
        <span>Equipment</span>
        <span className="mx-1">›</span>
        <span className="font-mono">{equipment.equipment_code}</span>
      </div>

      {isInactive && (
        <div className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-center text-base font-semibold tracking-wide text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          INACTIVE
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {equipment.photo_url ? (
            <img src={equipment.photo_url} alt={`${equipment.name || equipment.equipment_code} photo`} className="h-16 w-16 rounded-full border border-border object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              <Wrench className="h-8 w-8" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">{equipment.name || equipment.equipment_code}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground font-mono">{equipment.equipment_code}</span>
              <Badge color={(EQUIPMENT_CONDITION_COLORS[equipment.condition ?? ''] as StatusColor) ?? 'gray'}>
                {(equipment.condition ?? 'N/A').replace(/_/g, ' ')}
              </Badge>
              {equipment.equipment_type && <Badge color="blue">{equipment.equipment_type}</Badge>}
              <Badge color="gray">{`Updated ${updatedAgo}`}</Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => setArchiveOpen(true)}
            className={isInactive
              ? 'inline-flex items-center gap-2 rounded-lg border border-green-300 px-3.5 py-2 text-sm font-medium text-green-700 hover:bg-green-50 transition-colors'
              : 'inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors'}
          >
            {isInactive ? <PlayCircle className="h-3.5 w-3.5" /> : <PauseCircle className="h-3.5 w-3.5" />}
            {isInactive ? 'Reactivate' : 'Deactivate'}
          </button>
        </div>
      </div>

      <ProfileCompletenessCard
        title="Equipment Profile"
        items={equipmentCompletenessItems}
        onNavigateToMissing={(item) => {
          setEquipmentFormFocus((item.section as 'basics' | 'model' | 'purchase' | 'maintenance' | 'notes' | undefined) ?? 'basics');
          setFormOpen(true);
        }}
      />

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Equipment Photo</h3>
            <p className="mt-1 text-xs text-muted-foreground">Use a clear front-facing photo for quick identification in assignments and audits.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEquipmentFormFocus('basics');
              setFormOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ImagePlus className="h-3.5 w-3.5" />
            {equipment.photo_url ? 'Change Photo' : 'Upload Photo'}
          </button>
        </div>
        <div className="mt-4 flex min-h-40 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20">
          {equipment.photo_url ? (
            <img src={equipment.photo_url} alt={`${equipment.name || equipment.equipment_code} detail`} className="max-h-40 w-auto rounded-md object-contain" />
          ) : (
            <div className="text-center">
              <Wrench className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">No photo uploaded yet</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{equipment.equipment_category ?? 'Not Set'}</p>
          <p className="text-xs text-muted-foreground">Category</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{equipment.manufacturer ?? 'Not Set'}</p>
          <p className="text-xs text-muted-foreground">Manufacturer</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{equipment.model_number ?? 'Not Set'}</p>
          <p className="text-xs text-muted-foreground">Model</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{formatCurrency(equipment.purchase_price ?? null)}</p>
          <p className="text-xs text-muted-foreground">Purchase Price</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Equipment Info</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Equipment Code</dt>
              <dd className="font-medium font-mono text-xs">{equipment.equipment_code}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Equipment Type</dt>
              <dd className="font-medium">{equipment.equipment_type ?? notSet()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Condition</dt>
              <dd className="font-medium">
                <Badge color={(EQUIPMENT_CONDITION_COLORS[equipment.condition ?? ''] as StatusColor) ?? 'gray'}>
                  {(equipment.condition ?? 'N/A').replace(/_/g, ' ')}
                </Badge>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Serial Number</dt>
              <dd className="font-medium font-mono text-xs">{equipment.serial_number ?? 'Not Set'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Purchase Date</dt>
              <dd className="font-medium">{formatDate(equipment.purchase_date)}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Assignment</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Assigned To</dt>
              <dd className="font-medium">
                {equipment.staff?.staff_code
                  ? <EntityLink entityType="staff" code={equipment.staff.staff_code} name={equipment.staff.full_name ?? equipment.staff.staff_code} showCode={false} />
                  : (equipment.staff?.full_name ?? notSet())}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Staff Code</dt>
              <dd className="font-medium font-mono text-xs">{equipment.staff?.staff_code ?? 'Not Set'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Site</dt>
              <dd className="font-medium">
                {equipment.site?.site_code
                  ? <EntityLink entityType="site" code={equipment.site.site_code} name={equipment.site.name ?? equipment.site.site_code} showCode={false} />
                  : (equipment.site?.name ?? notSet())}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Site Code</dt>
              <dd className="font-medium font-mono text-xs">{equipment.site?.site_code ?? 'Not Set'}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            <span className="inline-flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              Maintenance Schedule
            </span>
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Schedule</dt>
              <dd className="font-medium">{equipment.maintenance_schedule ?? notSet()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Last Maintenance</dt>
              <dd className="font-medium">{formatDate(equipment.last_maintenance_date)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Next Maintenance</dt>
              <dd className="font-medium">{formatDate(equipment.next_maintenance_date)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Maintenance Specs</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm">
                {equipment.maintenance_specs ?? <span className="italic text-muted-foreground">Not Set</span>}
              </dd>
            </div>
          </dl>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Warranty Info</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Warranty Provider</dt>
              <dd className="font-medium">{warrantyProvider ?? notSet()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Warranty Policy</dt>
              <dd className="font-medium">{warrantyPolicy ?? notSet()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Warranty Expiry</dt>
              <dd className="font-medium">{warrantyExpiry ?? notSet()}</dd>
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: Add fields like “Warranty Provider: …” and “Warranty Expiry: …” in notes until dedicated columns are introduced.
            </p>
          </dl>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Assignment History</h3>
        {assignmentHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assignment history yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Assigned Date</th>
                  <th className="py-2 pr-3 font-medium">Returned Date</th>
                  <th className="py-2 pr-3 font-medium">Assigned To</th>
                  <th className="py-2 pr-3 font-medium">Site</th>
                  <th className="py-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {assignmentHistory.map((row) => (
                  <tr key={row.id} className="border-b border-border/50">
                    <td className="py-2 pr-3">{formatDate(row.assigned_date)}</td>
                    <td className="py-2 pr-3">{formatDate(row.returned_date)}</td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {row.staff?.staff_code
                        ? <EntityLink entityType="staff" code={row.staff.staff_code} name={row.staff.full_name ?? row.staff.staff_code} showCode={false} />
                        : (row.staff?.full_name ?? 'Not Set')}
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {row.site?.site_code
                        ? <EntityLink entityType="site" code={row.site.site_code} name={row.site.name ?? row.site.site_code} showCode={false} />
                        : (row.site?.name ?? 'Not Set')}
                    </td>
                    <td className="py-2 text-muted-foreground">{row.notes ?? 'Not Set'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Notes</h3>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{equipment.notes || 'Not Set'}</p>
      </div>

      <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
        <p>Created: {formatDate(equipment.created_at)}</p>
        <p>Updated: {formatDate(equipment.updated_at)}</p>
      </div>

      <ActivityHistorySection
        entityType="equipment"
        entityId={equipment.id}
        entityCode={equipment.equipment_code}
        notes={equipment.notes}
        entityUpdatedAt={equipment.updated_at}
      />

      <EquipmentForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEquipmentFormFocus(undefined);
        }}
        initialData={equipment}
        onSuccess={async () => {
          setFormOpen(false);
          await fetchEquipment();
        }}
        focusSection={equipmentFormFocus}
      />

      <StatusToggleDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={handleStatusToggle}
        entityLabel="Equipment"
        entityName={equipment.name || equipment.equipment_code}
        mode={isInactive ? 'reactivate' : 'deactivate'}
        warning={!isInactive && (equipment.staff?.full_name || equipment.site?.name)
          ? `⚠️ This equipment is currently assigned to ${equipment.staff?.full_name ?? 'a staff member'}${equipment.site?.name ? ` at ${equipment.site.name}` : ''}.`
          : null}
        loading={archiveLoading}
      />
    </div>
  );
}
