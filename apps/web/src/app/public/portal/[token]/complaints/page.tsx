'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, PlusCircle } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@gleamops/ui';

interface ComplaintRow {
  id: string;
  complaint_code: string;
  site_name: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function priorityColor(priority: string): 'green' | 'red' | 'yellow' | 'blue' | 'orange' | 'purple' | 'gray' {
  const normalized = priority.toUpperCase();
  if (normalized === 'URGENT_SAME_NIGHT') return 'red';
  if (normalized === 'HIGH') return 'orange';
  if (normalized === 'LOW') return 'green';
  return 'yellow';
}

function statusColor(status: string): 'green' | 'red' | 'yellow' | 'blue' | 'orange' | 'purple' | 'gray' {
  const normalized = status.toUpperCase();
  if (normalized === 'RESOLVED' || normalized === 'CLOSED') return 'green';
  if (normalized === 'IN_PROGRESS') return 'blue';
  if (normalized === 'ESCALATED') return 'orange';
  return 'yellow';
}

export default function PortalComplaintsPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ComplaintRow[]>([]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function loadComplaints() {
      setLoading(true);
      try {
        const response = await fetch(`/api/public/portal/${encodeURIComponent(token)}/complaints`, { cache: 'no-store' });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(body.error ?? 'Unable to load complaint history.');
        }
        if (!cancelled) {
          setRows((body.data ?? []) as ComplaintRow[]);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Unable to load complaint history.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadComplaints();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-3">
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
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Complaint History</CardTitle>
        <Link href={`/public/portal/${encodeURIComponent(token)}/complaints/new`}>
          <Button>
            <PlusCircle className="h-4 w-4" />
            New Complaint
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No complaints submitted yet.</p>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{row.complaint_code}</p>
                  <p className="text-xs text-muted-foreground">{row.site_name} · {formatDate(row.created_at)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{row.category}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Badge color={priorityColor(row.priority)}>{row.priority}</Badge>
                  <Badge color={statusColor(row.status)}>{row.status}</Badge>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
