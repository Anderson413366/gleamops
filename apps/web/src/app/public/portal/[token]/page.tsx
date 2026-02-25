'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  AlertTriangle,
  CalendarDays,
  ClipboardCheck,
  Droplets,
  FileCheck2,
  FlaskConical,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@gleamops/ui';

interface PortalSite {
  id: string;
  name: string;
  site_code: string | null;
}

interface PortalSections {
  schedule: Array<{
    id: string;
    ticketCode: string;
    date: string;
    startTime: string | null;
    endTime: string | null;
    status: string;
    siteName: string;
    siteCode: string | null;
  }>;
  inspections: Array<{
    id: string;
    code: string;
    inspectedAt: string | null;
    status: string;
    scorePct: number | null;
    summary: string | null;
    siteName: string;
    siteCode: string | null;
  }>;
  counts: Array<{
    id: string;
    countCode: string;
    countDate: string;
    status: string;
    countedByName: string | null;
    submittedAt: string | null;
    siteName: string;
    siteCode: string | null;
  }>;
  orders: Array<{
    id: string;
    orderCode: string;
    orderDate: string | null;
    status: string;
    totalAmount: number | null;
    siteName: string;
    siteCode: string | null;
  }>;
  agreements: Array<{
    id: string;
    contractNumber: string;
    contractName: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
  }>;
  chemicals: Array<{
    id: string;
    code: string;
    name: string;
    category: string | null;
    imageUrl: string | null;
    sdsUrl: string | null;
  }>;
}

