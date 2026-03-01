'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  KeyRound,
  Pencil,
  PauseCircle,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Badge, Skeleton } from '@gleamops/ui';
import type { KeyInventory } from '@gleamops/shared';
import { KEY_STATUS_COLORS } from '@gleamops/shared';
import { KeyForm } from '@/components/forms/key-form';
import { ActivityHistorySection } from '@/components/activity/activity-history-section';
import { ProfileCompletenessCard, isFieldComplete, type CompletenessItem } from '@/components/detail/profile-completeness-card';
import { toast } from 'sonner';
import { EntityLink } from '@/components/links/entity-link';
import { StatusToggleDialog } from '@/components/detail/status-toggle-dialog';

interface KeyWithRelations extends KeyInventory {
  site?: { name: string; site_code: string } | null;
  assigned?: { full_name: string; staff_code: string } | null;
}

function getKeyRisk(status: KeyInventory['status']): { label: string; color: 'green' | 'blue' | 'yellow' | 'red' | 'gray' } {
  if (status === 'LOST') return { label: 'Security Risk', color: 'red' };
  if (status === 'ASSIGNED') return { label: 'In Circulation', color: 'blue' };
  if (status === 'AVAILABLE') return { label: 'Secure', color: 'green' };
  if (status === 'RETURNED') return { label: 'Returned', color: 'gray' };
  return { label: 'Review', color: 'yellow' };
}

