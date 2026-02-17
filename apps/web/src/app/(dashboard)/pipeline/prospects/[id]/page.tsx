'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Mail,
  PauseCircle,
  Pencil,
  Phone,
  Target,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Badge, Skeleton } from '@gleamops/ui';
import type { SalesProspect } from '@gleamops/shared';
import { ProspectForm } from '@/components/forms/prospect-form';
import { ActivityHistorySection } from '@/components/activity/activity-history-section';
import { ProfileCompletenessCard, isFieldComplete, type CompletenessItem } from '@/components/detail/profile-completeness-card';
import { StatusToggleDialog } from '@/components/detail/status-toggle-dialog';

interface ProspectWithMeta extends SalesProspect {
  industry_type?: string | null;
  website?: string | null;
}

interface ProspectContactRow {
  id: string;
  contact_name: string;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
}

interface ProspectOpportunityRow {
  id: string;
  opportunity_code: string;
  name: string;
  stage_code: string;
  estimated_monthly_value: number | null;
  expected_close_date: string | null;
}

interface ProspectMeta {
  facility_type: string | null;
  estimated_square_footage: number | null;
  primary_contact_role_title: string | null;
  best_time_to_call: string | null;
  preferred_contact_method: string | null;
  estimated_monthly_value: number | null;
  target_follow_up_date: string | null;
  priority_level: string | null;
}

const META_START = '[GOPS_PROSPECT_META]';
const META_END = '[/GOPS_PROSPECT_META]';

const EMPTY_META: ProspectMeta = {
  facility_type: null,
  estimated_square_footage: null,
  primary_contact_role_title: null,
  best_time_to_call: null,
  preferred_contact_method: null,
  estimated_monthly_value: null,
  target_follow_up_date: null,
  priority_level: null,
};

function formatCurrency(n: number | null) {
  if (n == null) return '\u2014';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string | null) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatInteger(n: number | null) {
  if (n == null) return '\u2014';
  return new Intl.NumberFormat('en-US').format(n);
}

function parseProspectNotes(rawNotes: string | null): { plainNotes: string | null; meta: ProspectMeta } {
  if (!rawNotes) return { plainNotes: null, meta: EMPTY_META };

  const start = rawNotes.indexOf(META_START);
  const end = rawNotes.indexOf(META_END);
  if (start === -1 || end === -1 || end <= start) {
    return { plainNotes: rawNotes, meta: EMPTY_META };
  }

  const jsonChunk = rawNotes.slice(start + META_START.length, end).trim();
  const before = rawNotes.slice(0, start).trim();
  const after = rawNotes.slice(end + META_END.length).trim();
  const plainNotes = [before, after].filter(Boolean).join('\n\n') || null;

  try {
    const parsed = JSON.parse(jsonChunk) as Partial<ProspectMeta>;
    return {
      plainNotes,
      meta: {
        facility_type: parsed.facility_type ?? null,
        estimated_square_footage: typeof parsed.estimated_square_footage === 'number' ? parsed.estimated_square_footage : null,
        primary_contact_role_title: parsed.primary_contact_role_title ?? null,
        best_time_to_call: parsed.best_time_to_call ?? null,
        preferred_contact_method: parsed.preferred_contact_method ?? null,
        estimated_monthly_value: typeof parsed.estimated_monthly_value === 'number' ? parsed.estimated_monthly_value : null,
        target_follow_up_date: parsed.target_follow_up_date ?? null,
        priority_level: parsed.priority_level ?? null,
      },
    };
  } catch {
    return { plainNotes: rawNotes, meta: EMPTY_META };
  }
}

