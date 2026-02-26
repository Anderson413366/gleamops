'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, Download, Image as ImageIcon, ListChecks } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@gleamops/ui';

interface InspectionIssue {
  id: string;
  severity: 'MINOR' | 'MAJOR' | 'CRITICAL';
  description: string;
  resolved_at: string | null;
}

interface InspectionItem {
  id: string;
  section: string | null;
  label: string;
  score: number | null;
  score_value: number | null;
  notes: string | null;
  photos: string[];
}

interface InspectionDetail {
  id: string;
  inspection_code: string;
  site_name: string;
  site_code: string | null;
  inspector_name: string | null;
  score_pct: number | null;
  passed: boolean | null;
  completed_at: string | null;
  started_at: string | null;
  notes: string | null;
  summary_notes: string | null;
  photos: string[];
  items: InspectionItem[];
  issues: InspectionIssue[];
}

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function PortalInspectionDetailPage() {
  const { token, id } = useParams<{ token: string; id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inspection, setInspection] = useState<InspectionDetail | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    let cancelled = false;

    async function loadInspection() {
      setLoading(true);
      try {
        const response = await fetch(`/api/public/portal/${encodeURIComponent(token)}/inspections/${id}`, { cache: 'no-store' });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(body.error ?? 'Unable to load inspection details.');
        }
        if (!cancelled) {
          setInspection(body.data as InspectionDetail);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Unable to load inspection details.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadInspection();
    return () => {
      cancelled = true;
    };
  }, [token, id]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-44 w-full" />
      </div>
    );
  }

  if (error || !inspection) {
    return (
      <Card className="rounded-xl border border-border bg-card shadow-sm">
        <CardContent className="py-8 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
          <p className="mt-2 text-sm text-muted-foreground">{error ?? 'Inspection not found.'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-xl border border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span>{inspection.inspection_code}</span>
            <div className="flex items-center gap-2">
              <Badge color={inspection.passed ? 'green' : 'red'}>
                {inspection.passed ? 'PASS' : 'FAIL'}
              </Badge>
              <Badge color={inspection.score_pct != null && inspection.score_pct >= 80 ? 'green' : inspection.score_pct != null ? 'yellow' : 'gray'}>
                {inspection.score_pct != null ? `${Math.round(inspection.score_pct)}%` : 'No score'}
              </Badge>
            </div>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {inspection.site_name} {inspection.site_code ? `(${inspection.site_code})` : ''} · Inspector: {inspection.inspector_name ?? 'Unassigned'}
          </p>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">Started: {formatDateTime(inspection.started_at)}</p>
          <p className="text-muted-foreground">Completed: {formatDateTime(inspection.completed_at)}</p>
          {inspection.summary_notes ? (
            <p className="rounded-lg border border-border bg-background p-3 text-foreground">{inspection.summary_notes}</p>
          ) : null}
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => window.print()}>
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Item Scores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {inspection.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No item scores recorded.</p>
          ) : (
            inspection.items.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <Badge color={item.score != null && item.score > 0 ? 'blue' : 'gray'}>
                    {item.score != null ? `Score ${item.score}` : 'Not scored'}
                  </Badge>
                </div>
                {item.section ? <p className="text-xs text-muted-foreground">{item.section}</p> : null}
                {item.notes ? <p className="mt-2 text-sm text-muted-foreground">{item.notes}</p> : null}
                {item.photos.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.photos.map((photoUrl) => (
                      <a key={photoUrl} href={photoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline">
                        <ImageIcon className="h-3 w-3" />
                        Photo
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Deficiencies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {inspection.issues.length === 0 ? (
            <p className="text-sm text-muted-foreground">No deficiencies recorded.</p>
          ) : (
            inspection.issues.map((issue) => (
              <div key={issue.id} className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{issue.description}</p>
                  <Badge color={issue.severity === 'CRITICAL' ? 'red' : issue.severity === 'MAJOR' ? 'orange' : 'yellow'}>
                    {issue.severity}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {issue.resolved_at ? `Resolved at ${formatDateTime(issue.resolved_at)}` : 'Pending follow-up'}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
