'use client';

import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  BadgeDollarSign,
  BriefcaseBusiness,
  Building2,
  CalendarRange,
} from 'lucide-react';
import {
  Badge,
  Card,
  CardContent,
  ChipTabs,
  ExportButton,
  SearchInput,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  ViewToggle,
  cn,
} from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSyncedTab } from '@/hooks/use-synced-tab';
import { useViewPreference } from '@/hooks/use-view-preference';
import { EntityLink } from '@/components/links/entity-link';
import { EmptyState, TableSkeleton } from '@gleamops/ui';

type MoneyTab = 'job-financials' | 'revenue' | 'planned-income';
type SortDirection = 'asc' | 'desc';

interface SubcontractorJobRow {
  site_job_id: string;
  billing_rate: number | null;
  status: string;
}

interface SiteRow {
  id: string;
  client_id: string | null;
  archived_at: string | null;
}

interface JobFinancialRecord {
  id: string;
  jobCode: string;
  jobName: string;
  status: string;
  frequency: string;
  billingMonthly: number;
  subCostMonthly: number | null;
  profitMonthly: number;
  marginPct: number;
  tier: 'Premium' | 'Target' | 'Standard' | 'Loss';
  siteId: string | null;
  siteName: string;
  siteCode: string;
  clientId: string | null;
  clientName: string;
  clientCode: string;
  industry: string | null;
  contractStatus: string | null;
}

interface ClientRevenueRow {
  clientId: string | null;
  clientName: string;
  clientCode: string;
  industry: string | null;
  monthlyRevenue: number;
  annualRevenue: number;
  sitesCount: number;
  jobsCount: number;
  contractStatus: string | null;
}

