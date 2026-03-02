'use client';

/* eslint-disable @next/next/no-img-element */

import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Package,
  Pencil,
  Trash2,
  PauseCircle,
  PlayCircle,
  AlertTriangle,
  Info,
  Boxes,
  FileText,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  SprayCan,
  Brush,
  Upload,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { isExternalHttpUrl } from '@/lib/url';
import { Badge, Skeleton } from '@gleamops/ui';
import type { SupplyCatalog } from '@gleamops/shared';
import { SupplyForm } from '@/components/forms/supply-form';
import { ActivityHistorySection } from '@/components/activity/activity-history-section';
import { ProfileCompletenessCard, isFieldComplete, type CompletenessItem } from '@/components/detail/profile-completeness-card';
import { StatusToggleDialog } from '@/components/detail/status-toggle-dialog';
import { toast } from 'sonner';

function formatCurrency(n: number | null) {
  if (n == null) return '\u2014';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function supplyStatusColor(status: string | null): 'green' | 'red' | 'gray' {
  if (status === 'ACTIVE') return 'green';
  if (status === 'DISCONTINUED') return 'red';
  return 'gray';
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

function supplyCategoryIcon(category: string | null | undefined) {
  const normalized = (category ?? '').toLowerCase();
  if (normalized.includes('liner') || normalized.includes('bag')) {
    return <Trash2 className="h-7 w-7" aria-hidden />;
  }
  if (normalized.includes('chemical')) {
    return <SprayCan className="h-7 w-7" aria-hidden />;
  }
  if (normalized.includes('mop') || normalized.includes('bucket')) {
    return <Brush className="h-7 w-7" aria-hidden />;
  }
  if (normalized.includes('safety') || normalized.includes('ppe')) {
    return <ShieldCheck className="h-7 w-7" aria-hidden />;
  }
  return <Package className="h-7 w-7" aria-hidden />;
}

export default function SupplyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [supply, setSupply] = useState<SupplyCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [supplyFormFocus, setSupplyFormFocus] = useState<'details' | undefined>(undefined);
  const [simpleView, setSimpleView] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);

  const fetchSupply = async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase
      .from('supply_catalog')
      .select('*')
      .eq('code', id)
      .is('archived_at', null)
      .single();

    if (data) {
      setSupply(data as unknown as SupplyCatalog);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSupply();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setSimpleView(localStorage.getItem('gleamops-inventory-simple-view') === 'true');
  }, []);

  useEffect(() => {
    localStorage.setItem('gleamops-inventory-simple-view', String(simpleView));
  }, [simpleView]);

  useEffect(() => {
    setImageLoadError(false);
  }, [supply?.image_url]);

  const handleStatusToggle = async () => {
    if (!supply) return;
    setArchiveLoading(true);
    const supabase = getSupabaseBrowserClient();
    const isInactive = (supply.supply_status ?? 'ACTIVE').toUpperCase() === 'DISCONTINUED';
    const nextStatus = isInactive ? 'ACTIVE' : 'DISCONTINUED';

    try {
      const { error } = await supabase
        .from('supply_catalog')
        .update({
          supply_status: nextStatus,
        })
        .eq('id', supply.id)
        .eq('version_etag', supply.version_etag);

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success(`Successfully ${isInactive ? 'reactivated' : 'deactivated'} ${supply.name}`);
      await fetchSupply();
    } finally {
      setArchiveLoading(false);
      setArchiveOpen(false);
    }
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !supply) return;

    if (!file.type.startsWith('image/')) {
      setImageUploadError('Please upload a valid image file.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setImageUploadError('Image must be 2MB or smaller.');
      return;
    }

    setImageUploading(true);
    setImageUploadError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
      const path = `supply-images/${supply.code}-${Date.now()}.${safeExt}`;
      const buckets = ['supply-images', 'documents'];
      let publicUrl: string | null = null;
      let lastError: Error | null = null;

      for (const bucket of buckets) {
        const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
          upsert: true,
          contentType: file.type,
        });
        if (uploadError) {
          lastError = uploadError;
          continue;
        }
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
        publicUrl = urlData.publicUrl;
        break;
      }

      if (!publicUrl) {
        throw lastError ?? new Error('Upload failed.');
      }

      const { error: updateError } = await supabase
        .from('supply_catalog')
        .update({ image_url: publicUrl })
        .eq('id', supply.id);

      if (updateError) throw updateError;

      setSupply((prev) => (prev ? { ...prev, image_url: publicUrl } : prev));
      setImageLoadError(false);
      toast.success('Product image updated.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Image upload failed.';
      setImageUploadError(message);
      toast.error(message);
    } finally {
      setImageUploading(false);
      event.target.value = '';
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

  if (!supply) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">Supply not found.</p>
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Inventory
        </Link>
      </div>
    );
  }

  const supplyCompletenessItems: CompletenessItem[] = [
    { key: 'category', label: 'Category', isComplete: isFieldComplete(supply.category), section: 'details' },
    { key: 'unit', label: 'Unit of Measure', isComplete: isFieldComplete(supply.unit), section: 'details' },
    { key: 'unit_cost', label: 'Unit Cost', isComplete: isFieldComplete(supply.unit_cost), section: 'details' },
    { key: 'min_stock', label: 'Minimum Stock Level', isComplete: isFieldComplete(supply.min_stock_level), section: 'details' },
    { key: 'preferred_vendor', label: 'Preferred Vendor', isComplete: isFieldComplete(supply.preferred_vendor), section: 'details' },
    { key: 'sds_url', label: 'Safety Data Sheet URL', isComplete: isFieldComplete(supply.sds_url), section: 'details' },
    { key: 'image', label: 'Product Image', isComplete: isFieldComplete(supply.image_url), section: 'details' },
    { key: 'notes', label: 'Notes', isComplete: isFieldComplete(supply.notes), section: 'details' },
  ];
  const isInactive = (supply.supply_status ?? 'ACTIVE').toUpperCase() === 'DISCONTINUED';

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/inventory"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Inventory
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {supply.image_url && !imageLoadError ? (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-slate-50 p-2 dark:bg-slate-900">
              <img
                src={supply.image_url}
                alt={supply.name}
                className="h-full w-full object-contain"
                onError={() => setImageLoadError(true)}
              />
            </div>
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              {supplyCategoryIcon(supply.category)}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">{supply.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground font-mono">
                {supply.code}
              </span>
              {supply.category && (
                <Badge color="blue">{supply.category}</Badge>
              )}
              <Badge color={supplyStatusColor(supply.supply_status)}>
                {supply.supply_status ?? 'ACTIVE'}
              </Badge>
              <Badge color="gray">{`Updated ${formatRelativeDateTime(supply.updated_at)}`}</Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleImageUpload}
            disabled={imageUploading}
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            disabled={imageUploading}
          >
            <Upload className="h-3.5 w-3.5" />
            {imageUploading ? 'Uploading...' : 'Upload Image'}
          </button>
          <button
            type="button"
            onClick={() => setSimpleView((value) => !value)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {simpleView ? 'Simple View On' : 'Simple View'}
          </button>
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
              : 'inline-flex items-center gap-2 rounded-lg border border-destructive/40 px-3.5 py-2 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors'}
          >
            {isInactive ? <PlayCircle className="h-3.5 w-3.5" /> : <PauseCircle className="h-3.5 w-3.5" />}
            {isInactive ? 'Reactivate' : 'Deactivate'}
          </button>
        </div>
      </div>
      {imageUploadError && (
        <p className="text-xs font-medium text-red-600 dark:text-red-400">{imageUploadError}</p>
      )}

      <ProfileCompletenessCard
        title="Supply Profile"
        items={supplyCompletenessItems}
        onNavigateToMissing={() => {
          setSupplyFormFocus('details');
          setFormOpen(true);
        }}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(supply.unit_cost)}
          </p>
          <p className="text-xs text-muted-foreground">Unit Cost</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">
            {supply.min_stock_level ?? '\u2014'}
          </p>
          <p className="text-xs text-muted-foreground">Min Stock Level</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">
            {supply.markup_percentage != null
              ? `${supply.markup_percentage}%`
              : '\u2014'}
          </p>
          <p className="text-xs text-muted-foreground">Markup</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(supply.billing_rate)}
          </p>
          <p className="text-xs text-muted-foreground">Billing Rate</p>
        </div>
      </div>

      {/* Section Cards */}
      {!simpleView && (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Product Info */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            <span className="inline-flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              Product Info
            </span>
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{supply.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Code</dt>
              <dd className="font-medium font-mono">{supply.code}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Category</dt>
              <dd className="font-medium">{supply.category ?? '\u2014'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Brand</dt>
              <dd className="font-medium">{supply.brand ?? '\u2014'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Manufacturer</dt>
              <dd className="font-medium">{supply.manufacturer ?? '\u2014'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Model Number</dt>
              <dd className="font-medium font-mono">
                {supply.model_number ?? '\u2014'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Product Attributes</dt>
              <dd className="font-medium">{supply.product_attributes ? JSON.stringify(supply.product_attributes) : '\u2014'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">PPE Required</dt>
              <dd className="font-medium">
                {supply.ppe_required ? 'Yes' : 'No'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Alternative Items</dt>
              <dd className="font-medium">{supply.alternative_items ?? '\u2014'}</dd>
            </div>
          </dl>
        </div>

        {/* Inventory & Pricing */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            <span className="inline-flex items-center gap-2">
              <Boxes className="h-4 w-4 text-muted-foreground" />
              Inventory & Pricing
            </span>
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Unit of Measure</dt>
              <dd className="font-medium">{supply.unit}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Pack Size</dt>
              <dd className="font-medium">{supply.pack_size ?? '\u2014'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Unit Cost</dt>
              <dd className="font-medium">{formatCurrency(supply.unit_cost)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Markup</dt>
              <dd className="font-medium">
                {supply.markup_percentage != null
                  ? `${supply.markup_percentage}%`
                  : '\u2014'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Billing Rate</dt>
              <dd className="font-medium">{formatCurrency(supply.billing_rate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Min Stock Level</dt>
              <dd className="font-medium">
                {supply.min_stock_level ?? '\u2014'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Preferred Vendor</dt>
              <dd className="font-medium">
                {supply.preferred_vendor ?? '\u2014'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Vendor SKU</dt>
              <dd className="font-medium font-mono">
                {supply.vendor_sku ?? '\u2014'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Safety & Compliance */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              Safety & Compliance
            </span>
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">PPE Required</dt>
              <dd className="font-medium">
                {supply.ppe_required ? 'Yes' : 'No'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Product Attributes</dt>
              <dd className="font-medium">{supply.product_attributes ? JSON.stringify(supply.product_attributes) : '\u2014'}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-muted-foreground">Safety Data Sheet</dt>
              <dd className="font-medium">
                {isExternalHttpUrl(supply.sds_url) ? (
                  <a
                    href={supply.sds_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:text-primary/80"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View SDS
                  </a>
                ) : supply.sds_url ? (
                  <span className="text-muted-foreground" title={supply.sds_url}>On File</span>
                ) : (
                  '\u2014'
                )}
              </dd>
            </div>
          </dl>
        </div>

        {/* Notes & Description */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            <span className="inline-flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Notes & Description
            </span>
          </h3>
          <dl className="space-y-3 text-sm">
            {supply.description ? (
              <div>
                <dt className="text-muted-foreground font-medium">Description</dt>
                <dd className="mt-1 whitespace-pre-wrap">{supply.description}</dd>
              </div>
            ) : (
              <p className="text-muted-foreground">No description.</p>
            )}
            {supply.notes && (
              <div>
                <dt className="text-muted-foreground font-medium">Notes</dt>
                <dd className="mt-1 whitespace-pre-wrap">{supply.notes}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
      )}

      <ActivityHistorySection
        entityType="supply_catalog"
        entityId={supply.id}
        entityCode={supply.code}
        notes={supply.notes}
        entityUpdatedAt={supply.updated_at}
      />

      {/* Metadata */}
      <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
        <p>Created: {new Date(supply.created_at).toLocaleDateString()}</p>
        <p>Updated: {new Date(supply.updated_at).toLocaleDateString()}</p>
      </div>

      {/* Edit Form */}
      <SupplyForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setSupplyFormFocus(undefined);
        }}
        initialData={supply}
        onSuccess={fetchSupply}
        focusSection={supplyFormFocus}
      />

      <StatusToggleDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={handleStatusToggle}
        entityLabel="Supply Item"
        entityName={supply.name}
        mode={isInactive ? 'reactivate' : 'deactivate'}
        loading={archiveLoading}
      />
    </div>
  );
}
