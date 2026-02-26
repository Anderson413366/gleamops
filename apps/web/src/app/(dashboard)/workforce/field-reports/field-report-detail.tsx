'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCheck, ClipboardCheck, Inbox, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Textarea } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface FieldReportDetailProps {
  reportCode: string;
}

interface FieldReportDetailRow {
  id: string;
  report_code: string;
  report_type: 'SUPPLY_REQUEST' | 'MAINTENANCE' | 'DAY_OFF' | 'INCIDENT' | 'GENERAL';
  status: 'OPEN' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  description: string;
  photos: string[];
  requested_items: Array<{ supply_id: string; qty: number }>;
  requested_date: string | null;
  resolution_notes: string | null;
  created_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  version_etag: string;
  site?: { id: string; site_code: string; name: string } | null;
  reporter?: { id: string; staff_code: string; full_name: string | null } | null;
  acknowledged_staff?: { id: string; staff_code: string; full_name: string | null } | null;
  resolved_staff?: { id: string; staff_code: string; full_name: string | null } | null;
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
      return 'green';
    case 'DISMISSED':
      return 'gray';
    case 'IN_PROGRESS':
      return 'blue';
    case 'ACKNOWLEDGED':
      return 'yellow';
    default:
      return 'orange';
  }
}

function priorityColor(priority: string): 'green' | 'yellow' | 'red' | 'orange' | 'blue' | 'gray' {
  switch (priority) {
    case 'URGENT':
      return 'red';
    case 'HIGH':
      return 'orange';
    case 'LOW':
      return 'green';
    default:
      return 'yellow';
  }
}

export function FieldReportDetail({ reportCode }: FieldReportDetailProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [report, setReport] = useState<FieldReportDetailRow | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/operations/field-reports/${encodeURIComponent(reportCode)}`, {
        headers: await authHeaders(),
        cache: 'no-store',
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.data) {
        throw new Error(body?.detail ?? body?.title ?? 'Failed to load field report.');
      }

      const row = body.data as FieldReportDetailRow;
      setReport({
        ...row,
        photos: Array.isArray(row.photos) ? row.photos : [],
        requested_items: Array.isArray(row.requested_items) ? row.requested_items : [],
      });
      setResolutionNotes(row.resolution_notes ?? '');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load field report.');
    } finally {
      setLoading(false);
    }
  }, [reportCode]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchReport = async (payload: Record<string, unknown>, successMessage: string) => {
    if (!report) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/operations/field-reports/${encodeURIComponent(report.report_code)}`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify({
          ...payload,
          version_etag: report.version_etag,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.detail ?? body?.title ?? 'Failed to update field report.');
      }
      toast.success(successMessage);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update field report.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card><CardContent className="pt-4">Loading field report...</CardContent></Card>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="space-y-4">
        <Link href="/workforce?tab=field-reports" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Workforce
        </Link>
        <Card><CardContent className="pt-4 text-sm text-muted-foreground">Field report not found.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/workforce?tab=field-reports" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to Workforce
      </Link>

      <div className="rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-primary/10 text-primary">
              <Inbox className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{report.report_code}</h1>
              <p className="text-sm text-muted-foreground">{report.site?.name ?? report.site?.site_code ?? 'No site assigned'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge color={statusColor(report.status)}>{report.status}</Badge>
            <Badge color={priorityColor(report.priority)}>{report.priority}</Badge>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Type</p><p className="text-sm font-semibold text-foreground">{report.report_type}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Submitted</p><p className="text-sm font-semibold text-foreground">{new Date(report.created_at).toLocaleString()}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Reported By</p><p className="text-sm font-semibold text-foreground">{report.reporter?.full_name ?? report.reporter?.staff_code ?? 'Unknown'}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Requested Date</p><p className="text-sm font-semibold text-foreground">{report.requested_date ? new Date(`${report.requested_date}T00:00:00.000Z`).toLocaleDateString() : 'N/A'}</p></CardContent></Card>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Description</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-foreground whitespace-pre-wrap">{report.description}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Requested Items</CardTitle></CardHeader>
          <CardContent>
            {report.requested_items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No requested items.</p>
            ) : (
              <div className="space-y-2">
                {report.requested_items.map((item, index) => (
                  <div key={`${item.supply_id}-${index}`} className="rounded-lg border border-border bg-background p-2 text-sm">
                    {item.supply_id} - Qty {item.qty}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Photos</CardTitle></CardHeader>
          <CardContent>
            {report.photos.length === 0 ? (
              <p className="text-sm text-muted-foreground">No photos attached.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {report.photos.map((url, index) => (
                  <a
                    key={`${url}-${index}`}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-border bg-background p-2 text-xs text-primary underline-offset-2 hover:underline"
                  >
                    Photo {index + 1}
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Resolution Notes</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={resolutionNotes}
            onChange={(event) => setResolutionNotes(event.target.value)}
            rows={4}
            placeholder="Add notes for acknowledgement or resolution..."
          />
          <p className="text-xs text-muted-foreground">
            Acknowledged: {report.acknowledged_at ? new Date(report.acknowledged_at).toLocaleString() : 'Not yet'}
          </p>
          <p className="text-xs text-muted-foreground">
            Resolved: {report.resolved_at ? new Date(report.resolved_at).toLocaleString() : 'Not yet'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => void patchReport(
              { status: 'ACKNOWLEDGED', resolution_notes: resolutionNotes || null },
              'Field report acknowledged.',
            )}
            disabled={saving || report.status !== 'OPEN'}
          >
            <CheckCheck className="h-4 w-4" />
            Acknowledge
          </Button>
          <Button
            variant="secondary"
            onClick={() => void patchReport(
              { status: 'IN_PROGRESS', resolution_notes: resolutionNotes || null },
              'Field report moved to in progress.',
            )}
            disabled={saving || (report.status !== 'OPEN' && report.status !== 'ACKNOWLEDGED')}
          >
            <Wrench className="h-4 w-4" />
            In Progress
          </Button>
          <Button
            onClick={() => void patchReport(
              { status: 'RESOLVED', resolution_notes: resolutionNotes || null },
              'Field report resolved.',
            )}
            disabled={saving || report.status === 'RESOLVED' || report.status === 'DISMISSED'}
          >
            <ClipboardCheck className="h-4 w-4" />
            Resolve
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
