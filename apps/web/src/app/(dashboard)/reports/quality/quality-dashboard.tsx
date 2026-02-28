'use client';

import { useEffect, useState, useCallback } from 'react';
import { Shield, CheckCircle, AlertTriangle, Star, TrendingUp, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Skeleton, Badge, Button } from '@gleamops/ui';
import { INSPECTION_STATUS_COLORS, ISSUE_SEVERITY_COLORS } from '@gleamops/shared';
import { MetricCard, BreakdownRow, MiniBars, ChartCard } from '../_components/report-components';

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
  resolved: number;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildDailyLabels(days: number) {
  const out: { key: string; label: string }[] = [];
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    out.push({ key: dateKey(d), label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) });
  }
  return out;
}

export default function QualityDashboard(props: { rangeDays: number; refreshKey: number }) {
  const router = useRouter();
  const [quality, setQuality] = useState<QualityStats>({
    totalInspections: 0,
    completedInspections: 0,
    avgScore: 0,
    passRate: 0,
  });
  const [issues, setIssues] = useState<IssueStats>({ total: 0, open: 0, bySeverity: {}, resolved: 0 });
  const [inspByStatus, setInspByStatus] = useState<Record<string, number>>({});
  const [scoreSeries, setScoreSeries] = useState<number[]>([]);
  const [passSeries, setPassSeries] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const start = new Date(Date.now() - props.rangeDays * 86400000);
    const startISO = start.toISOString();

    const [inspRes, issuesRes] = await Promise.all([
      supabase
        .from('inspections')
        // inspections schema: score_pct numeric, passed boolean
        .select('id, status, score_pct, passed, created_at')
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
      const scoreByDay: Record<string, { total: number; count: number }> = {};
      const passByDay: Record<string, { passed: number; total: number }> = {};

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

        // Trend only within range
        if (insp.created_at && new Date(insp.created_at).toISOString() >= startISO) {
          const key = dateKey(new Date(insp.created_at));
          if (insp.score_pct != null) {
            if (!scoreByDay[key]) scoreByDay[key] = { total: 0, count: 0 };
            scoreByDay[key].total += insp.score_pct;
            scoreByDay[key].count += 1;
          }
          if (!passByDay[key]) passByDay[key] = { passed: 0, total: 0 };
          passByDay[key].total += 1;
          if (insp.passed === true) passByDay[key].passed += 1;
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

      const labels = buildDailyLabels(Math.min(14, Math.max(7, props.rangeDays)));
      setScoreSeries(
        labels.map((d) => {
          const row = scoreByDay[d.key];
          return row && row.count > 0 ? Math.round((row.total / row.count) * 10) / 10 : 0;
        })
      );
      setPassSeries(
        labels.map((d) => {
          const row = passByDay[d.key];
          return row && row.total > 0 ? Math.round((row.passed / row.total) * 100) : 0;
        })
      );
    }

    if (issuesRes.data) {
      const bySeverity: Record<string, number> = {};
      let open = 0;
      let resolved = 0;
      for (const issue of issuesRes.data) {
        if (!issue.resolved_at) {
          open++;
          bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
        } else {
          resolved++;
        }
      }
      setIssues({ total: issuesRes.data.length, open, bySeverity, resolved });
    }

    setLoading(false);
  }, [props.rangeDays]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchData(); }, [props.refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
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
        <MetricCard
          icon={<TrendingUp className="h-5 w-5" />}
          tone="primary"
          label="Issues Resolved"
          value={issues.resolved}
          helper={issues.total > 0 ? `${Math.round((issues.resolved / issues.total) * 100)}%` : '—'}
        />
        <MetricCard
          icon={<TrendingUp className="h-5 w-5" />}
          tone="accent"
          label="Avg Pass (Trend)"
          value={`${Math.round(passSeries.reduce((a, b) => a + b, 0) / Math.max(1, passSeries.length))}%`}
          helper={`last ${props.rangeDays} days`}
        />
      </div>

      {/* Inspection Status + Issues */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          title="Inspections by Status"
          subtitle="All inspections in the system by current status."
          action={
            <Button size="sm" variant="secondary" onClick={() => router.push('/jobs')}>
              View Operations <ArrowRight className="h-4 w-4" />
            </Button>
          }
        >
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
        </ChartCard>

        <ChartCard title="Quality Trend" subtitle={`Score and pass rate (last ${props.rangeDays} days)`}>
          {scoreSeries.length === 0 && passSeries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No inspection activity in this range.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Avg Score</p>
                  <p className="text-[clamp(1rem,3vw,1.5rem)] font-semibold tabular-nums leading-tight [overflow-wrap:anywhere]">{quality.avgScore}</p>
                </div>
                <MiniBars values={scoreSeries} ariaLabel="Average inspection score trend" />
              </div>
              <div className="flex items-center justify-between gap-4 pt-3 border-t border-border">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Pass Rate</p>
                  <p className="text-[clamp(1rem,3vw,1.5rem)] font-semibold tabular-nums leading-tight [overflow-wrap:anywhere]">{quality.passRate}%</p>
                </div>
                <MiniBars values={passSeries} barClassName="fill-success/60" ariaLabel="Inspection pass rate trend" />
              </div>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Open Issues by Severity" subtitle="Unresolved issues grouped by severity.">
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
        </ChartCard>
      </div>
    </div>
  );
}
