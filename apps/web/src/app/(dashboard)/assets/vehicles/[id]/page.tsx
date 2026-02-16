'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Car,
  Pencil,
  PauseCircle,
  PlayCircle,
  AlertTriangle,
  Clock3,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Badge, Skeleton } from '@gleamops/ui';
import type { Vehicle } from '@gleamops/shared';
import { VEHICLE_STATUS_COLORS } from '@gleamops/shared';
import { VehicleForm } from '@/components/forms/vehicle-form';
import { ActivityHistorySection } from '@/components/activity/activity-history-section';
import { ProfileCompletenessCard, isFieldComplete, type CompletenessItem } from '@/components/detail/profile-completeness-card';
import { StatusToggleDialog } from '@/components/detail/status-toggle-dialog';
import { toast } from 'sonner';

interface VehicleWithAssigned extends Vehicle {
  assigned?: { full_name: string; staff_code: string } | null;
}

interface VehicleMaintenanceSummary {
  service_date: string | null;
  next_service_date: string | null;
}

function getMaintenanceUrgency(nextServiceDate: string | null): { label: string; color: 'green' | 'yellow' | 'red' | 'gray' } {
  if (!nextServiceDate) return { label: 'Not Scheduled', color: 'gray' };
  const today = new Date();
  const due = new Date(nextServiceDate);
  const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: 'Overdue', color: 'red' };
  if (diffDays <= 7) return { label: 'Due This Week', color: 'yellow' };
  return { label: 'On Schedule', color: 'green' };
}

