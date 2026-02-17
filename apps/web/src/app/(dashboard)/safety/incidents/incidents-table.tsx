'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Siren, PlusCircle } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardHeader } from '@gleamops/ui';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';

type SiteOption = {
  id: string;
  site_code: string;
  name: string;
};

type IncidentRow = {
  id: string;
  issue_type: string;
  priority: string;
  status: string;
  title: string;
  description: string;
  reported_at: string;
  due_at: string | null;
  resolved_at: string | null;
  site: { site_code: string; name: string } | null;
  assigned: { staff_code: string; full_name: string } | null;
};

interface Props {
  search: string;
}

type IncidentQueryRow = Omit<IncidentRow, 'site' | 'assigned'> & {
  site: Array<{ site_code: string; name: string }> | { site_code: string; name: string } | null;
  assigned: Array<{ staff_code: string; full_name: string }> | { staff_code: string; full_name: string } | null;
};

const ISSUE_TYPES = [
  'SAFETY_ISSUE',
  'MAINTENANCE_REPAIR',
  'ACCESS_PROBLEM',
  'OTHER',
] as const;

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

function colorForPriority(priority: string): 'gray' | 'blue' | 'yellow' | 'orange' | 'red' {
  switch (priority) {
    case 'CRITICAL':
      return 'red';
    case 'HIGH':
      return 'orange';
    case 'MEDIUM':
      return 'yellow';
    case 'LOW':
      return 'gray';
    default:
      return 'blue';
  }
}

function colorForStatus(status: string): 'gray' | 'blue' | 'yellow' | 'orange' | 'red' | 'green' {
  switch (status) {
    case 'OPEN':
      return 'red';
    case 'IN_PROGRESS':
      return 'yellow';
    case 'AWAITING_CLIENT':
      return 'blue';
    case 'RESOLVED':
      return 'green';
    case 'CLOSED':
      return 'gray';
    default:
      return 'blue';
  }
}

export default function IncidentsTable({ search }: Props) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { tenantId, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [rows, setRows] = useState<IncidentRow[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [siteId, setSiteId] = useState('');
  const [issueType, setIssueType] = useState<(typeof ISSUE_TYPES)[number]>('SAFETY_ISSUE');
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>('HIGH');
  const [dueDate, setDueDate] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [siteRes, incidentRes] = await Promise.all([
      supabase
        .from('sites')
        .select('id, site_code, name')
        .is('archived_at', null)
        .order('name', { ascending: true }),
      supabase
        .from('issues')
        .select(`
          id,
          issue_type,
          priority,
          status,
          title,
          description,
          reported_at,
          due_at,
          resolved_at,
          site:site_id(site_code, name),
          assigned:assigned_to_staff_id(staff_code, full_name)
        `)
        .in('issue_type', ['SAFETY_ISSUE', 'MAINTENANCE_REPAIR', 'ACCESS_PROBLEM', 'OTHER'])
        .is('archived_at', null)
        .order('reported_at', { ascending: false })
        .limit(200),
    ]);

    if (siteRes.error) toast.error(siteRes.error.message);
    if (incidentRes.error) toast.error(incidentRes.error.message);

    setSites((siteRes.data ?? []) as SiteOption[]);
    const normalized = ((incidentRes.data ?? []) as IncidentQueryRow[]).map((row) => ({
      ...row,
      site: Array.isArray(row.site) ? (row.site[0] ?? null) : row.site,
      assigned: Array.isArray(row.assigned) ? (row.assigned[0] ?? null) : row.assigned,
    }));
    setRows(normalized);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      row.title.toLowerCase().includes(q)
      || row.issue_type.toLowerCase().includes(q)
      || row.status.toLowerCase().includes(q)
      || row.priority.toLowerCase().includes(q)
      || (row.site?.name ?? '').toLowerCase().includes(q)
      || (row.site?.site_code ?? '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const createIncident = useCallback(async () => {
    if (!tenantId || !user?.id) {
      toast.error('Auth context missing. Refresh and try again.');
      return;
    }
    if (!siteId || !title.trim() || !description.trim()) {
      toast.error('Site, title, and description are required.');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('issues')
      .insert({
        tenant_id: tenantId,
        site_id: siteId,
        issue_type: issueType,
        priority,
        status: 'OPEN',
        title: title.trim(),
        description: description.trim(),
        client_visible: false,
        reported_by_user_id: user.id,
        due_at: dueDate ? new Date(`${dueDate}T17:00:00`).toISOString() : null,
      });

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setTitle('');
    setDescription('');
    setSiteId('');
    setIssueType('SAFETY_ISSUE');
    setPriority('HIGH');
    setDueDate('');
    toast.success('Incident reported.');
    await load();
  }, [description, dueDate, issueType, load, priority, siteId, supabase, tenantId, title, user?.id]);

  return (
    <div className="space-y-4">
      <Card className="border-red-200 bg-red-50/40 dark:border-red-900/40 dark:bg-red-950/20">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Siren className="h-4 w-4 text-red-600" />
            <h3 className="text-sm font-semibold text-foreground">Report Safety Incident</h3>
          </div>
          <p className="text-xs text-muted-foreground">Capture near-miss, hazard, and safety defects with immediate traceability.</p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
          >
            <option value="">Select site...</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>{site.name} ({site.site_code})</option>
            ))}
          </select>
          <select
            value={issueType}
            onChange={(e) => setIssueType(e.target.value as (typeof ISSUE_TYPES)[number])}
            className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
          >
            {ISSUE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Incident title"
            className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm md:col-span-2"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what happened, immediate risk, and containment action"
            rows={3}
            className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm md:col-span-2"
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as (typeof PRIORITIES)[number])}
            className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
          >
            {PRIORITIES.map((level) => <option key={level} value={level}>{level}</option>)}
          </select>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
          />
          <div className="md:col-span-2">
            <Button
              onClick={createIncident}
              disabled={saving}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              <PlusCircle className="h-4 w-4" />
              {saving ? 'Submitting...' : 'Report Incident'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <h3 className="text-sm font-semibold text-foreground">Incident Queue</h3>
            </div>
            <Badge color="gray">{filteredRows.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading incidents...</p>
          ) : filteredRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No incidents found.</p>
          ) : (
            <div className="space-y-2">
              {filteredRows.map((row) => (
                <div key={row.id} className="rounded-lg border border-border px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{row.title}</p>
                    <div className="flex items-center gap-2">
                      <Badge color={colorForPriority(row.priority)}>{row.priority}</Badge>
                      <Badge color={colorForStatus(row.status)}>{row.status}</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {row.issue_type} · {row.site?.name ?? 'Unknown Site'} ({row.site?.site_code ?? '—'})
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{row.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Reported: {new Date(row.reported_at).toLocaleString()} · Due: {row.due_at ? new Date(row.due_at).toLocaleDateString() : 'Not set'}
                    {row.assigned ? ` · Assigned: ${row.assigned.full_name ?? row.assigned.staff_code}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