interface PortalData {
  portal: {
    token: string;
    clientName: string;
    clientCode: string | null;
    recipientName: string | null;
    recipientEmail: string;
    proposalCode: string | null;
    proposalStatus: string | null;
    sendStatus: string;
    sentAt: string | null;
  };
  sites: PortalSite[];
  sections: PortalSections;
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(value: string | null) {
  if (!value) return '—';
  const [hourText, minuteText] = value.split(':');
  const hour = Number(hourText);
  if (!Number.isFinite(hour)) return value;
  const hour12 = hour % 12 || 12;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${hour12}:${minuteText ?? '00'} ${suffix}`;
}

function formatMoney(value: number | null) {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

export default function PublicPortalPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PortalData | null>(null);
  const [requestType, setRequestType] = useState('SCHEDULE_CHANGE');
  const [priority, setPriority] = useState('MEDIUM');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [requestedDate, setRequestedDate] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function loadPortal() {
      setLoading(true);
      try {
        const response = await fetch(`/api/public/portal/${token}`);
        if (!response.ok) {
          const result = await response.json().catch(() => ({ error: 'Portal link is invalid or expired.' }));
          throw new Error(result.error ?? 'Portal link is invalid or expired.');
        }
        const result = await response.json();
        if (cancelled) return;

        setData(result as PortalData);
        setContactName((result as PortalData).portal.recipientName ?? '');
        setContactEmail((result as PortalData).portal.recipientEmail ?? '');
        setError(null);
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : 'Unable to load portal.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadPortal();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const schedulePreview = useMemo(() => data?.sections.schedule.slice(0, 6) ?? [], [data]);
  const inspectionPreview = useMemo(() => data?.sections.inspections.slice(0, 5) ?? [], [data]);
  const countPreview = useMemo(() => data?.sections.counts.slice(0, 5) ?? [], [data]);
  const orderPreview = useMemo(() => data?.sections.orders.slice(0, 5) ?? [], [data]);
  const agreementsPreview = useMemo(() => data?.sections.agreements.slice(0, 5) ?? [], [data]);
  const chemicalPreview = useMemo(() => data?.sections.chemicals.slice(0, 9) ?? [], [data]);

  async function handleSubmitRequest() {
    if (!token) return;
    if (!title.trim() || !details.trim()) {
      toast.error('Title and details are required.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/public/portal/${token}/change-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType,
          priority,
          title,
          details,
          requestedDate,
          contactName,
          contactEmail,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({ error: 'Unable to submit change request' }));
        throw new Error(result.error ?? 'Unable to submit change request');
      }

      toast.success('Change request submitted. Your manager has been notified.');
      setTitle('');
      setDetails('');
      setRequestedDate('');
      setRequestType('SCHEDULE_CHANGE');
      setPriority('MEDIUM');
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : 'Unable to submit change request');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-warning" />
        <h1 className="mt-4 text-2xl font-semibold text-foreground">Client Portal Not Available</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error ?? 'This link may be invalid or expired.'}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{data.portal.clientName} Portal</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide">Client Code</p>
            <p className="font-medium text-foreground">{data.portal.clientCode ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide">Proposal</p>
            <p className="font-medium text-foreground">
              {data.portal.proposalCode ?? '—'}
              {data.portal.proposalStatus ? ` (${data.portal.proposalStatus})` : ''}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide">Recipient</p>
            <p className="font-medium text-foreground">{data.portal.recipientName || data.portal.recipientEmail}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide">Sent</p>
            <p className="font-medium text-foreground">{formatDate(data.portal.sentAt)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4" />
              Upcoming Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {schedulePreview.length ? schedulePreview.map((row) => (
              <div key={row.id} className="rounded-lg border border-border px-3 py-2">
                <p className="font-medium text-foreground">{row.ticketCode} · {row.siteName}</p>
                <p className="text-muted-foreground">
                  {formatDate(row.date)} · {formatTime(row.startTime)} - {formatTime(row.endTime)} · {row.status}
                </p>
              </div>
            )) : <p className="text-muted-foreground">No upcoming schedule records.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-base">
              <ClipboardCheck className="h-4 w-4" />
              Recent Inspections
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {inspectionPreview.length ? inspectionPreview.map((row) => (
              <div key={row.id} className="rounded-lg border border-border px-3 py-2">
                <p className="font-medium text-foreground">{row.code || 'Inspection'} · {row.siteName}</p>
                <p className="text-muted-foreground">
                  {formatDate(row.inspectedAt)} · Score {row.scorePct != null ? `${Math.round(row.scorePct)}%` : '—'} · {row.status}
                </p>
              </div>
            )) : <p className="text-muted-foreground">No inspection records available.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-base">
              <Droplets className="h-4 w-4" />
              Supply Inventory Counts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {countPreview.length ? countPreview.map((row) => (
              <div key={row.id} className="rounded-lg border border-border px-3 py-2">
                <p className="font-medium text-foreground">{row.countCode} · {row.siteName}</p>
                <p className="text-muted-foreground">
                  {formatDate(row.countDate)} · {row.status} · {row.countedByName ?? 'Unassigned'}
                </p>
              </div>
            )) : <p className="text-muted-foreground">No inventory counts available.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-base">
              <Package className="h-4 w-4" />
              Supply Orders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {orderPreview.length ? orderPreview.map((row) => (
              <div key={row.id} className="rounded-lg border border-border px-3 py-2">
                <p className="font-medium text-foreground">{row.orderCode} · {row.siteName}</p>
                <p className="text-muted-foreground">
                  {formatDate(row.orderDate)} · {row.status} · {formatMoney(row.totalAmount)}
                </p>
              </div>
            )) : <p className="text-muted-foreground">No supply orders available.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-base">
              <FileCheck2 className="h-4 w-4" />
              Agreements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {agreementsPreview.length ? agreementsPreview.map((row) => (
              <div key={row.id} className="rounded-lg border border-border px-3 py-2">
                <p className="font-medium text-foreground">{row.contractName}</p>
                <p className="text-muted-foreground">
                  {row.contractNumber} · {row.status} · {formatDate(row.startDate)} - {formatDate(row.endDate)}
                </p>
              </div>
            )) : <p className="text-muted-foreground">No agreements listed yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-base">
              <FlaskConical className="h-4 w-4" />
              Chemicals + SDS
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chemicalPreview.length ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {chemicalPreview.map((row) => (
                  <div key={row.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                    <p className="font-medium text-foreground">{row.name}</p>
                    <p className="text-xs text-muted-foreground">{row.code} · {row.category ?? 'Chemical'}</p>
                    {row.sdsUrl ? (
                      <a href={row.sdsUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-module-accent underline">
                        View SDS
                      </a>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">SDS not attached</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No chemical catalog entries available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submit Change Request</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="grid gap-1">
              <span className="text-xs text-muted-foreground">Request Type</span>
              <select
                value={requestType}
                onChange={(event) => setRequestType(event.target.value)}
                className="h-10 rounded-lg border border-border bg-background px-3"
              >
                <option value="SCHEDULE_CHANGE">Schedule Change</option>
                <option value="SCOPE_UPDATE">Scope Update</option>
                <option value="SUPPLY_REQUEST">Supply Request</option>
                <option value="INSPECTION_REQUEST">Inspection Request</option>
                <option value="GENERAL_CHANGE">General Change</option>
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-xs text-muted-foreground">Priority</span>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                className="h-10 rounded-lg border border-border bg-background px-3"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-xs text-muted-foreground">Requested Date (optional)</span>
              <input
                type="date"
                value={requestedDate}
                onChange={(event) => setRequestedDate(event.target.value)}
                className="h-10 rounded-lg border border-border bg-background px-3"
              />
            </label>
          </div>

          <label className="grid gap-1">
            <span className="text-xs text-muted-foreground">Title</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-3"
              placeholder="Short summary"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-muted-foreground">Details</span>
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              className="min-h-[120px] rounded-lg border border-border bg-background px-3 py-2"
              placeholder="Describe the requested change and expected outcome."
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs text-muted-foreground">Contact Name</span>
              <input
                type="text"
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                className="h-10 rounded-lg border border-border bg-background px-3"
                placeholder="Name"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-muted-foreground">Contact Email</span>
              <input
                type="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                className="h-10 rounded-lg border border-border bg-background px-3"
                placeholder="name@company.com"
              />
            </label>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSubmitRequest} loading={submitting}>
              Submit Change Request
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
