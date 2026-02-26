'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, MessageSquareWarning, Route, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Textarea,
  Select,
} from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ResolutionEmailPreview } from '@/components/forms/resolution-email-preview';

interface ComplaintDetailProps {
  complaintCode: string;
}

interface ComplaintDetailRow {
  id: string;
  complaint_code: string;
  site_id: string;
  site?: { id: string; name: string; site_code: string } | null;
  client?: { id: string; name: string; client_code: string } | null;
  status: string;
  priority: string;
  category: string;
  source: string;
  customer_original_message: string | null;
  photos_before: string[];
  photos_after: string[];
  resolution_description: string | null;
  assigned_to_staff_id: string | null;
  assigned_staff?: { id: string; full_name: string | null; staff_code: string } | null;
  resolution_email_sent: boolean;
  resolution_email_sent_at: string | null;
  created_at: string;
  version_etag: string;
  timeline: Array<{
    id: string;
    action: string;
    actor_user_id: string;
    created_at: string;
  }>;
}

async function authHeaders() {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function statusColor(status: string): 'green' | 'yellow' | 'red' | 'orange' | 'blue' | 'gray' {
  switch (status) {
    case 'RESOLVED':
    case 'CLOSED':
      return 'green';
    case 'IN_PROGRESS':
      return 'blue';
    case 'ESCALATED':
      return 'red';
    case 'ASSIGNED':
      return 'yellow';
    default:
      return 'orange';
  }
}

function priorityColor(priority: string): 'green' | 'yellow' | 'red' | 'orange' | 'blue' | 'gray' {
  switch (priority) {
    case 'URGENT_SAME_NIGHT':
      return 'red';
    case 'HIGH':
      return 'orange';
    case 'NORMAL':
      return 'yellow';
    case 'LOW':
      return 'green';
    default:
      return 'gray';
  }
}

export function ComplaintDetail({ complaintCode }: ComplaintDetailProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [complaint, setComplaint] = useState<ComplaintDetailRow | null>(null);
  const [resolveText, setResolveText] = useState('');
  const [assignTo, setAssignTo] = useState('');
  const [staffOptions, setStaffOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/operations/complaints/${encodeURIComponent(complaintCode)}`, {
        headers: await authHeaders(),
        cache: 'no-store',
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.data) {
        throw new Error(body?.detail ?? body?.title ?? 'Failed to load complaint.');
      }

      const row = body.data as ComplaintDetailRow;
      setComplaint({
        ...row,
        photos_before: Array.isArray(row.photos_before) ? row.photos_before : [],
        photos_after: Array.isArray(row.photos_after) ? row.photos_after : [],
      });
      setResolveText(row.resolution_description ?? '');
      setAssignTo(row.assigned_to_staff_id ?? '');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load complaint.');
    } finally {
      setLoading(false);
    }
  }, [complaintCode]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase
      .from('staff')
      .select('id, full_name, staff_code')
      .is('archived_at', null)
      .eq('staff_status', 'ACTIVE')
      .order('full_name')
      .then(({ data }) => {
        const rows = (data ?? []) as Array<{ id: string; full_name: string | null; staff_code: string }>;
        setStaffOptions(rows.map((row) => ({
          value: row.id,
          label: `${row.full_name ?? row.staff_code} (${row.staff_code})`,
        })));
      });
  }, []);

  const responseHours = useMemo(() => {
    if (!complaint) return null;
    const created = new Date(complaint.created_at).getTime();
    const now = Date.now();
    const diffHours = (now - created) / (1000 * 60 * 60);
    return Math.max(0, diffHours);
  }, [complaint]);

  const patchComplaint = async (payload: Record<string, unknown>, successMessage: string) => {
    if (!complaint) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/operations/complaints/${encodeURIComponent(complaint.complaint_code)}`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify({
          ...payload,
          version_etag: complaint.version_etag,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.detail ?? body?.title ?? 'Failed to update complaint.');
      }
      toast.success(successMessage);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update complaint.');
    } finally {
      setSaving(false);
    }
  };

  const resolve = async () => {
    if (!complaint) return;
    if (!resolveText.trim()) {
      toast.error('Add a resolution description first.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/operations/complaints/${encodeURIComponent(complaint.complaint_code)}/resolve`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          resolution_description: resolveText.trim(),
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.detail ?? body?.title ?? 'Failed to resolve complaint.');
      }
      toast.success('Complaint marked as resolved.');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to resolve complaint.');
    } finally {
      setSaving(false);
    }
  };

  const injectRouteTask = async () => {
    if (!complaint) return;
    const description = window.prompt('Describe the route follow-up task:', 'Customer complaint. Deep clean required.');
    if (!description?.trim()) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/operations/complaints/${encodeURIComponent(complaint.complaint_code)}/inject-route`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          description: description.trim(),
          evidence_required: true,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.detail ?? body?.title ?? 'Failed to add task to route.');
      }
      toast.success('Task added to tonight\'s route.');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add task to route.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="space-y-4"><Card><CardContent className="pt-4">Loading complaint...</CardContent></Card></div>;
  }

  if (!complaint) {
    return (
      <div className="space-y-4">
        <Link href="/operations" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Operations
        </Link>
        <Card>
          <CardContent className="pt-4 text-sm text-muted-foreground">Complaint not found.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/operations" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to Operations
      </Link>

      <div className="rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-primary/10 text-primary">
              <MessageSquareWarning className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{complaint.complaint_code}</h1>
              <p className="text-sm text-muted-foreground">{complaint.site?.name ?? complaint.site?.site_code ?? 'Unknown site'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge color={statusColor(complaint.status)}>{complaint.status}</Badge>
            <Badge color={priorityColor(complaint.priority)}>{complaint.priority}</Badge>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Site</p><p className="text-sm font-semibold text-foreground">{complaint.site?.name ?? 'Unknown'}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Reported</p><p className="text-sm font-semibold text-foreground">{new Date(complaint.created_at).toLocaleString()}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Response Time</p><p className="text-sm font-semibold text-foreground">{responseHours != null ? `${responseHours.toFixed(1)} hrs` : 'N/A'}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Assigned To</p><p className="text-sm font-semibold text-foreground">{complaint.assigned_staff?.full_name ?? complaint.assigned_staff?.staff_code ?? 'Unassigned'}</p></CardContent></Card>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Customer Message</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {complaint.customer_original_message?.trim() || 'No customer message provided.'}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Before Photos</CardTitle></CardHeader>
          <CardContent>
            {complaint.photos_before.length === 0 ? (
              <p className="text-sm text-muted-foreground">No before photos uploaded.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {complaint.photos_before.map((url, index) => (
                  <a
                    key={`${url}-${index}`}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-border bg-background p-2 text-xs text-primary underline-offset-2 hover:underline"
                  >
                    Before Photo {index + 1}
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>After Photos</CardTitle></CardHeader>
          <CardContent>
            {complaint.photos_after.length === 0 ? (
              <p className="text-sm text-muted-foreground">No after photos uploaded.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {complaint.photos_after.map((url, index) => (
                  <a
                    key={`${url}-${index}`}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-border bg-background p-2 text-xs text-primary underline-offset-2 hover:underline"
                  >
                    After Photo {index + 1}
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Resolution</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={resolveText}
            onChange={(event) => setResolveText(event.target.value)}
            rows={4}
            placeholder="Document how this complaint was resolved..."
          />
          <p className="text-xs text-muted-foreground">
            Email sent: {complaint.resolution_email_sent ? `Yes (${new Date(complaint.resolution_email_sent_at ?? '').toLocaleString()})` : 'No'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
        <CardContent>
          {complaint.timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">No timeline events found.</p>
          ) : (
            <div className="space-y-2">
              {complaint.timeline.map((event) => (
                <div key={event.id} className="rounded-lg border border-border bg-background p-2">
                  <p className="text-sm font-medium text-foreground">{event.action}</p>
                  <p className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assign Complaint</label>
            <Select
              value={assignTo}
              onChange={(event) => setAssignTo(event.target.value)}
              options={[{ value: '', label: 'Unassigned' }, ...staffOptions]}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => void patchComplaint(
                {
                  assigned_to_staff_id: assignTo || null,
                  status: assignTo ? 'ASSIGNED' : complaint.status,
                },
                'Assignment updated.',
              )}
              disabled={saving}
            >
              <UserCheck className="h-4 w-4" />
              Assign
            </Button>
            <Button variant="secondary" onClick={() => void injectRouteTask()} disabled={saving}>
              <Route className="h-4 w-4" />
              Add to Route
            </Button>
            <Button onClick={() => void resolve()} disabled={saving}>
              Resolve
            </Button>
            <Button
              variant="secondary"
              onClick={() => setEmailPreviewOpen(true)}
              disabled={saving || !resolveText.trim()}
            >
              <Mail className="h-4 w-4" />
              Send Resolution Email
            </Button>
          </div>
        </CardContent>
      </Card>

      <ResolutionEmailPreview
        open={emailPreviewOpen}
        onClose={() => setEmailPreviewOpen(false)}
        complaintCode={complaint.complaint_code}
        siteName={complaint.site?.name ?? 'Site'}
        resolutionDescription={resolveText}
        onSent={() => void load()}
      />
    </div>
  );
}