const TABS: { key: MoneyTab; label: string; icon: ReactNode }[] = [
  { key: 'job-financials', label: 'Job Financials', icon: <BriefcaseBusiness className="h-4 w-4" /> },
  { key: 'revenue', label: 'Revenue', icon: <Building2 className="h-4 w-4" /> },
  { key: 'planned-income', label: 'Planned Income', icon: <CalendarRange className="h-4 w-4" /> },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

function frequencyLabel(value: string | null): string {
  const normalized = (value ?? '').toUpperCase();
  const map: Record<string, string> = {
    DAILY: 'Daily',
    WEEKLY: 'Weekly',
    BIWEEKLY: 'Biweekly',
    MONTHLY: 'Monthly',
    '2X_WEEK': '2×/Week',
    '3X_WEEK': '3×/Week',
    '4X_WEEK': '4×/Week',
    '5X_WEEK': '5×/Week',
    '6X_WEEK': '6×/Week',
  };
  return map[normalized] ?? (normalized ? normalized.replace(/_/g, ' ') : 'Not Set');
}

function toTier(marginPct: number, profit: number): JobFinancialRecord['tier'] {
  if (profit < 0) return 'Loss';
  if (marginPct >= 40) return 'Premium';
  if (marginPct >= 25) return 'Target';
  return 'Standard';
}

function tierColor(tier: JobFinancialRecord['tier']): 'red' | 'blue' | 'green' | 'gray' {
  if (tier === 'Loss') return 'red';
  if (tier === 'Premium') return 'blue';
  if (tier === 'Target') return 'green';
  return 'gray';
}

function compareValues(a: string | number, b: string | number, dir: SortDirection): number {
  if (typeof a === 'number' && typeof b === 'number') {
    return dir === 'asc' ? a - b : b - a;
  }
  const result = String(a).localeCompare(String(b));
  return dir === 'asc' ? result : -result;
}

function firstJoined<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default function MoneyPageClient() {
  const [tab, setTab] = useSyncedTab({
    tabKeys: TABS.map((entry) => entry.key),
    defaultTab: 'job-financials',
  });
  const activeTab = (tab as MoneyTab);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [jobs, setJobs] = useState<JobFinancialRecord[]>([]);
  const [siteCountsByClientId, setSiteCountsByClientId] = useState<Record<string, number>>({});
  const [jobScope, setJobScope] = useState<'active' | 'all'>('active');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const { view, setView } = useViewPreference('money');

  const [jobSort, setJobSort] = useState<{ key: 'jobName' | 'siteName' | 'clientName' | 'billingMonthly' | 'subCostMonthly' | 'profitMonthly' | 'marginPct'; dir: SortDirection }>({
    key: 'billingMonthly',
    dir: 'desc',
  });
  const [revenueSort, setRevenueSort] = useState<{ key: 'clientName' | 'monthlyRevenue' | 'annualRevenue' | 'sitesCount' | 'jobsCount'; dir: SortDirection }>({
    key: 'monthlyRevenue',
    dir: 'desc',
  });
  const [plannedSort, setPlannedSort] = useState<{ key: 'clientName' | 'siteName' | 'jobName' | 'billingMonthly' | 'subCostMonthly' | 'profitMonthly'; dir: SortDirection }>({
    key: 'billingMonthly',
    dir: 'desc',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    const [jobsRes, subJobsRes, sitesRes] = await Promise.all([
      supabase
        .from('site_jobs')
        .select(`
          id,
          job_code,
          job_name,
          status,
          frequency,
          billing_amount,
          site_id,
          subcontractor_id,
          site:site_id(
            id,
            name,
            site_code,
            client:client_id(
              id,
              name,
              client_code,
              industry,
              contract_type
            )
          )
        `)
        .is('archived_at', null),
      supabase
        .from('subcontractor_jobs')
        .select('site_job_id, billing_rate, status')
        .is('archived_at', null),
      supabase
        .from('sites')
        .select('id, client_id, archived_at')
        .is('archived_at', null),
    ]);

    const subCostByJobId: Record<string, number> = {};
    for (const row of ((subJobsRes.data ?? []) as SubcontractorJobRow[])) {
      if ((row.status ?? '').toUpperCase() === 'CANCELED') continue;
      subCostByJobId[row.site_job_id] = (subCostByJobId[row.site_job_id] ?? 0) + Number(row.billing_rate ?? 0);
    }

    const normalized: JobFinancialRecord[] = (jobsRes.data ?? []).map((row) => {
      const billingMonthly = Number(row.billing_amount ?? 0);
      const subCostMonthly = row.id in subCostByJobId ? subCostByJobId[row.id] : null;
      const profitMonthly = billingMonthly - (subCostMonthly ?? 0);
      const marginPct = billingMonthly > 0 ? ((profitMonthly / billingMonthly) * 100) : 0;
      const siteRaw = firstJoined((row as { site?: Record<string, unknown> | Record<string, unknown>[] | null }).site);
      const clientRaw = firstJoined(
        (siteRaw as { client?: Record<string, unknown> | Record<string, unknown>[] | null } | null)?.client
      );
      return {
        id: row.id,
        jobCode: row.job_code,
        jobName: row.job_name ?? row.job_code,
        status: (row.status ?? 'DRAFT').toUpperCase(),
        frequency: frequencyLabel(row.frequency),
        billingMonthly,
        subCostMonthly,
        profitMonthly,
        marginPct,
        tier: toTier(marginPct, profitMonthly),
        siteId: (siteRaw?.id as string | null | undefined) ?? row.site_id,
        siteName: (siteRaw?.name as string | null | undefined) ?? 'Not Set',
        siteCode: (siteRaw?.site_code as string | null | undefined) ?? 'Not Set',
        clientId: (clientRaw?.id as string | null | undefined) ?? null,
        clientName: (clientRaw?.name as string | null | undefined) ?? 'Not Set',
        clientCode: (clientRaw?.client_code as string | null | undefined) ?? 'Not Set',
        industry: (clientRaw?.industry as string | null | undefined) ?? null,
        contractStatus: (clientRaw?.contract_type as string | null | undefined) ?? null,
      };
    });

    setJobs(normalized);
    // Keep client/site filters valid after refresh.
    const clientIds = new Set(normalized.map((row) => row.clientCode));
    if (clientFilter !== 'all' && !clientIds.has(clientFilter)) setClientFilter('all');
    const siteCodes = new Set(normalized.map((row) => row.siteCode));
    if (siteFilter !== 'all' && !siteCodes.has(siteFilter)) setSiteFilter('all');

    // Site counts are based on current non-archived sites, not just jobs.
    const siteCounts: Record<string, number> = {};
    for (const siteRow of ((sitesRes.data ?? []) as SiteRow[])) {
      const clientId = siteRow.client_id;
      if (!clientId) continue;
      siteCounts[clientId] = (siteCounts[clientId] ?? 0) + 1;
    }
    setSiteCountsByClientId(siteCounts);

    setLoading(false);
  }, [clientFilter, siteFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const scopedJobs = useMemo(() => (
    jobScope === 'active' ? jobs.filter((row) => row.status === 'ACTIVE') : jobs
  ), [jobScope, jobs]);

  const searchedScopedJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return scopedJobs;
    return scopedJobs.filter((row) => (
      row.jobName.toLowerCase().includes(q)
      || row.jobCode.toLowerCase().includes(q)
      || row.siteName.toLowerCase().includes(q)
      || row.siteCode.toLowerCase().includes(q)
      || row.clientName.toLowerCase().includes(q)
      || row.clientCode.toLowerCase().includes(q)
    ));
  }, [scopedJobs, search]);

  const sortedJobFinancialRows = useMemo(() => {
    const list = [...searchedScopedJobs];
    list.sort((a, b) => {
      const key = jobSort.key;
      const av = key === 'subCostMonthly' ? (a[key] ?? -1) : a[key];
      const bv = key === 'subCostMonthly' ? (b[key] ?? -1) : b[key];
      return compareValues(av as string | number, bv as string | number, jobSort.dir);
    });
    return list;
  }, [jobSort, searchedScopedJobs]);

  const jobFinancialMetrics = useMemo(() => {
    const rows = scopedJobs;
    const totalRevenue = rows.reduce((sum, row) => sum + row.billingMonthly, 0);
    const totalProfit = rows.reduce((sum, row) => sum + row.profitMonthly, 0);
    const validMarginRows = rows.filter((row) => row.billingMonthly > 0);
    const avgMargin = validMarginRows.length > 0
      ? validMarginRows.reduce((sum, row) => sum + row.marginPct, 0) / validMarginRows.length
      : 0;
    const lossJobs = rows.filter((row) => row.profitMonthly < 0).length;
    const premiumJobs = rows.filter((row) => row.marginPct >= 40).length;
    return { totalRevenue, totalProfit, avgMargin, lossJobs, premiumJobs };
  }, [scopedJobs]);

  const revenueRows = useMemo(() => {
    const byClient = new Map<string, ClientRevenueRow>();
    for (const row of jobs.filter((item) => item.status === 'ACTIVE')) {
      const key = row.clientCode;
      const current = byClient.get(key) ?? {
        clientId: row.clientId,
        clientName: row.clientName,
        clientCode: row.clientCode,
        industry: row.industry,
        monthlyRevenue: 0,
        annualRevenue: 0,
        sitesCount: 0,
        jobsCount: 0,
        contractStatus: row.contractStatus,
      };
      current.monthlyRevenue += row.billingMonthly;
      current.annualRevenue = current.monthlyRevenue * 12;
      current.jobsCount += 1;
      current.sitesCount = row.clientId ? (siteCountsByClientId[row.clientId] ?? current.sitesCount) : current.sitesCount;
      byClient.set(key, current);
    }

    const q = search.trim().toLowerCase();
    let values = Array.from(byClient.values()).filter((row) => row.monthlyRevenue > 0);
    if (q) {
      values = values.filter((row) => (
        row.clientName.toLowerCase().includes(q)
        || row.clientCode.toLowerCase().includes(q)
        || (row.industry ?? '').toLowerCase().includes(q)
      ));
    }
    values.sort((a, b) => compareValues(a[revenueSort.key], b[revenueSort.key], revenueSort.dir));
    return values;
  }, [jobs, revenueSort, search, siteCountsByClientId]);

  const revenueMetrics = useMemo(() => {
    const monthlyRevenue = revenueRows.reduce((sum, row) => sum + row.monthlyRevenue, 0);
    const annualRevenue = monthlyRevenue * 12;
    const avgPerClient = revenueRows.length > 0 ? (monthlyRevenue / revenueRows.length) : 0;
    const activeJobs = revenueRows.reduce((sum, row) => sum + row.jobsCount, 0);
    return { monthlyRevenue, annualRevenue, avgPerClient, activeJobs };
  }, [revenueRows]);

  const clientOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of jobs.filter((job) => job.status === 'ACTIVE')) {
      map.set(row.clientCode, row.clientName);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([code, name]) => ({ code, name }));
  }, [jobs]);

  const siteOptions = useMemo(() => {
    const map = new Map<string, string>();
    const source = jobs.filter((job) => (
      job.status === 'ACTIVE'
      && (clientFilter === 'all' || job.clientCode === clientFilter)
    ));
    for (const row of source) {
      map.set(row.siteCode, row.siteName);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([code, name]) => ({ code, name }));
  }, [clientFilter, jobs]);

  const plannedIncomeRows = useMemo(() => {
    let rows = jobs.filter((row) => row.status === 'ACTIVE');
    if (clientFilter !== 'all') rows = rows.filter((row) => row.clientCode === clientFilter);
    if (siteFilter !== 'all') rows = rows.filter((row) => row.siteCode === siteFilter);

    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((row) => (
        row.jobName.toLowerCase().includes(q)
        || row.jobCode.toLowerCase().includes(q)
        || row.siteName.toLowerCase().includes(q)
        || row.clientName.toLowerCase().includes(q)
      ));
    }

    const list = [...rows];
    list.sort((a, b) => {
      const key = plannedSort.key;
      const av = key === 'subCostMonthly' ? (a[key] ?? -1) : a[key];
      const bv = key === 'subCostMonthly' ? (b[key] ?? -1) : b[key];
      return compareValues(av as string | number, bv as string | number, plannedSort.dir);
    });
    return list.map((row) => ({
      ...row,
      annualRevenue: row.billingMonthly * 12,
      netMonthly: row.billingMonthly - (row.subCostMonthly ?? 0),
    }));
  }, [clientFilter, jobs, plannedSort, search, siteFilter]);

  const plannedIncomeMetrics = useMemo(() => {
    const monthlyIncome = plannedIncomeRows.reduce((sum, row) => sum + row.billingMonthly, 0);
    const subCosts = plannedIncomeRows.reduce((sum, row) => sum + (row.subCostMonthly ?? 0), 0);
    const netPlanned = monthlyIncome - subCosts;
    return {
      dailyIncome: monthlyIncome / 30,
      weeklyIncome: monthlyIncome / 4.33,
      monthlyIncome,
      annualIncome: monthlyIncome * 12,
      subCosts,
      netPlanned,
    };
  }, [plannedIncomeRows]);

  const onToggleSort = <K extends string>(
    current: { key: K; dir: SortDirection },
    setter: (value: { key: K; dir: SortDirection }) => void,
    key: K
  ) => {
    if (current.key === key) {
      setter({ key, dir: current.dir === 'asc' ? 'desc' : 'asc' });
      return;
    }
    setter({ key, dir: 'desc' });
  };

  const emptyTitleByTab: Record<MoneyTab, string> = {
    'job-financials': 'No jobs match this financial filter',
    revenue: 'No client revenue data for this selection',
    'planned-income': 'No planned income rows for this selection',
  };

  const exportRows = useMemo<Record<string, unknown>[]>(() => {
    if (activeTab === 'job-financials') {
      return sortedJobFinancialRows.map((row) => ({
        job_code: row.jobCode,
        job_name: row.jobName,
        site_code: row.siteCode,
        site_name: row.siteName,
        client_code: row.clientCode,
        client_name: row.clientName,
        frequency: row.frequency,
        billing_monthly: row.billingMonthly,
        sub_cost_monthly: row.subCostMonthly ?? 0,
        profit_monthly: row.profitMonthly,
        margin_pct: row.marginPct,
        tier: row.tier,
      }));
    }
    if (activeTab === 'revenue') {
      return revenueRows.map((row) => ({
        client_code: row.clientCode,
        client_name: row.clientName,
        industry: row.industry ?? '',
        monthly_revenue: row.monthlyRevenue,
        annual_revenue: row.annualRevenue,
        sites: row.sitesCount,
        jobs: row.jobsCount,
        contract_status: row.contractStatus ?? '',
      }));
    }
    return plannedIncomeRows.map((row) => ({
      client_code: row.clientCode,
      client_name: row.clientName,
      site_code: row.siteCode,
      site_name: row.siteName,
      job_code: row.jobCode,
      job_name: row.jobName,
      frequency: row.frequency,
      monthly: row.billingMonthly,
      annual: row.annualRevenue,
      sub_cost: row.subCostMonthly ?? 0,
      net: row.netMonthly,
    }));
  }, [activeTab, plannedIncomeRows, revenueRows, sortedJobFinancialRows]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Money</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Job profitability, client revenue, and planned income projections.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 lg:flex-1">
          <ChipTabs tabs={TABS} active={activeTab} onChange={setTab} />
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:w-auto">
          <div className="flex items-center justify-end gap-2">
            <ViewToggle view={view} onChange={setView} />
            <ExportButton<Record<string, unknown>> data={exportRows} filename={`money-${activeTab}`} />
          </div>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={
              activeTab === 'job-financials'
                ? 'Search service plans, sites, clients...'
                : activeTab === 'revenue'
                  ? 'Search clients or industries...'
                  : 'Search planned income rows...'
            }
            className="w-full sm:w-72 lg:w-80 lg:ml-auto"
          />
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={10} cols={8} />
      ) : activeTab === 'job-financials' ? (
        <>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setJobScope('active')}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                jobScope === 'active'
                  ? 'bg-module-accent text-module-accent-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              Active Jobs
            </button>
            <button
              type="button"
              onClick={() => setJobScope('all')}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                jobScope === 'all'
                  ? 'bg-module-accent text-module-accent-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              All Jobs
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Revenue/mo</p><p className="text-lg font-semibold sm:text-xl leading-tight">{formatCurrency(jobFinancialMetrics.totalRevenue)}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Profit/mo</p><p className="text-lg font-semibold sm:text-xl leading-tight">{formatCurrency(jobFinancialMetrics.totalProfit)}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Avg Margin</p><p className="text-lg font-semibold sm:text-xl leading-tight">{formatPct(jobFinancialMetrics.avgMargin)}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Loss Jobs</p><p className="text-lg font-semibold sm:text-xl leading-tight text-red-600">{jobFinancialMetrics.lossJobs}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Premium Jobs</p><p className="text-lg font-semibold sm:text-xl leading-tight text-blue-600">{jobFinancialMetrics.premiumJobs}</p></CardContent></Card>
          </div>

          {sortedJobFinancialRows.length === 0 ? (
            <EmptyState
              icon={<DollarSign className="h-10 w-10" />}
              title={emptyTitleByTab[activeTab]}
              description="Try a different search or switch job scope."
            />
          ) : view === 'card' ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sortedJobFinancialRows.map((row) => (
                <Card key={row.id}>
                  <CardContent className="space-y-2 pt-4">
                    <p className="text-sm font-semibold text-foreground">
                      <EntityLink entityType="job" code={row.jobCode} name={row.jobName} showCode={false} />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <EntityLink entityType="site" code={row.siteCode} name={row.siteName} showCode={false} /> ·{' '}
                      <EntityLink entityType="client" code={row.clientCode} name={row.clientName} showCode={false} />
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Billing</span>
                      <span className="font-medium">{formatCurrency(row.billingMonthly)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Profit</span>
                      <span className={cn('font-medium', row.profitMonthly < 0 ? 'text-red-600' : 'text-foreground')}>{formatCurrency(row.profitMonthly)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge color={tierColor(row.tier)}>{row.tier}</Badge>
                      <span className={cn('text-sm font-medium', row.marginPct < 25 ? 'text-red-600' : row.marginPct < 40 ? 'text-amber-600' : 'text-green-600')}>
                        {formatPct(row.marginPct)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Table className="w-full min-w-full">
              <TableHeader>
                <tr>
                  <TableHead sortable sorted={jobSort.key === 'jobName' && jobSort.dir} onSort={() => onToggleSort(jobSort, setJobSort, 'jobName')}>Job</TableHead>
                  <TableHead sortable sorted={jobSort.key === 'siteName' && jobSort.dir} onSort={() => onToggleSort(jobSort, setJobSort, 'siteName')}>Site</TableHead>
                  <TableHead sortable sorted={jobSort.key === 'clientName' && jobSort.dir} onSort={() => onToggleSort(jobSort, setJobSort, 'clientName')}>Client</TableHead>
                  <TableHead sortable sorted={jobSort.key === 'billingMonthly' && jobSort.dir} onSort={() => onToggleSort(jobSort, setJobSort, 'billingMonthly')}>Billing/mo</TableHead>
                  <TableHead sortable sorted={jobSort.key === 'subCostMonthly' && jobSort.dir} onSort={() => onToggleSort(jobSort, setJobSort, 'subCostMonthly')}>Sub Cost</TableHead>
                  <TableHead sortable sorted={jobSort.key === 'profitMonthly' && jobSort.dir} onSort={() => onToggleSort(jobSort, setJobSort, 'profitMonthly')}>Profit</TableHead>
                  <TableHead sortable sorted={jobSort.key === 'marginPct' && jobSort.dir} onSort={() => onToggleSort(jobSort, setJobSort, 'marginPct')}>Margin%</TableHead>
                  <TableHead>Tier</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {sortedJobFinancialRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <p className="font-medium">
                        <EntityLink entityType="job" code={row.jobCode} name={row.jobName} showCode={false} />
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">{row.jobCode}</p>
                    </TableCell>
                    <TableCell>
                      <EntityLink entityType="site" code={row.siteCode} name={row.siteCode} showCode={false} />
                    </TableCell>
                    <TableCell>
                      <EntityLink entityType="client" code={row.clientCode} name={row.clientName} showCode={false} />
                    </TableCell>
                    <TableCell className="tabular-nums">{formatCurrency(row.billingMonthly)}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {row.subCostMonthly == null ? 'Not Set' : formatCurrency(row.subCostMonthly)}
                    </TableCell>
                    <TableCell className={cn('tabular-nums font-medium', row.profitMonthly < 0 && 'text-red-600')}>
                      {formatCurrency(row.profitMonthly)}
                    </TableCell>
                    <TableCell className={cn(
                      'tabular-nums font-medium',
                      row.marginPct < 25 ? 'text-red-600' : row.marginPct < 40 ? 'text-amber-600' : 'text-green-600'
                    )}
                    >
                      {formatPct(row.marginPct)}
                    </TableCell>
                    <TableCell>
                      <Badge color={tierColor(row.tier)}>{row.tier}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      ) : activeTab === 'revenue' ? (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Monthly Revenue</p><p className="text-lg font-semibold sm:text-xl leading-tight">{formatCurrency(revenueMetrics.monthlyRevenue)}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Annual Revenue</p><p className="text-lg font-semibold sm:text-xl leading-tight">{formatCurrency(revenueMetrics.annualRevenue)}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Avg / Client</p><p className="text-lg font-semibold sm:text-xl leading-tight">{formatCurrency(revenueMetrics.avgPerClient)}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active Jobs</p><p className="text-lg font-semibold sm:text-xl leading-tight">{revenueMetrics.activeJobs}</p></CardContent></Card>
          </div>

          {revenueRows.length === 0 ? (
            <EmptyState
              icon={<TrendingUp className="h-10 w-10" />}
              title={emptyTitleByTab[activeTab]}
              description="Adjust search filters to view client revenue details."
            />
          ) : view === 'card' ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {revenueRows.map((row) => (
                <Card key={row.clientCode}>
                  <CardContent className="space-y-2 pt-4">
                    <p className="text-sm font-semibold">
                      <EntityLink entityType="client" code={row.clientCode} name={row.clientName} showCode={false} />
                    </p>
                    <p className="text-xs text-muted-foreground">{row.industry ?? 'Not Set'}</p>
                    <p className="text-sm font-medium">{formatCurrency(row.monthlyRevenue)}/mo</p>
                    <p className="text-xs text-muted-foreground">{row.sitesCount} sites · {row.jobsCount} jobs</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Table className="w-full min-w-full">
              <TableHeader>
                <tr>
                  <TableHead sortable sorted={revenueSort.key === 'clientName' && revenueSort.dir} onSort={() => onToggleSort(revenueSort, setRevenueSort, 'clientName')}>Client</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead sortable sorted={revenueSort.key === 'monthlyRevenue' && revenueSort.dir} onSort={() => onToggleSort(revenueSort, setRevenueSort, 'monthlyRevenue')}>Monthly Revenue</TableHead>
                  <TableHead sortable sorted={revenueSort.key === 'annualRevenue' && revenueSort.dir} onSort={() => onToggleSort(revenueSort, setRevenueSort, 'annualRevenue')}>Annual Revenue</TableHead>
                  <TableHead sortable sorted={revenueSort.key === 'sitesCount' && revenueSort.dir} onSort={() => onToggleSort(revenueSort, setRevenueSort, 'sitesCount')}>Sites</TableHead>
                  <TableHead sortable sorted={revenueSort.key === 'jobsCount' && revenueSort.dir} onSort={() => onToggleSort(revenueSort, setRevenueSort, 'jobsCount')}>Jobs</TableHead>
                  <TableHead>Contract Status</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {revenueRows.map((row) => (
                  <TableRow key={row.clientCode}>
                    <TableCell>
                      <p className="font-medium">
                        <EntityLink entityType="client" code={row.clientCode} name={row.clientName} showCode={false} />
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">{row.clientCode}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.industry ?? 'Not Set'}</TableCell>
                    <TableCell className="tabular-nums font-medium">{formatCurrency(row.monthlyRevenue)}</TableCell>
                    <TableCell className="tabular-nums">{formatCurrency(row.annualRevenue)}</TableCell>
                    <TableCell className="tabular-nums">{row.sitesCount}</TableCell>
                    <TableCell className="tabular-nums">{row.jobsCount}</TableCell>
                    <TableCell className="text-muted-foreground">{row.contractStatus ?? 'Not Set'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Daily Income</p><p className="text-lg font-semibold sm:text-xl leading-tight">{formatCurrency(plannedIncomeMetrics.dailyIncome)}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Weekly Income</p><p className="text-lg font-semibold sm:text-xl leading-tight">{formatCurrency(plannedIncomeMetrics.weeklyIncome)}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Monthly Income</p><p className="text-lg font-semibold sm:text-xl leading-tight">{formatCurrency(plannedIncomeMetrics.monthlyIncome)}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Annual Income</p><p className="text-lg font-semibold sm:text-xl leading-tight">{formatCurrency(plannedIncomeMetrics.annualIncome)}</p></CardContent></Card>
          </div>

          <Card>
            <CardContent className="space-y-1 pt-4">
              <p className="text-sm text-foreground">GROSS REVENUE: <span className="font-semibold">{formatCurrency(plannedIncomeMetrics.monthlyIncome)}/mo</span></p>
              <p className="text-sm text-red-600">SUBCONTRACTOR COSTS: -{formatCurrency(plannedIncomeMetrics.subCosts)}/mo</p>
              <p className="text-sm font-bold text-green-600">NET PLANNED INCOME: {formatCurrency(plannedIncomeMetrics.netPlanned)}/mo</p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label htmlFor="money-client-filter" className="mb-1 block text-xs font-medium text-muted-foreground">Client</label>
              <select
                id="money-client-filter"
                value={clientFilter}
                onChange={(event) => {
                  const nextClient = event.target.value;
                  setClientFilter(nextClient);
                  setSiteFilter('all');
                }}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="all">All Clients</option>
                {clientOptions.map((option) => (
                  <option key={option.code} value={option.code}>{option.name} ({option.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="money-site-filter" className="mb-1 block text-xs font-medium text-muted-foreground">Site</label>
              <select
                id="money-site-filter"
                value={siteFilter}
                onChange={(event) => setSiteFilter(event.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="all">All Sites</option>
                {siteOptions.map((option) => (
                  <option key={option.code} value={option.code}>{option.name} ({option.code})</option>
                ))}
              </select>
            </div>
          </div>

          {plannedIncomeRows.length === 0 ? (
            <EmptyState
              icon={<BadgeDollarSign className="h-10 w-10" />}
              title={emptyTitleByTab[activeTab]}
              description="There are no active service plans for this filter combination."
            />
          ) : view === 'card' ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {plannedIncomeRows.map((row) => (
                <Card key={row.id}>
                  <CardContent className="space-y-2 pt-4">
                    <p className="text-sm font-semibold">
                      <EntityLink entityType="job" code={row.jobCode} name={row.jobName} showCode={false} />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <EntityLink entityType="site" code={row.siteCode} name={row.siteName} showCode={false} /> ·{' '}
                      <EntityLink entityType="client" code={row.clientCode} name={row.clientName} showCode={false} />
                    </p>
                    <p className="text-xs text-muted-foreground">{row.frequency}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span>Monthly</span>
                      <span className="font-medium">{formatCurrency(row.billingMonthly)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Net</span>
                      <span className={cn('font-medium', row.netMonthly < 0 ? 'text-red-600' : 'text-green-600')}>
                        {formatCurrency(row.netMonthly)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Table className="w-full min-w-full">
              <TableHeader>
                <tr>
                  <TableHead sortable sorted={plannedSort.key === 'clientName' && plannedSort.dir} onSort={() => onToggleSort(plannedSort, setPlannedSort, 'clientName')}>Client</TableHead>
                  <TableHead sortable sorted={plannedSort.key === 'siteName' && plannedSort.dir} onSort={() => onToggleSort(plannedSort, setPlannedSort, 'siteName')}>Site</TableHead>
                  <TableHead sortable sorted={plannedSort.key === 'jobName' && plannedSort.dir} onSort={() => onToggleSort(plannedSort, setPlannedSort, 'jobName')}>Job</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead sortable sorted={plannedSort.key === 'billingMonthly' && plannedSort.dir} onSort={() => onToggleSort(plannedSort, setPlannedSort, 'billingMonthly')}>Monthly</TableHead>
                  <TableHead sortable sorted={plannedSort.key === 'billingMonthly' && plannedSort.dir} onSort={() => onToggleSort(plannedSort, setPlannedSort, 'billingMonthly')}>Annual</TableHead>
                  <TableHead sortable sorted={plannedSort.key === 'subCostMonthly' && plannedSort.dir} onSort={() => onToggleSort(plannedSort, setPlannedSort, 'subCostMonthly')}>Sub Cost</TableHead>
                  <TableHead sortable sorted={plannedSort.key === 'profitMonthly' && plannedSort.dir} onSort={() => onToggleSort(plannedSort, setPlannedSort, 'profitMonthly')}>Net</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {plannedIncomeRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <EntityLink entityType="client" code={row.clientCode} name={row.clientName} showCode={false} />
                    </TableCell>
                    <TableCell>
                      <EntityLink entityType="site" code={row.siteCode} name={row.siteCode} showCode={false} />
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">
                        <EntityLink entityType="job" code={row.jobCode} name={row.jobName} showCode={false} />
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">{row.jobCode}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.frequency}</TableCell>
                    <TableCell className="tabular-nums">{formatCurrency(row.billingMonthly)}</TableCell>
                    <TableCell className="tabular-nums">{formatCurrency(row.annualRevenue)}</TableCell>
                    <TableCell className={cn('tabular-nums', row.subCostMonthly != null && 'text-red-600')}>
                      {row.subCostMonthly == null ? 'Not Set' : `-${formatCurrency(row.subCostMonthly)}`}
                    </TableCell>
                    <TableCell className={cn('tabular-nums font-medium', row.netMonthly < 0 ? 'text-red-600' : 'text-green-600')}>
                      {formatCurrency(row.netMonthly)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      )}
    </div>
  );
}