export default function KeyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [key, setKey] = useState<KeyWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [keyFormFocus, setKeyFormFocus] = useState<'details' | undefined>(undefined);

  const fetchKey = async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase
      .from('key_inventory')
      .select('*, site:sites!key_inventory_site_id_fkey(name, site_code), assigned:assigned_to(full_name, staff_code)')
      .eq('key_code', id)
      .is('archived_at', null)
      .single();

    if (data) {
      setKey(data as unknown as KeyWithRelations);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchKey();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleArchive = async () => {
    if (!key) return;
    setArchiveLoading(true);
    const supabase = getSupabaseBrowserClient();
    try {
      const { data: authData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('key_inventory')
        .update({
          archived_at: new Date().toISOString(),
          archived_by: authData.user?.id ?? null,
          archive_reason: 'Deactivated from key detail',
        })
        .eq('id', key.id)
        .eq('version_etag', key.version_etag);

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('Key archived');
      router.push('/assets?tab=keys');
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

  if (!key) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">Key not found.</p>
        <Link
          href="/assets"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Assets
        </Link>
      </div>
    );
  }

  const keyRisk = getKeyRisk(key.status);
  const keyCompletenessItems: CompletenessItem[] = [
    { key: 'label', label: 'Key Label', isComplete: isFieldComplete(key.label), section: 'details' },
    { key: 'key_type', label: 'Key Type', isComplete: isFieldComplete(key.key_type), section: 'details' },
    { key: 'site', label: 'Linked Site', isComplete: isFieldComplete(key.site_id), section: 'details' },
    { key: 'total_count', label: 'Total Count', isComplete: isFieldComplete(key.total_count), section: 'details' },
    { key: 'status', label: 'Status', isComplete: isFieldComplete(key.status), section: 'details' },
    { key: 'notes', label: 'Notes', isComplete: isFieldComplete(key.notes), section: 'details' },
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {(key.photo_thumbnail_url || key.photo_url) ? (
            <img
              src={key.photo_thumbnail_url || key.photo_url!}
              alt={key.label || key.key_code}
              className="h-16 w-16 rounded-full object-cover border border-border"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              <KeyRound className="h-8 w-8" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {key.label || key.key_code}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground font-mono">
                {key.key_code}
              </span>
              <Badge
                color={KEY_STATUS_COLORS[key.status] ?? 'gray'}
              >
                {key.status}
              </Badge>
              <Badge color={keyRisk.color}>{keyRisk.label}</Badge>
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
            className="inline-flex items-center gap-2 rounded-lg border border-destructive/40 px-3.5 py-2 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900/40"
          >
            <PauseCircle className="h-3.5 w-3.5" />
            Deactivate
          </button>
        </div>
      </div>

      <ProfileCompletenessCard
        title="Key Profile"
        items={keyCompletenessItems}
        onNavigateToMissing={() => {
          setKeyFormFocus('details');
          setFormOpen(true);
        }}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{key.total_count}</p>
          <p className="text-xs text-muted-foreground">Total Copies</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">
            {key.assigned ? 'Yes' : 'No'}
          </p>
          <p className="text-xs text-muted-foreground">Assigned</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{key.site?.name ?? '\u2014'}</p>
          <p className="text-xs text-muted-foreground">Site</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground inline-flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-muted-foreground" />
            <Badge color={keyRisk.color}>{keyRisk.label}</Badge>
          </p>
          <p className="text-xs text-muted-foreground">Risk Status</p>
        </div>
      </div>

      {/* Section Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Key Info */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Key Info
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Key Code</dt>
              <dd className="font-medium font-mono text-xs">{key.key_code}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Label</dt>
              <dd className="font-medium">{key.label}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Key Type</dt>
              <dd className="font-medium">
                <Badge color="blue">{key.key_type}</Badge>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Total Count</dt>
              <dd className="font-medium">{key.total_count}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium">
                <Badge color={KEY_STATUS_COLORS[key.status] ?? 'gray'}>
                  {key.status}
                </Badge>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Original Key</dt>
              <dd className="font-medium">{key.is_original != null ? (key.is_original ? 'Yes' : 'No') : '\u2014'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Copy Number</dt>
              <dd className="font-medium">{key.copy_number ?? '\u2014'}</dd>
            </div>
          </dl>
        </div>

        {/* Site & Assignment */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Site & Assignment
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Site</dt>
              <dd className="font-medium">
                {key.site?.site_code
                  ? (
                    <EntityLink
                      entityType="site"
                      code={key.site.site_code}
                      name={key.site.name ?? key.site.site_code}
                      showCode={false}
                    />
                  )
                  : '\u2014'}
              </dd>
            </div>
            {key.site?.site_code && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Site Code</dt>
                <dd className="font-medium font-mono text-xs">
                  <EntityLink entityType="site" code={key.site.site_code} name={key.site.site_code} showCode={false} />
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Assigned To</dt>
              <dd className="font-medium">
                {key.assigned?.staff_code
                  ? (
                    <EntityLink
                      entityType="staff"
                      code={key.assigned.staff_code}
                      name={key.assigned.full_name ?? key.assigned.staff_code}
                      showCode={false}
                    />
                  )
                  : (key.assigned?.full_name ?? '\u2014')}
              </dd>
            </div>
            {key.assigned?.staff_code && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Staff Code</dt>
                <dd className="font-medium font-mono text-xs">
                  <EntityLink entityType="staff" code={key.assigned.staff_code} name={key.assigned.staff_code} showCode={false} />
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Notes */}
      {key.notes && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Notes</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {key.notes}
          </p>
        </div>
      )}

      <ActivityHistorySection
        entityType="key_inventory"
        entityId={key.id}
        entityCode={key.key_code}
        notes={key.notes}
        entityUpdatedAt={key.updated_at}
      />

      {/* Metadata */}
      <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
        <p>Created: {new Date(key.created_at).toLocaleDateString()}</p>
        <p>Updated: {new Date(key.updated_at).toLocaleDateString()}</p>
      </div>

      {/* Edit Form */}
      <KeyForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setKeyFormFocus(undefined);
        }}
        initialData={key}
        onSuccess={fetchKey}
        focusSection={keyFormFocus}
      />

      <StatusToggleDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={() => { void handleArchive(); }}
        entityLabel="Key"
        entityName={key.label || key.key_code}
        mode="deactivate"
        warning={key.status === 'ASSIGNED' ? 'This key is currently assigned and deactivating it may impact access operations.' : null}
        loading={archiveLoading}
      />
    </div>
  );
}