function toLabel(value: string | null) {
  if (!value) return '\u2014';
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getStatusColor(status: string): 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'orange' | 'purple' {
  const normalized = status.toUpperCase();
  if (normalized === 'ACTIVE' || normalized === 'QUALIFIED' || normalized === 'CONVERTED') return 'green';
  if (normalized === 'NEW' || normalized === 'CONTACTED') return 'blue';
  if (normalized === 'UNQUALIFIED') return 'yellow';
  if (normalized === 'DEAD') return 'red';
  return 'gray';
}

function daysOpen(createdAt: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)));
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function ProspectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [prospect, setProspect] = useState<ProspectWithMeta | null>(null);
  const [contacts, setContacts] = useState<ProspectContactRow[]>([]);
  const [opportunities, setOpportunities] = useState<ProspectOpportunityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);

  const fetchProspect = async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const prospectCode = decodeURIComponent(id);
    const { data } = await supabase
      .from('sales_prospects')
      .select('*')
      .eq('prospect_code', prospectCode)
      .is('archived_at', null)
      .single();

    if (!data) {
      setProspect(null);
      setContacts([]);
      setOpportunities([]);
      setLoading(false);
      return;
    }

    const row = data as unknown as ProspectWithMeta;
    setProspect(row);

    const [contactsRes, opportunitiesRes] = await Promise.all([
      supabase
        .from('sales_prospect_contacts')
        .select('id, contact_name, email, phone, is_primary')
        .eq('prospect_id', row.id)
        .is('archived_at', null)
        .order('is_primary', { ascending: false })
        .order('contact_name', { ascending: true }),
      supabase
        .from('sales_opportunities')
        .select('id, opportunity_code, name, stage_code, estimated_monthly_value, expected_close_date')
        .eq('prospect_id', row.id)
        .is('archived_at', null)
        .order('created_at', { ascending: false }),
    ]);

    setContacts((contactsRes.data ?? []) as unknown as ProspectContactRow[]);
    setOpportunities((opportunitiesRes.data ?? []) as unknown as ProspectOpportunityRow[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchProspect();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleArchive = async () => {
    if (!prospect) return;
    setArchiveLoading(true);
    const supabase = getSupabaseBrowserClient();
    try {
      const { data: authData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('sales_prospects')
        .update({
          archived_at: new Date().toISOString(),
          archived_by: authData.user?.id ?? null,
          archive_reason: 'Deactivated from prospect detail',
        })
        .eq('id', prospect.id)
        .eq('version_etag', prospect.version_etag);

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('Prospect archived');
      router.push('/pipeline?tab=prospects');
    } finally {
      setArchiveLoading(false);
      setArchiveOpen(false);
    }
  };

  const parsed = useMemo(
    () => parseProspectNotes(prospect?.notes ?? null),
    [prospect?.notes]
  );

  const primaryContact = useMemo(
    () => contacts.find((c) => c.is_primary) ?? contacts[0] ?? null,
    [contacts]
  );

  const openOpportunityCount = useMemo(
    () => opportunities.filter((opp) => !['WON', 'LOST'].includes(opp.stage_code)).length,
    [opportunities]
  );

  const opportunityMonthlySum = useMemo(
    () => opportunities.reduce((sum, opp) => sum + (opp.estimated_monthly_value ?? 0), 0),
    [opportunities]
  );

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!prospect) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">Prospect not found.</p>
        <Link
          href="/pipeline?tab=prospects"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Pipeline
        </Link>
      </div>
    );
  }

  const completenessItems: CompletenessItem[] = [
    { key: 'company_name', label: 'Company Name', isComplete: isFieldComplete(prospect.company_name), section: 'company' },
    { key: 'status', label: 'Prospect Status', isComplete: isFieldComplete(prospect.prospect_status_code), section: 'company' },
    { key: 'source', label: 'Lead Source', isComplete: isFieldComplete(prospect.source), section: 'company' },
    { key: 'industry', label: 'Industry', isComplete: isFieldComplete(prospect.industry_type), section: 'company' },
    { key: 'website', label: 'Website', isComplete: isFieldComplete(prospect.website), section: 'company' },
    { key: 'contact_name', label: 'Primary Contact Name', isComplete: isFieldComplete(primaryContact?.contact_name), section: 'contact' },
    { key: 'contact_phone', label: 'Primary Contact Phone', isComplete: isFieldComplete(primaryContact?.phone), section: 'contact' },
    { key: 'contact_email', label: 'Primary Contact Email', isComplete: isFieldComplete(primaryContact?.email), section: 'contact' },
    { key: 'facility_type', label: 'Facility Type', isComplete: isFieldComplete(parsed.meta.facility_type), section: 'opportunity' },
    { key: 'estimated_square_footage', label: 'Estimated Sq Ft', isComplete: isFieldComplete(parsed.meta.estimated_square_footage), section: 'opportunity' },
    { key: 'estimated_monthly_value', label: 'Estimated Monthly Value', isComplete: isFieldComplete(parsed.meta.estimated_monthly_value), section: 'opportunity' },
    { key: 'target_follow_up_date', label: 'Target Follow-Up Date', isComplete: isFieldComplete(parsed.meta.target_follow_up_date), section: 'opportunity' },
  ];

  return (
    <div className="space-y-6">
      <Link
        href="/pipeline?tab=prospects"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Pipeline
      </Link>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            {getInitials(prospect.company_name) || <Building2 className="h-7 w-7" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{prospect.company_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground font-mono">{prospect.prospect_code}</span>
              <Badge color={getStatusColor(prospect.prospect_status_code)}>
                {toLabel(prospect.prospect_status_code)}
              </Badge>
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
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900/40"
          >
            <PauseCircle className="h-3.5 w-3.5" />
            Deactivate
          </button>
        </div>
      </div>

      <ProfileCompletenessCard
        title="Prospect Profile"
        items={completenessItems}
        onNavigateToMissing={() => setFormOpen(true)}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{opportunities.length}</p>
          <p className="text-xs text-muted-foreground">Total Opportunities</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{openOpportunityCount}</p>
          <p className="text-xs text-muted-foreground">Open Opportunities</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(opportunityMonthlySum > 0 ? opportunityMonthlySum : parsed.meta.estimated_monthly_value)}
          </p>
          <p className="text-xs text-muted-foreground">Estimated Monthly Value</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{daysOpen(prospect.created_at)}</p>
          <p className="text-xs text-muted-foreground">Days in Pipeline</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Company</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Industry</dt>
              <dd className="font-medium">{prospect.industry_type ?? '\u2014'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Source</dt>
              <dd className="font-medium">{toLabel(prospect.source)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Website</dt>
              <dd className="font-medium text-right">
                {prospect.website ? (
                  <a className="text-primary hover:underline" href={prospect.website} target="_blank" rel="noopener noreferrer">
                    {prospect.website}
                  </a>
                ) : '\u2014'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Facility Type</dt>
              <dd className="font-medium">{parsed.meta.facility_type ?? '\u2014'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Estimated Sq Ft</dt>
              <dd className="font-medium">{formatInteger(parsed.meta.estimated_square_footage)}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Primary Contact</h3>
          {primaryContact ? (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground inline-flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" /> Name</dt>
                <dd className="font-medium">{primaryContact.contact_name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Role</dt>
                <dd className="font-medium">{parsed.meta.primary_contact_role_title ?? '\u2014'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Phone</dt>
                <dd className="font-medium">{primaryContact.phone ?? '\u2014'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Email</dt>
                <dd className="font-medium">{primaryContact.email ?? '\u2014'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Preferred Method</dt>
                <dd className="font-medium">{toLabel(parsed.meta.preferred_contact_method)}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">No contacts linked yet.</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Opportunity Readiness</h3>
        <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Estimated Monthly Value</dt>
            <dd className="font-medium">{formatCurrency(parsed.meta.estimated_monthly_value)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Priority</dt>
            <dd className="font-medium">{toLabel(parsed.meta.priority_level)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Target Follow-Up</dt>
            <dd className="font-medium">{formatDate(parsed.meta.target_follow_up_date)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Best Time to Call</dt>
            <dd className="font-medium">{parsed.meta.best_time_to_call ?? '\u2014'}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Related Opportunities</h3>
        {opportunities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No opportunities linked to this prospect yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {opportunities.map((opp) => (
              <li key={opp.id} className="py-3">
                <Link
                  href={`/pipeline/opportunities/${encodeURIComponent(opp.opportunity_code)}`}
                  className="flex items-center justify-between gap-3 hover:bg-muted/40 rounded-md px-2 py-1.5 transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm text-foreground">{opp.name}</p>
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                      <Target className="h-3 w-3" />
                      {opp.opportunity_code}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge color={getStatusColor(opp.stage_code)}>{toLabel(opp.stage_code)}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">{formatCurrency(opp.estimated_monthly_value)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Notes</h3>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{parsed.plainNotes ?? 'No notes recorded.'}</p>
      </div>

      <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
        <p>Created: {formatDate(prospect.created_at)}</p>
        <p>Updated: {formatDate(prospect.updated_at)}</p>
      </div>

      <ActivityHistorySection
        entityType="sales_prospects"
        entityId={prospect.id}
        entityCode={prospect.prospect_code}
        notes={parsed.plainNotes}
        entityUpdatedAt={prospect.updated_at}
      />

      <ProspectForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initialData={prospect}
        onSuccess={async () => {
          setFormOpen(false);
          await fetchProspect();
        }}
      />

      <StatusToggleDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={() => { void handleArchive(); }}
        entityLabel="Prospect"
        entityName={prospect.company_name}
        mode="deactivate"
        warning={opportunities.length > 0 ? `This prospect has ${opportunities.length} linked opportunit${opportunities.length === 1 ? 'y' : 'ies'} that may be affected.` : null}
        loading={archiveLoading}
      />
    </div>
  );
}
