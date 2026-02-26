'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, ClipboardCheck } from 'lucide-react';
import { Badge, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@gleamops/ui';

interface InspectionRow {
  id: string;
  inspection_code: string;
  site_name: string;
  completed_at: string | null;
  score_pct: number | null;
  passed: boolean | null;
  status: string;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PortalInspectionsPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<InspectionRow[]>([]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function loadInspections() {
      setLoading(true);
      try {
        const response = await fetch(`/api/public/portal/${encodeURIComponent(token)}/inspections`, { cache: 'no-store' });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(body.error ?? 'Unable to load inspections.');
        }
        if (!cancelled) {
          setRows((body.data ?? []) as InspectionRow[]);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Unable to load inspections.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadInspections();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="rounded-xl border border-border bg-card shadow-sm">
        <CardContent className="py-8 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border border-border bg-card shadow-sm">
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4" />
          Inspection Reports
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No completed inspections found.</p>
        ) : (
          rows.map((row) => (
            <Link
              key={row.id}
              href={`/public/portal/${encodeURIComponent(token)}/inspections/${row.id}`}
              className="flex items-center justify-between rounded-lg border border-border bg-background p-3 transition-all duration-200 ease-in-out hover:bg-muted"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{row.inspection_code}</p>
                <p className="text-xs text-muted-foreground">{row.site_name} · {formatDate(row.completed_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge color={row.score_pct != null && row.score_pct >= 80 ? 'green' : row.score_pct != null ? 'yellow' : 'gray'}>
                  {row.score_pct != null ? `${Math.round(row.score_pct)}%` : 'No score'}
                </Badge>
                <Badge color={row.passed ? 'green' : 'red'}>
                  {row.passed ? 'PASS' : 'FAIL'}
                </Badge>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
