'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Pencil, Wrench } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Badge, Skeleton } from '@gleamops/ui';
import type { Equipment, StatusColor } from '@gleamops/shared';
import { EQUIPMENT_CONDITION_COLORS } from '@gleamops/shared';
import { EquipmentForm } from '@/components/forms/equipment-form';

interface EquipmentWithRelations extends Equipment {
  staff?: { full_name: string; staff_code: string } | null;
  site?: { name: string; site_code: string } | null;
}

function formatCurrency(n: number | null) {
  if (n == null) return '\u2014';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
}

function formatDate(d: string | null) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function EquipmentDetailPage() {
  const { code } = useParams<{ code: string }>();
  const [equipment, setEquipment] = useState<EquipmentWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  const fetchEquipment = async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase
      .from('equipment')
      .select('*, staff:assigned_to(full_name, staff_code), site:site_id(name, site_code)')
      .eq('equipment_code', code)
      .is('archived_at', null)
      .single();

    setEquipment((data as unknown as EquipmentWithRelations | null) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    fetchEquipment();
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

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
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Assets
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/assets"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Assets
      </Link>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            <Wrench className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{equipment.name || equipment.equipment_code}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground font-mono">{equipment.equipment_code}</span>
              <Badge color={(EQUIPMENT_CONDITION_COLORS[equipment.condition ?? ''] as StatusColor) ?? 'gray'}>
                {(equipment.condition ?? 'N/A').replace(/_/g, ' ')}
              </Badge>
              {equipment.equipment_type && <Badge color="blue">{equipment.equipment_type}</Badge>}
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
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{equipment.equipment_category ?? '\u2014'}</p>
          <p className="text-xs text-muted-foreground">Category</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{equipment.manufacturer ?? '\u2014'}</p>
          <p className="text-xs text-muted-foreground">Manufacturer</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{equipment.model_number ?? '\u2014'}</p>
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
              <dd className="font-medium">{equipment.equipment_type ?? '\u2014'}</dd>
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
              <dd className="font-medium font-mono text-xs">{equipment.serial_number ?? '\u2014'}</dd>
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
              <dd className="font-medium">{equipment.staff?.full_name ?? '\u2014'}</dd>
            </div>
            {equipment.staff?.staff_code && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Staff Code</dt>
                <dd className="font-medium font-mono text-xs">{equipment.staff.staff_code}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Site</dt>
              <dd className="font-medium">{equipment.site?.name ?? '\u2014'}</dd>
            </div>
            {equipment.site?.site_code && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Site Code</dt>
                <dd className="font-medium font-mono text-xs">{equipment.site.site_code}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {equipment.notes && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Notes</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{equipment.notes}</p>
        </div>
      )}

      <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
        <p>Created: {formatDate(equipment.created_at)}</p>
        <p>Updated: {formatDate(equipment.updated_at)}</p>
      </div>

      <EquipmentForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initialData={equipment}
        onSuccess={async () => {
          setFormOpen(false);
          await fetchEquipment();
        }}
      />
    </div>
  );
}

