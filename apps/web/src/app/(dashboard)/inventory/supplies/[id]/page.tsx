'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Package,
  Pencil,
  Trash2,
  AlertTriangle,
  Info,
  Boxes,
  FileText,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Badge, Skeleton } from '@gleamops/ui';
import type { SupplyCatalog } from '@gleamops/shared';
import { SupplyForm } from '@/components/forms/supply-form';

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

export default function SupplyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [supply, setSupply] = useState<SupplyCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

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
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Inventory
        </Link>
      </div>
    );
  }

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
          {supply.image_url ? (
            <img
              src={supply.image_url}
              alt={supply.name}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              <Package className="h-7 w-7" />
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
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3.5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors dark:border-red-900 dark:hover:bg-red-950">
            <Trash2 className="h-3.5 w-3.5" />
            Deactivate
          </button>
        </div>
      </div>

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
              <dt className="text-muted-foreground">Eco Rating</dt>
              <dd className="font-medium">{supply.eco_rating ?? '\u2014'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">PPE Required</dt>
              <dd className="font-medium">
                {supply.ppe_required ? 'Yes' : 'No'}
              </dd>
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
              <dt className="text-muted-foreground">Eco Rating</dt>
              <dd className="font-medium">{supply.eco_rating ?? '\u2014'}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-muted-foreground">Safety Data Sheet</dt>
              <dd className="font-medium">
                {supply.sds_url ? (
                  <a
                    href={supply.sds_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:text-primary/80"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View SDS
                  </a>
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

      {/* Metadata */}
      <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
        <p>Created: {new Date(supply.created_at).toLocaleDateString()}</p>
        <p>Updated: {new Date(supply.updated_at).toLocaleDateString()}</p>
      </div>

      {/* Edit Form */}
      <SupplyForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initialData={supply}
        onSuccess={fetchSupply}
      />
    </div>
  );
}
