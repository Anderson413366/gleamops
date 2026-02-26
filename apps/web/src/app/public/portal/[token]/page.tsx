'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, ClipboardCheck, MessageSquareWarning, Wrench } from 'lucide-react';
import { Badge, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@gleamops/ui';

interface DashboardInspection {
  id: string;
  inspection_code: string;
  site_name: string;
  completed_at: string | null;
  score_pct: number | null;
  passed: boolean | null;
}

interface DashboardPayload {
  token: string;
  expires_at: string;
  client: { id: string; name: string; client_code: string | null };
  stats: {
    openComplaints: number;
    recentInspections: number;
    openWorkTickets: number;
  };
  recentInspections: DashboardInspection[];
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function scoreBadge(score: number | null): { label: string; color: 'green' | 'red' | 'yellow' | 'blue' | 'orange' | 'purple' | 'gray' } {
  if (score == null) return { label: 'No score', color: 'gray' };
  if (score >= 85) return { label: `${Math.round(score)}%`, color: 'green' };
  if (score >= 70) return { label: `${Math.round(score)}%`, color: 'yellow' };
  return { label: `${Math.round(score)}%`, color: 'red' };
}

export default function CustomerPortalDashboardPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<DashboardPayload | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      try {
        const response = await fetch(`/api/public/portal/${encodeURIComponent(token)}/dashboard`, {
          cache: 'no-store',
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(body.error ?? 'Unable to load dashboard');
        }
        if (!cancelled) {
          setPayload(body.data as DashboardPayload);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const recent = useMemo(() => payload?.recentInspections ?? [], [payload?.recentInspections]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!payload || error) {
    return (
      <Card className="rounded-xl border border-border bg-card shadow-sm">
        <CardContent className="py-10 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-3 text-xl font-semibold text-foreground">Portal not available</h1>
          <p className="mt-1 text-sm text-muted-foreground">{error ?? 'This portal link may be invalid or expired.'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-xl border border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl text-foreground">Welcome, {payload.client.name}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Access code expires on {formatDate(payload.expires_at)}.
          </p>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="rounded-xl border border-border bg-card shadow-sm">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Recent Inspections</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{payload.stats.recentInspections}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-border bg-card shadow-sm">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Open Complaints</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{payload.stats.openComplaints}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-border bg-card shadow-sm">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Open Work Tickets</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{payload.stats.openWorkTickets}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Recent Inspections
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed inspections found.</p>
          ) : (
            recent.map((inspection) => {
              const badge = scoreBadge(inspection.score_pct);
              return (
                <Link
                  key={inspection.id}
                  href={`/public/portal/${encodeURIComponent(token)}/inspections/${inspection.id}`}
                  className="flex items-center justify-between rounded-lg border border-border bg-background p-3 transition-all duration-200 ease-in-out hover:bg-muted"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{inspection.inspection_code}</p>
                    <p className="text-xs text-muted-foreground">
                      {inspection.site_name} · {formatDate(inspection.completed_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge color={badge.color}>{badge.label}</Badge>
                    <Badge color={inspection.passed ? 'green' : 'red'}>
                      {inspection.passed ? 'PASS' : 'FAIL'}
                    </Badge>
                  </div>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href={`/public/portal/${encodeURIComponent(token)}/complaints/new`} className="block">
          <Card className="rounded-xl border border-border bg-card shadow-sm transition-all duration-200 ease-in-out hover:bg-muted">
            <CardContent className="flex items-center gap-3 pt-4">
              <MessageSquareWarning className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Submit Complaint</p>
                <p className="text-xs text-muted-foreground">Report service issues with photos.</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/public/portal/${encodeURIComponent(token)}/feedback/new`} className="block">
          <Card className="rounded-xl border border-border bg-card shadow-sm transition-all duration-200 ease-in-out hover:bg-muted">
            <CardContent className="flex items-center gap-3 pt-4">
              <Wrench className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Submit Feedback</p>
                <p className="text-xs text-muted-foreground">Send kudos, suggestions, or questions.</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
