'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CalendarClock, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Badge, Card, CardContent, CardHeader } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface Props {
  search: string;
}

type AuditEventRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_code: string | null;
  created_at: string;
};

function formatEntity(entityType: string): string {
  return entityType.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function AuditCenter({ search }: Props) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    certsExpiring30d: 0,
    trainingExpiring30d: 0,
    docsNeedReview: 0,
    openSafetyIssues: 0,
    criticalIssues: 0,
  });
  const [events, setEvents] = useState<AuditEventRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);

    const today = new Date();
    const in30 = new Date(today);
    in30.setDate(in30.getDate() + 30);

    const todayStr = today.toISOString().slice(0, 10);
    const in30Str = in30.toISOString().slice(0, 10);

    const [certRes, trainingRes, docsRes, issuesRes, criticalRes, eventsRes] = await Promise.all([
      supabase
        .from('staff_certifications')
        .select('id', { count: 'exact', head: true })
        .is('archived_at', null)
        .gte('expiry_date', todayStr)
        .lte('expiry_date', in30Str),
      supabase
        .from('training_completions')
        .select('id', { count: 'exact', head: true })
        .is('archived_at', null)
        .gte('expiry_date', todayStr)
        .lte('expiry_date', in30Str),
      supabase
        .from('safety_documents')
        .select('id', { count: 'exact', head: true })
        .is('archived_at', null)
        .in('status', ['UNDER_REVIEW', 'EXPIRED']),
      supabase
        .from('issues')
        .select('id', { count: 'exact', head: true })
        .in('issue_type', ['SAFETY_ISSUE', 'MAINTENANCE_REPAIR'])
        .in('status', ['OPEN', 'IN_PROGRESS', 'AWAITING_CLIENT']),
      supabase
        .from('issues')
        .select('id', { count: 'exact', head: true })
        .in('issue_type', ['SAFETY_ISSUE', 'MAINTENANCE_REPAIR'])
        .eq('priority', 'CRITICAL')
        .in('status', ['OPEN', 'IN_PROGRESS', 'AWAITING_CLIENT']),
      supabase
        .from('audit_events')
        .select('id, action, entity_type, entity_code, created_at')
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    setKpis({
      certsExpiring30d: certRes.count ?? 0,
      trainingExpiring30d: trainingRes.count ?? 0,
      docsNeedReview: docsRes.count ?? 0,
      openSafetyIssues: issuesRes.count ?? 0,
      criticalIssues: criticalRes.count ?? 0,
    });

    setEvents((eventsRes.data ?? []) as AuditEventRow[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return events;
    return events.filter((event) =>
      event.action.toLowerCase().includes(q)
      || event.entity_type.toLowerCase().includes(q)
      || (event.entity_code ?? '').toLowerCase().includes(q)
    );
  }, [events, search]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading audit center...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Certs Expiring (30d)</p><p className="text-xl font-semibold text-warning">{kpis.certsExpiring30d}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Training Expiring (30d)</p><p className="text-xl font-semibold text-warning">{kpis.trainingExpiring30d}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Docs Needing Review</p><p className="text-xl font-semibold">{kpis.docsNeedReview}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Open Safety Issues</p><p className="text-xl font-semibold text-destructive">{kpis.openSafetyIssues}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Critical Issues</p><p className="text-xl font-semibold text-destructive">{kpis.criticalIssues}</p></CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-warning" />
              <h3 className="text-sm font-semibold text-foreground">Compliance Actions</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Link className="block rounded-lg border border-border px-3 py-2 hover:bg-muted/30" href="/safety?tab=certifications">
              <span className="font-medium text-foreground">Review expiring certifications</span>
              <p className="text-xs text-muted-foreground">{kpis.certsExpiring30d} due in the next 30 days</p>
            </Link>
            <Link className="block rounded-lg border border-border px-3 py-2 hover:bg-muted/30" href="/safety?tab=completions">
              <span className="font-medium text-foreground">Review expiring training completions</span>
              <p className="text-xs text-muted-foreground">{kpis.trainingExpiring30d} due in the next 30 days</p>
            </Link>
            <Link className="block rounded-lg border border-border px-3 py-2 hover:bg-muted/30" href="/safety?tab=documents">
              <span className="font-medium text-foreground">Review safety documents</span>
              <p className="text-xs text-muted-foreground">{kpis.docsNeedReview} need review/refresh</p>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              <h3 className="text-sm font-semibold text-foreground">Issue Escalation</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="font-medium text-foreground">Open Safety Issues</p>
              <p className="text-xs text-muted-foreground">{kpis.openSafetyIssues} active issues require follow-up.</p>
            </div>
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="font-medium text-foreground">Critical Priority</p>
              <p className="text-xs text-muted-foreground">{kpis.criticalIssues} issues at critical priority.</p>
            </div>
            <Link className="inline-flex items-center text-xs font-medium text-blue-600 hover:underline" href="/jobs?tab=tickets">
              Open work tickets for remediation →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <h3 className="text-sm font-semibold text-foreground">Audit Posture</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="font-medium text-foreground">Evidence Readiness</p>
              <p className="text-xs text-muted-foreground">All mutations are logged in audit events with actor and timestamp.</p>
            </div>
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="font-medium text-foreground">Retention Alignment</p>
              <p className="text-xs text-muted-foreground">Safety docs, certifications, and training are centrally tracked for audit export.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <h3 className="text-sm font-semibold text-foreground">Recent Audit Events</h3>
            </div>
            <Badge color="gray">{filteredEvents.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {filteredEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No matching audit events.</p>
          ) : (
            <div className="space-y-2">
              {filteredEvents.slice(0, 20).map((event) => (
                <div key={event.id} className="rounded-lg border border-border px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">{event.action.toUpperCase()} · {formatEntity(event.entity_type)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString()}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{event.entity_code ?? 'No entity code'}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
