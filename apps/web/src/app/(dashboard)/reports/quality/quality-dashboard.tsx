'use client';

import { useEffect, useState, useCallback } from 'react';
import { Shield, CheckCircle, AlertTriangle, Star } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, Skeleton, Badge } from '@gleamops/ui';
import { INSPECTION_STATUS_COLORS, ISSUE_SEVERITY_COLORS } from '@gleamops/shared';
import { MetricCard, BreakdownRow } from '../_components/report-components';

interface QualityStats {
  totalInspections: number;
  completedInspections: number;
  avgScore: number;
  passRate: number;
}

interface IssueStats {
  total: number;
  open: number;
  bySeverity: Record<string, number>;
}

export default function QualityDashboard() {
  const [quality, setQuality] = useState<QualityStats>({
    totalInspections: 0,
    completedInspections: 0,
    avgScore: 0,
    passRate: 0,
  });
  const [issues, setIssues] = useState<IssueStats>({ total: 0, open: 0, bySeverity: {} });
  const [inspByStatus, setInspByStatus] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    const [inspRes, issuesRes] = await Promise.all([
      supabase
        .from('inspections')
        // inspections schema: score_pct numeric, passed boolean
        .select('id, status, score_pct, passed')
        .is('archived_at', null),
      supabase
        .from('inspection_issues')
        .select('id, severity, resolved_at')
        .is('archived_at', null),
    ]);

    if (inspRes.data) {
      const byStatus: Record<string, number> = {};
      let completed = 0;
      let totalScore = 0;
      let scored = 0;
      let passed = 0;

      for (const insp of inspRes.data) {
        byStatus[insp.status] = (byStatus[insp.status] || 0) + 1;
        if (insp.status === 'COMPLETED' || insp.status === 'SUBMITTED') {
          completed++;
          if (insp.score_pct != null) {
            totalScore += insp.score_pct;
            scored++;
          }
          if (insp.passed === true) passed++;
        }
      }

      setQuality({
        totalInspections: inspRes.data.length,
        completedInspections: completed,
        // score_pct is 0..100; show a 1-decimal average percentage
        avgScore: scored > 0 ? Math.round((totalScore / scored) * 10) / 10 : 0,
        passRate: completed > 0 ? Math.round((passed / completed) * 100) : 0,
      });
      setInspByStatus(byStatus);
    }

    if (issuesRes.data) {
      const bySeverity: Record<string, number> = {};
      let open = 0;
      for (const issue of issuesRes.data) {
        if (!issue.resolved_at) {
          open++;
          bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
        }
      }
      setIssues({ total: issuesRes.data.length, open, bySeverity });
    }

    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={<Shield className="h-5 w-5" />} tone="primary" label="Total Inspections" value={quality.totalInspections} />
        <MetricCard
          icon={<CheckCircle className="h-5 w-5" />}
          tone="success"
          label="Pass Rate"
          value={`${quality.passRate}%`}
          helper={`${quality.completedInspections} completed`}
        />
        <MetricCard icon={<Star className="h-5 w-5" />} tone="accent" label="Avg Score" value={quality.avgScore} />
        <MetricCard
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="destructive"
          label="Open Issues"
          value={issues.open}
          helper={`${issues.total} total`}
        />
      </div>

      {/* Inspection Status + Issues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Inspections by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(inspByStatus).length === 0 ? (
              <p className="text-sm text-muted-foreground">No inspections recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(inspByStatus).map(([status, count]) => (
                  <BreakdownRow
                    key={status}
                    left={<Badge color={INSPECTION_STATUS_COLORS[status] ?? 'gray'}>{status}</Badge>}
                    right={count}
                    pct={quality.totalInspections > 0 ? count / quality.totalInspections : 0}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open Issues by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            {issues.open === 0 ? (
              <p className="text-sm text-muted-foreground">No open issues. All clear!</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(issues.bySeverity)
                  .sort((a, b) => {
                    const order: Record<string, number> = { CRITICAL: 0, MAJOR: 1, MINOR: 2 };
                    return (order[a[0]] ?? 3) - (order[b[0]] ?? 3);
                  })
                  .map(([severity, count]) => (
                    <div key={severity} className="flex items-center justify-between">
                      <Badge color={ISSUE_SEVERITY_COLORS[severity] ?? 'gray'}>{severity}</Badge>
                      <span className="text-sm font-medium">{count} unresolved</span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