function notSet() {
  return <span className="italic text-muted-foreground">Not Set</span>;
}

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [vehicle, setVehicle] = useState<VehicleWithAssigned | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [vehicleFormFocus, setVehicleFormFocus] = useState<'basics' | 'details' | 'notes' | undefined>(undefined);
  const [maintenance, setMaintenance] = useState<VehicleMaintenanceSummary | null>(null);

  const fetchVehicle = async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase
      .from('vehicles')
      .select('*, assigned:assigned_to(full_name, staff_code)')
      .eq('vehicle_code', id)
      .is('archived_at', null)
      .single();

    if (data) {
      setVehicle(data as unknown as VehicleWithAssigned);
      const { data: maintenanceRows } = await supabase
        .from('vehicle_maintenance')
        .select('service_date, next_service_date')
        .eq('vehicle_id', data.id)
        .is('archived_at', null)
        .order('service_date', { ascending: false })
        .limit(1);
      setMaintenance((maintenanceRows?.[0] as VehicleMaintenanceSummary | undefined) ?? null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVehicle();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusToggle = async () => {
    if (!vehicle) return;
    setArchiveLoading(true);
    const supabase = getSupabaseBrowserClient();
    const isInactive = (vehicle.status ?? '').toUpperCase() === 'RETIRED';
    const nextStatus = isInactive ? 'ACTIVE' : 'RETIRED';
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({
          status: nextStatus,
        })
        .eq('id', vehicle.id)
        .eq('version_etag', vehicle.version_etag);

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success(`Successfully ${isInactive ? 'reactivated' : 'deactivated'} ${vehicle.name || vehicle.vehicle_code}`);
      await fetchVehicle();
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

  if (!vehicle) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">Vehicle not found.</p>
        <Link
          href="/assets"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Assets
        </Link>
      </div>
    );
  }

  const makeModel = [vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Not Set';
  const maintenanceUrgency = getMaintenanceUrgency(maintenance?.next_service_date ?? null);
  const isInactive = (vehicle.status ?? '').toUpperCase() === 'RETIRED';
  const vehicleCompletenessItems: CompletenessItem[] = [
    { key: 'name', label: 'Vehicle Name', isComplete: isFieldComplete(vehicle.name), section: 'basics' },
    { key: 'status', label: 'Vehicle Status', isComplete: isFieldComplete(vehicle.status), section: 'basics' },
    { key: 'make_model', label: 'Make & Model', isComplete: isFieldComplete(vehicle.make) && isFieldComplete(vehicle.model), section: 'details' },
    { key: 'year', label: 'Year', isComplete: isFieldComplete(vehicle.year), section: 'details' },
    { key: 'license_plate', label: 'License Plate', isComplete: isFieldComplete(vehicle.license_plate), section: 'details' },
    { key: 'vin', label: 'VIN', isComplete: isFieldComplete(vehicle.vin), section: 'details' },
    { key: 'assigned_to', label: 'Assigned Staff', isComplete: isFieldComplete(vehicle.assigned_to), section: 'details' },
    { key: 'notes', label: 'Notes', isComplete: isFieldComplete(vehicle.notes), section: 'notes' },
  ];

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/assets"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Assets
      </Link>

      {isInactive && (
        <div className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-center text-base font-semibold tracking-wide text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          INACTIVE
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            <Car className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {vehicle.name || vehicle.vehicle_code}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground font-mono">
                {vehicle.vehicle_code}
              </span>
              <Badge
                color={VEHICLE_STATUS_COLORS[vehicle.status] ?? 'gray'}
              >
                {vehicle.status}
              </Badge>
              <Badge color={maintenanceUrgency.color}>{maintenanceUrgency.label}</Badge>
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
        title="Vehicle Profile"
        items={vehicleCompletenessItems}
        onNavigateToMissing={(item) => {
          setVehicleFormFocus((item.section as 'basics' | 'details' | 'notes' | undefined) ?? 'basics');
          setFormOpen(true);
        }}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{vehicle.year ?? 'Not Set'}</p>
          <p className="text-xs text-muted-foreground">Year</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{makeModel}</p>
          <p className="text-xs text-muted-foreground">Make / Model</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{vehicle.license_plate ?? 'Not Set'}</p>
          <p className="text-xs text-muted-foreground">License Plate</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">
            {maintenance?.next_service_date ? new Date(maintenance.next_service_date).toLocaleDateString() : 'Not Set'}
          </p>
          <p className="text-xs text-muted-foreground">Next Service</p>
        </div>
      </div>

      {/* Section Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Vehicle Info */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Vehicle Info
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Make</dt>
              <dd className="font-medium">{vehicle.make ?? notSet()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Model</dt>
              <dd className="font-medium">{vehicle.model ?? notSet()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Year</dt>
              <dd className="font-medium">{vehicle.year ?? notSet()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Color</dt>
              <dd className="font-medium">{vehicle.color ?? notSet()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">VIN</dt>
              <dd className="font-medium font-mono text-xs">{vehicle.vin ?? notSet()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">License Plate</dt>
              <dd className="font-medium">{vehicle.license_plate ?? notSet()}</dd>
            </div>
          </dl>
        </div>

        {/* Assignment */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Assignment
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Assigned To</dt>
              <dd className="font-medium">{vehicle.assigned?.full_name ?? notSet()}</dd>
            </div>
            {vehicle.assigned?.staff_code && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Staff Code</dt>
                <dd className="font-medium font-mono text-xs">{vehicle.assigned.staff_code}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium">
                <Badge color={VEHICLE_STATUS_COLORS[vehicle.status] ?? 'gray'}>
                  {vehicle.status}
                </Badge>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground inline-flex items-center gap-1"><Clock3 className="h-3 w-3" /> Maintenance</dt>
              <dd className="font-medium">
                <Badge color={maintenanceUrgency.color}>{maintenanceUrgency.label}</Badge>
              </dd>
            </div>
            {maintenance?.service_date && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Last Service</dt>
                <dd className="font-medium">{new Date(maintenance.service_date).toLocaleDateString()}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Notes */}
      {vehicle.notes && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Notes</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {vehicle.notes}
          </p>
        </div>
      )}

      <ActivityHistorySection
        entityType="vehicles"
        entityId={vehicle.id}
        entityCode={vehicle.vehicle_code}
        notes={vehicle.notes}
        entityUpdatedAt={vehicle.updated_at}
      />

      {/* Metadata */}
      <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
        <p>Created: {new Date(vehicle.created_at).toLocaleDateString()}</p>
        <p>Updated: {new Date(vehicle.updated_at).toLocaleDateString()}</p>
      </div>

      {/* Edit Form */}
      <VehicleForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setVehicleFormFocus(undefined);
        }}
        initialData={vehicle}
        onSuccess={fetchVehicle}
        focusSection={vehicleFormFocus}
      />

      <StatusToggleDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={handleStatusToggle}
        entityLabel="Vehicle"
        entityName={vehicle.name || vehicle.vehicle_code}
        mode={isInactive ? 'reactivate' : 'deactivate'}
        warning={!isInactive && vehicle.assigned?.full_name
          ? `⚠️ This vehicle is currently assigned to ${vehicle.assigned.full_name} and may impact active schedules.`
          : null}
        loading={archiveLoading}
      />
    </div>
  );
}
