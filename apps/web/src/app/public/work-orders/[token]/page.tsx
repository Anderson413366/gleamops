'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle, ClipboardCheck, FileCheck2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@gleamops/ui';

interface PublicWorkOrderData {
  ticket: {
    id: string;
    ticketCode: string;
    scheduledDate: string;
    startTime: string | null;
    endTime: string | null;
    status: string;
    siteName: string;
    siteCode: string | null;
    jobCode: string | null;
    jobName: string | null;
  };
  checklist: {
    id: string;
    status: string;
  } | null;
}

function formatTime(value: string | null): string {
  if (!value) return 'TBD';
  const [hourText, minuteText] = value.split(':');
  const hour = Number(hourText);
  if (!Number.isFinite(hour)) return value;
  const minute = minuteText ?? '00';
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${suffix}`;
}

export default function PublicWorkOrderPage() {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PublicWorkOrderData | null>(null);

  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [beforePhotoUrl, setBeforePhotoUrl] = useState('');
  const [afterPhotoUrl, setAfterPhotoUrl] = useState('');
  const [supervisorSignOff, setSupervisorSignOff] = useState(false);
  const [clientSignOff, setClientSignOff] = useState(false);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const response = await fetch(`/api/public/work-orders/${token}`);
        if (!response.ok) {
          const result = await response.json().catch(() => ({ error: 'Work order not found' }));
          throw new Error(result.error ?? 'Work order not found');
        }

        const result = await response.json();
        if (!cancelled) {
          setData(result as PublicWorkOrderData);
          setError(null);
          setLoading(false);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load work order');
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit() {
    if (!token) return;
    if (!signerName.trim() || !signerEmail.trim()) {
      toast.error('Signer name and email are required.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/public/work-orders/${token}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signerName,
          signerEmail,
          notes,
          beforePhotoUrl,
          afterPhotoUrl,
          supervisorSignOff,
          clientSignOff,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({ error: 'Unable to submit completion' }));
        throw new Error(result.error ?? 'Unable to submit completion');
      }

      setSubmitted(true);
      toast.success('Work order completion submitted.');
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : 'Unable to submit completion');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-10">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!data || error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <FileCheck2 className="mx-auto h-14 w-14 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-semibold text-foreground">Work Order Not Available</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error ?? 'This completion link may be invalid or expired.'}</p>
      </div>
    );
  }

  const { ticket } = data;

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2 text-lg">
            <ClipboardCheck className="h-5 w-5 text-module-accent" />
            Work Order Completion
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="font-medium text-foreground">{ticket.ticketCode}</p>
          <p className="text-muted-foreground">
            {ticket.jobName || ticket.jobCode || 'Project Work Order'}
          </p>
          <p className="inline-flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {ticket.siteCode ? `${ticket.siteCode} - ` : ''}{ticket.siteName}
          </p>
          <p className="text-muted-foreground">
            {ticket.scheduledDate} · {formatTime(ticket.startTime)} - {formatTime(ticket.endTime)}
          </p>
        </CardContent>
      </Card>

      {submitted ? (
        <Card>
          <CardContent className="py-10 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
            <h2 className="mt-3 text-lg font-semibold text-foreground">Completion Submitted</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This work order has been marked complete and routed for review.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sign Off</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Signer Name</label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(event) => setSignerName(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Signer Email</label>
                <input
                  type="email"
                  value={signerEmail}
                  onChange={(event) => setSignerEmail(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Completion Notes</label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
                rows={3}
                placeholder="Describe work completed, exceptions, and follow-up items."
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Before Photo URL (optional)</label>
                <input
                  type="url"
                  value={beforePhotoUrl}
                  onChange={(event) => setBeforePhotoUrl(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">After Photo URL (optional)</label>
                <input
                  type="url"
                  value={afterPhotoUrl}
                  onChange={(event) => setAfterPhotoUrl(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
                  placeholder="https://..."
                />
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={supervisorSignOff}
                onChange={(event) => setSupervisorSignOff(event.target.checked)}
                className="h-4 w-4 rounded border border-border"
              />
              Supervisor sign-off completed
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={clientSignOff}
                onChange={(event) => setClientSignOff(event.target.checked)}
                className="h-4 w-4 rounded border border-border"
              />
              Client sign-off completed
            </label>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSubmit} loading={submitting}>
                Submit Completion
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
