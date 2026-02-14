'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Pencil,
  Trash2,
  Mail,
  Phone,
  Globe,
  MapPin,
  AlertTriangle,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Badge, Skeleton } from '@gleamops/ui';
import type { Client } from '@gleamops/shared';
import { CLIENT_STATUS_COLORS } from '@gleamops/shared';
import { ClientForm } from '@/components/forms/client-form';

function formatCurrency(n: number | null) {
  if (n == null) return '\u2014';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(d: string | null) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  // Related data counts
  const [siteCount, setSiteCount] = useState(0);
  const [activeJobCount, setActiveJobCount] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);

  const fetchClient = async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('client_code', id)
      .is('archived_at', null)
      .single();

    if (data) {
      const c = data as unknown as Client;
      setClient(c);

      // Fetch related counts
      const [sitesRes] = await Promise.all([
        supabase
          .from('sites')
          .select('id')
          .eq('client_id', c.id)
          .is('archived_at', null),
      ]);

      const sites = sitesRes.data ?? [];
      setSiteCount(sites.length);

      if (sites.length > 0) {
        const siteIds = sites.map((s: { id: string }) => s.id);
        const { data: jobsData } = await supabase
          .from('site_jobs')
          .select('id, status, billing_amount')
          .in('site_id', siteIds)
          .is('archived_at', null);

        const jobs = jobsData ?? [];
        const active = jobs.filter(
          (j: { status: string }) => j.status === 'ACTIVE'
        );
        setActiveJobCount(active.length);
        setMonthlyRevenue(
          active.reduce(
            (sum: number, j: { billing_amount: number | null }) =>
              sum + (j.billing_amount ?? 0),
            0
          )
        );
      } else {
        setActiveJobCount(0);
        setMonthlyRevenue(0);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClient();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">Client not found.</p>
        <Link
          href="/crm"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to CRM
        </Link>
      </div>
    );
  }

  const addr = client.billing_address;
  const contractActive =
    client.contract_start_date && !client.contract_end_date
      ? 'Active'
      : client.contract_end_date &&
          new Date(client.contract_end_date) > new Date()
        ? 'Active'
        : client.contract_end_date
          ? 'Expired'
          : '\u2014';

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/crm"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to CRM
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            {getInitials(client.name)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {client.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground font-mono">
                {client.client_code}
              </span>
              <Badge
                color={CLIENT_STATUS_COLORS[client.status] ?? 'gray'}
              >
                {client.status}
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
          <p className="text-2xl font-bold text-foreground">{siteCount}</p>
          <p className="text-xs text-muted-foreground">Total Sites</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">
            {activeJobCount}
          </p>
          <p className="text-xs text-muted-foreground">Active Jobs</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(monthlyRevenue)}
          </p>
          <p className="text-xs text-muted-foreground">Monthly Revenue</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">
            {contractActive}
          </p>
          <p className="text-xs text-muted-foreground">Contract Status</p>
        </div>
      </div>

      {/* Section Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Contact Info */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Contact Info
          </h3>
          <dl className="space-y-3 text-sm">
            {client.billing_contact_id && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Billing Contact</dt>
                <dd className="font-medium">{client.bill_to_name ?? '\u2014'}</dd>
              </div>
            )}
            {client.website && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground inline-flex items-center gap-1">
                  <Globe className="h-3 w-3" /> Website
                </dt>
                <dd className="font-medium">
                  <a
                    href={
                      client.website.startsWith('http')
                        ? client.website
                        : `https://${client.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {client.website}
                  </a>
                </dd>
              </div>
            )}
            {client.client_type && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Type</dt>
                <dd className="font-medium">{client.client_type}</dd>
              </div>
            )}
            {client.industry && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Industry</dt>
                <dd className="font-medium">{client.industry}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Address */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Billing Address
            </span>
          </h3>
          <dl className="space-y-3 text-sm">
            {addr?.street && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Street</dt>
                <dd className="font-medium">{addr.street}</dd>
              </div>
            )}
            {addr?.city && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">City</dt>
                <dd className="font-medium">{addr.city}</dd>
              </div>
            )}
            {addr?.state && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">State</dt>
                <dd className="font-medium">{addr.state}</dd>
              </div>
            )}
            {addr?.zip && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">ZIP</dt>
                <dd className="font-medium">{addr.zip}</dd>
              </div>
            )}
            {!addr?.street && !addr?.city && (
              <p className="text-muted-foreground">No address on file.</p>
            )}
          </dl>
        </div>

        {/* Billing Info */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Billing Info
          </h3>
          <dl className="space-y-3 text-sm">
            {client.payment_terms && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Payment Terms</dt>
                <dd className="font-medium">{client.payment_terms}</dd>
              </div>
            )}
            {client.invoice_frequency && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Invoice Frequency</dt>
                <dd className="font-medium">{client.invoice_frequency}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">PO Required</dt>
              <dd className="font-medium">
                {client.po_required ? 'Yes' : 'No'}
              </dd>
            </div>
            {client.credit_limit != null && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Credit Limit</dt>
                <dd className="font-medium">
                  {formatCurrency(client.credit_limit)}
                </dd>
              </div>
            )}
            {client.tax_id && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tax ID</dt>
                <dd className="font-medium">{client.tax_id}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Contract Details */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Contract Details
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Start Date</dt>
              <dd className="font-medium">
                {formatDate(client.contract_start_date)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">End Date</dt>
              <dd className="font-medium">
                {formatDate(client.contract_end_date)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Auto-Renewal</dt>
              <dd className="font-medium">
                {client.auto_renewal ? 'Yes' : 'No'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Insurance Required</dt>
              <dd className="font-medium">
                {client.insurance_required ? 'Yes' : 'No'}
              </dd>
            </div>
            {client.insurance_expiry && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Insurance Expiry</dt>
                <dd className="font-medium">
                  {formatDate(client.insurance_expiry)}
                </dd>
              </div>
            )}
            {client.client_since && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Client Since</dt>
                <dd className="font-medium">
                  {formatDate(client.client_since)}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Notes */}
      {client.notes && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Notes</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {client.notes}
          </p>
        </div>
      )}

      {/* Metadata */}
      <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
        <p>Created: {new Date(client.created_at).toLocaleDateString()}</p>
        <p>Updated: {new Date(client.updated_at).toLocaleDateString()}</p>
      </div>

      {/* Edit Form */}
      <ClientForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initialData={client}
        onSuccess={fetchClient}
      />
    </div>
  );
}
