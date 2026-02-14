'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Building2,
  Ticket,
  Users,
  FileText,
  Activity,
  Calendar,
  TrendingUp,
  Clock,
  Briefcase,
  MapPin,
  Package,
  AlertTriangle,
  DollarSign,
  ShieldAlert,
  ShieldCheck,
  Award,
  BookOpen,
  Send,
  Trophy,
  Mail,
} from 'lucide-react';
import { StatCard, CollapsibleCard, Badge, Skeleton } from '@gleamops/ui';
import {
  TICKET_STATUS_COLORS,
  PROSPECT_STATUS_COLORS,
} from '@gleamops/shared';
import type { StatusColor } from '@gleamops/shared';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';

// ---------------------------------------------------------------------------
// Date/time formatters
// ---------------------------------------------------------------------------
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

const fullDateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return dateFormatter.format(date);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Metrics {
  activeClients: number | null;
  activeSites: number | null;
  activeJobs: number | null;
  openTickets: number | null;
  activeStaff: number | null;
  pendingBids: number | null;
  revenueThisMonth: number | null;
  overdueInspections: number | null;
  pipelineValue: number | null;
  proposalsSent30d: number | null;
  winRate: number | null;
  followupsDue: number | null;
}

interface LowStockRow {
  id: string;
  name: string;
  category: string | null;
  site?: { name: string } | null;
}

interface DataIssueRow {
  entity: string;
  code: string;
  issue: string;
}

interface ComplianceAlert {
  id: string;
  type: 'cert' | 'training' | 'document';
  label: string;
  name: string;
  expiryDate: string;
  daysUntil: number;
}

interface AuditRow {
  id: string;
  action: string;
  entity_type: string;
  entity_code: string | null;
  created_at: string;
}

interface TicketRow {
  id: string;
  ticket_code: string;
  scheduled_date: string;
  status: string;
}

interface ProspectRow {
  id: string;
  prospect_code: string;
  company_name: string;
  prospect_status_code: string;
  source: string | null;
}

interface ActiveStaffRow {
  id: string;
  staff_id: string;
  start_at: string;
  staff?: { full_name: string } | null;
}

// ---------------------------------------------------------------------------
// Skeleton loaders
// ---------------------------------------------------------------------------
function StatCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="h-12 w-12 rounded-lg" />
      </div>
    </div>
  );
}

function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Action label for audit events
// ---------------------------------------------------------------------------
function formatAction(action: string): string {
  switch (action) {
    case 'INSERT':
      return 'Created';
    case 'UPDATE':
      return 'Updated';
    case 'DELETE':
      return 'Deleted';
    default:
      return action.charAt(0).toUpperCase() + action.slice(1).toLowerCase();
  }
}

function formatEntityType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Dashboard Home Page
// ---------------------------------------------------------------------------
export default function HomePage() {
  const { user, loading: authLoading } = useAuth();

  const [metrics, setMetrics] = useState<Metrics>({
    activeClients: null,
    activeSites: null,
    activeJobs: null,
    openTickets: null,
    activeStaff: null,
    pendingBids: null,
    revenueThisMonth: null,
    overdueInspections: null,
    pipelineValue: null,
    proposalsSent30d: null,
    winRate: null,
    followupsDue: null,
  });
  const [auditEvents, setAuditEvents] = useState<AuditRow[]>([]);
  const [upcomingTickets, setUpcomingTickets] = useState<TicketRow[]>([]);
  const [prospects, setProspects] = useState<ProspectRow[]>([]);
  const [activeShifts, setActiveShifts] = useState<ActiveStaffRow[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockRow[]>([]);
  const [dataIssues, setDataIssues] = useState<DataIssueRow[]>([]);
  const [complianceAlerts, setComplianceAlerts] = useState<ComplianceAlert[]>([]);

  const [metricsLoading, setMetricsLoading] = useState(true);
  const [sectionsLoading, setSectionsLoading] = useState(true);

  // Fetch all dashboard data
  const fetchDashboard = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();

    const today = new Date().toISOString().split('T')[0];

    // --- Metrics (parallel count queries) ---
    setMetricsLoading(true);
    const [
      clientsRes, sitesRes, jobsRes, ticketsRes, staffRes, bidsRes, revenueRes, inspRes,
      pipelineRes, proposalsSentRes, winRateRes, followupsDueRes,
    ] = await Promise.all([
      supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'ACTIVE')
        .is('archived_at', null),
      supabase
        .from('sites')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'ACTIVE')
        .is('archived_at', null),
      supabase
        .from('site_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'ACTIVE')
        .is('archived_at', null),
      supabase
        .from('work_tickets')
        .select('id', { count: 'exact', head: true })
        .in('status', ['SCHEDULED', 'IN_PROGRESS']),
      supabase
        .from('staff')
        .select('id', { count: 'exact', head: true })
        .eq('staff_status', 'ACTIVE')
        .is('archived_at', null),
      supabase
        .from('sales_bids')
        .select('id', { count: 'exact', head: true })
        .in('status', ['DRAFT', 'IN_PROGRESS']),
      // Revenue this month: sum billing_amount from active site_jobs
      supabase
        .from('site_jobs')
        .select('billing_amount')
        .eq('status', 'ACTIVE')
        .is('archived_at', null),
      // Overdue inspections
      supabase
        .from('sites')
        .select('id', { count: 'exact', head: true })
        .lt('next_inspection_date', today)
        .not('next_inspection_date', 'is', null)
        .is('archived_at', null),
      // Pipeline value: sum estimated_monthly_value from active opportunities
      supabase
        .from('sales_opportunities')
        .select('estimated_monthly_value')
        .not('stage_code', 'in', '("WON","LOST")')
        .is('archived_at', null),
      // Proposals sent last 30 days
      supabase
        .from('sales_proposal_sends')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
      // Win rate: won / (won + lost) proposals
      supabase
        .from('sales_proposals')
        .select('status')
        .in('status', ['WON', 'LOST']),
      // Follow-ups due: active follow-up sends scheduled up to now
      supabase
        .from('sales_followup_sends')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'SCHEDULED')
        .lte('scheduled_at', new Date().toISOString()),
    ]);

    // Compute revenue sum
    const revenueSum = (revenueRes.data ?? []).reduce(
      (sum, row) => sum + (Number((row as { billing_amount: number | null }).billing_amount) || 0),
      0,
    );

    // Compute pipeline value sum
    const pipelineSum = (pipelineRes.data ?? []).reduce(
      (sum, row) => sum + (Number((row as { estimated_monthly_value: number | null }).estimated_monthly_value) || 0),
      0,
    );

    // Compute win rate
    const wonLost = (winRateRes.data ?? []) as { status: string }[];
    const wonCount = wonLost.filter(r => r.status === 'WON').length;
    const lostCount = wonLost.filter(r => r.status === 'LOST').length;
    const winRateVal = wonCount + lostCount > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0;

    setMetrics({
      activeClients: clientsRes.count ?? 0,
      activeSites: sitesRes.count ?? 0,
      activeJobs: jobsRes.count ?? 0,
      openTickets: ticketsRes.count ?? 0,
      activeStaff: staffRes.count ?? 0,
      pendingBids: bidsRes.count ?? 0,
      revenueThisMonth: revenueSum,
      overdueInspections: inspRes.count ?? 0,
      pipelineValue: pipelineSum,
      proposalsSent30d: proposalsSentRes.count ?? 0,
      winRate: winRateVal,
      followupsDue: followupsDueRes.count ?? 0,
    });
    setMetricsLoading(false);

    // --- Sections (parallel data queries) ---
    setSectionsLoading(true);

    // Look ahead 30 days for compliance
    const complianceLookahead = new Date();
    complianceLookahead.setDate(complianceLookahead.getDate() + 30);
    const complianceLookaheadStr = complianceLookahead.toISOString().split('T')[0];

    const [auditRes, ticketListRes, prospectRes, shiftsRes, lowStockRes, clientIssuesRes, expiringCertsRes, expiringTrainingRes, expiringDocsRes] = await Promise.all([
      // Recent activity
      supabase
        .from('audit_events')
        .select('id, action, entity_type, entity_code, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
      // Upcoming tickets
      supabase
        .from('work_tickets')
        .select('id, ticket_code, scheduled_date, status')
        .gte('scheduled_date', today)
        .order('scheduled_date', { ascending: true })
        .limit(5),
      // Pipeline prospects
      supabase
        .from('sales_prospects')
        .select('id, prospect_code, company_name, prospect_status_code, source')
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(5),
      // Currently on shift (open time entries)
      supabase
        .from('time_entries')
        .select('id, staff_id, start_at, staff:staff_id(full_name)')
        .is('end_at', null)
        .order('start_at', { ascending: false })
        .limit(10),
      // Low stock / supply alerts
      supabase
        .from('site_supplies')
        .select('id, name, category, site:site_id(name)')
        .is('archived_at', null)
        .order('name')
        .limit(10),
      // Data quality — clients missing billing address
      supabase
        .from('clients')
        .select('id, client_code, name, billing_address')
        .is('archived_at', null)
        .order('client_code')
        .limit(200),
      // Expiring certifications (next 30 days or already expired)
      supabase
        .from('staff_certifications')
        .select('id, certification_name, expiry_date, staff:staff_id(full_name)')
        .is('archived_at', null)
        .eq('status', 'ACTIVE')
        .not('expiry_date', 'is', null)
        .lte('expiry_date', complianceLookaheadStr)
        .order('expiry_date')
        .limit(10),
      // Expiring training completions
      supabase
        .from('training_completions')
        .select('id, expiry_date, staff:staff_id(full_name), course:course_id(name)')
        .is('archived_at', null)
        .not('expiry_date', 'is', null)
        .lte('expiry_date', complianceLookaheadStr)
        .order('expiry_date')
        .limit(10),
      // Safety docs needing review
      supabase
        .from('safety_documents')
        .select('id, document_code, title, review_date, expiry_date')
        .is('archived_at', null)
        .eq('status', 'ACTIVE')
        .not('expiry_date', 'is', null)
        .lte('expiry_date', complianceLookaheadStr)
        .order('expiry_date')
        .limit(10),
    ]);

    if (auditRes.data) setAuditEvents(auditRes.data as AuditRow[]);
    if (ticketListRes.data) setUpcomingTickets(ticketListRes.data as TicketRow[]);
    if (prospectRes.data) setProspects(prospectRes.data as ProspectRow[]);
    if (shiftsRes.data) setActiveShifts(shiftsRes.data as unknown as ActiveStaffRow[]);
    if (lowStockRes.data) setLowStockItems(lowStockRes.data as unknown as LowStockRow[]);

    // Compute data quality issues from fetched data
    const issues: DataIssueRow[] = [];
    if (clientIssuesRes.data) {
      for (const c of clientIssuesRes.data as unknown as { client_code: string; name: string; billing_address: Record<string, string> | null }[]) {
        if (!c.billing_address || (!c.billing_address.street && !c.billing_address.city)) {
          issues.push({ entity: 'Client', code: c.client_code, issue: 'Missing billing address' });
        }
      }
    }
    setDataIssues(issues.slice(0, 10));

    // Compute compliance alerts
    const alerts: ComplianceAlert[] = [];
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    if (expiringCertsRes.data) {
      for (const cert of expiringCertsRes.data as unknown as { id: string; certification_name: string; expiry_date: string; staff?: { full_name: string } | null }[]) {
        if (!cert.expiry_date) continue;
        const days = Math.ceil((new Date(cert.expiry_date + 'T00:00:00').getTime() - todayDate.getTime()) / 86400000);
        alerts.push({ id: cert.id, type: 'cert', label: 'Certification', name: `${cert.certification_name} — ${cert.staff?.full_name ?? 'Unknown'}`, expiryDate: cert.expiry_date, daysUntil: days });
      }
    }
    if (expiringTrainingRes.data) {
      for (const comp of expiringTrainingRes.data as unknown as { id: string; expiry_date: string; staff?: { full_name: string } | null; course?: { name: string } | null }[]) {
        if (!comp.expiry_date) continue;
        const days = Math.ceil((new Date(comp.expiry_date + 'T00:00:00').getTime() - todayDate.getTime()) / 86400000);
        alerts.push({ id: comp.id, type: 'training', label: 'Training', name: `${comp.course?.name ?? 'Course'} — ${comp.staff?.full_name ?? 'Unknown'}`, expiryDate: comp.expiry_date, daysUntil: days });
      }
    }
    if (expiringDocsRes.data) {
      for (const doc of expiringDocsRes.data as unknown as { id: string; document_code: string; title: string; expiry_date: string | null }[]) {
        if (!doc.expiry_date) continue;
        const days = Math.ceil((new Date(doc.expiry_date + 'T00:00:00').getTime() - todayDate.getTime()) / 86400000);
        alerts.push({ id: doc.id, type: 'document', label: 'Document', name: `${doc.title} (${doc.document_code})`, expiryDate: doc.expiry_date, daysUntil: days });
      }
    }
    alerts.sort((a, b) => a.daysUntil - b.daysUntil);
    setComplianceAlerts(alerts.slice(0, 10));

    setSectionsLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading) {
      fetchDashboard();
    }
  }, [authLoading, fetchDashboard]);

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = user?.email?.split('@')[0]?.replace(/[._-]/g, ' ')?.replace(/\b\w/g, (c) => c.toUpperCase()) ?? '';

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {getGreeting()}{displayName ? `, ${displayName}` : ''}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {fullDateFormatter.format(new Date())}
        </p>
      </div>

      {/* Executive Dashboard — Stat Cards */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Executive Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
          {metricsLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard
                label="Active Clients"
                value={metrics.activeClients ?? 0}
                icon={<Building2 className="h-5 w-5" />}
                href="/crm?tab=clients"
              />
              <StatCard
                label="Active Sites"
                value={metrics.activeSites ?? 0}
                icon={<MapPin className="h-5 w-5" />}
                href="/crm?tab=sites"
              />
              <StatCard
                label="Active Jobs"
                value={metrics.activeJobs ?? 0}
                icon={<Briefcase className="h-5 w-5" />}
                href="/operations?tab=jobs"
              />
              <StatCard
                label="Open Tickets"
                value={metrics.openTickets ?? 0}
                icon={<Ticket className="h-5 w-5" />}
                href="/operations?tab=tickets"
              />
              <StatCard
                label="Active Staff"
                value={metrics.activeStaff ?? 0}
                icon={<Users className="h-5 w-5" />}
                href="/workforce?tab=staff"
              />
              <StatCard
                label="Pending Bids"
                value={metrics.pendingBids ?? 0}
                icon={<FileText className="h-5 w-5" />}
                href="/pipeline?tab=bids"
              />
              <StatCard
                label="Revenue/mo"
                value={`$${((metrics.revenueThisMonth ?? 0) / 1000).toFixed(1)}k`}
                icon={<DollarSign className="h-5 w-5" />}
                href="/reports?tab=financial"
              />
              <StatCard
                label="Overdue Inspections"
                value={metrics.overdueInspections ?? 0}
                icon={<ShieldAlert className="h-5 w-5" />}
                href="/operations?tab=inspections"
              />
            </>
          )}
        </div>
      </div>

      {/* Sales Pipeline KPIs */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Sales Pipeline</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {metricsLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard
                label="Pipeline Value"
                value={`$${((metrics.pipelineValue ?? 0) / 1000).toFixed(1)}k`}
                icon={<TrendingUp className="h-5 w-5" />}
                href="/pipeline?tab=opportunities"
              />
              <StatCard
                label="Proposals Sent (30d)"
                value={metrics.proposalsSent30d ?? 0}
                icon={<Send className="h-5 w-5" />}
                href="/pipeline?tab=proposals"
              />
              <StatCard
                label="Win Rate"
                value={`${metrics.winRate ?? 0}%`}
                icon={<Trophy className="h-5 w-5" />}
                href="/pipeline?tab=analytics"
              />
              <StatCard
                label="Follow-ups Due"
                value={metrics.followupsDue ?? 0}
                icon={<Mail className="h-5 w-5" />}
                href="/pipeline?tab=proposals"
              />
            </>
          )}
        </div>
      </div>

      {/* Operations Dashboard — 2x2 grid */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Operations</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <CollapsibleCard
          id="dashboard-activity"
          title="Recent Activity"
          icon={<Activity className="h-5 w-5" />}
        >
          {sectionsLoading ? (
            <ListSkeleton rows={5} />
          ) : auditEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity.</p>
          ) : (
            <ul className="space-y-2.5">
              {auditEvents.map((event) => (
                <li
                  key={event.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-medium text-foreground shrink-0">
                      {formatAction(event.action)}
                    </span>
                    <span className="text-muted-foreground truncate">
                      {formatEntityType(event.entity_type)}
                      {event.entity_code ? ` (${event.entity_code})` : ''}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {formatRelativeTime(event.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleCard>

        {/* Upcoming Tickets */}
        <CollapsibleCard
          id="dashboard-tickets"
          title="Upcoming Tickets"
          icon={<Calendar className="h-5 w-5" />}
        >
          {sectionsLoading ? (
            <ListSkeleton rows={5} />
          ) : upcomingTickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming tickets.</p>
          ) : (
            <ul className="space-y-2.5">
              {upcomingTickets.map((ticket) => (
                <li
                  key={ticket.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="font-mono text-xs text-muted-foreground shrink-0">
                      {ticket.ticket_code}
                    </span>
                    <span className="text-foreground">
                      {dateFormatter.format(new Date(ticket.scheduled_date + 'T00:00:00'))}
                    </span>
                  </div>
                  <Badge color={TICKET_STATUS_COLORS[ticket.status] as StatusColor ?? 'gray'}>
                    {ticket.status.replace(/_/g, ' ')}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleCard>

        {/* Pipeline Overview */}
        <CollapsibleCard
          id="dashboard-pipeline"
          title="Pipeline Overview"
          icon={<TrendingUp className="h-5 w-5" />}
        >
          {sectionsLoading ? (
            <ListSkeleton rows={5} />
          ) : prospects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No prospects in the pipeline.</p>
          ) : (
            <ul className="space-y-2.5">
              {prospects.map((prospect) => (
                <li
                  key={prospect.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="font-medium text-foreground truncate">
                      {prospect.company_name}
                    </span>
                    {prospect.source && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {prospect.source.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  <Badge
                    color={PROSPECT_STATUS_COLORS[prospect.prospect_status_code] as StatusColor ?? 'gray'}
                  >
                    {prospect.prospect_status_code.replace(/_/g, ' ')}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleCard>

        {/* Team on Shift */}
        <CollapsibleCard
          id="dashboard-team"
          title="Team on Shift"
          icon={<Clock className="h-5 w-5" />}
        >
          {sectionsLoading ? (
            <ListSkeleton rows={4} />
          ) : activeShifts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No staff currently on shift.</p>
          ) : (
            <ul className="space-y-2.5">
              {activeShifts.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="h-2 w-2 rounded-full bg-success shrink-0" />
                    <span className="font-medium text-foreground truncate">
                      {entry.staff?.full_name ?? 'Unknown Staff'}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    Checked in {timeFormatter.format(new Date(entry.start_at))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleCard>
      </div>

      {/* Compliance Alerts */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Compliance</h2>
      <div className="grid grid-cols-1 gap-6">
        <CollapsibleCard
          id="dashboard-compliance"
          title="Compliance Alerts"
          icon={<ShieldCheck className="h-5 w-5" />}
        >
          {sectionsLoading ? (
            <ListSkeleton rows={4} />
          ) : complianceAlerts.length === 0 ? (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success" />
              <p className="text-sm text-muted-foreground">All clear. No expiring certifications, training, or documents.</p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {complianceAlerts.map((alert) => (
                <li
                  key={`${alert.type}-${alert.id}`}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {alert.type === 'cert' && <Award className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    {alert.type === 'training' && <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    {alert.type === 'document' && <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    <span className="font-medium text-foreground truncate">{alert.name}</span>
                  </div>
                  <Badge color={alert.daysUntil < 0 ? 'red' : alert.daysUntil <= 14 ? 'orange' : 'yellow'}>
                    {alert.daysUntil < 0 ? `Overdue ${Math.abs(alert.daysUntil)}d` : alert.daysUntil === 0 ? 'Today' : `${alert.daysUntil}d left`}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleCard>
      </div>

      {/* Inventory & Data Quality Dashboards */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Inventory & Data Quality</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory Dashboard */}
        <CollapsibleCard
          id="dashboard-inventory"
          title="Inventory Alerts"
          icon={<Package className="h-5 w-5" />}
        >
          {sectionsLoading ? (
            <ListSkeleton rows={4} />
          ) : lowStockItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No inventory alerts. All supplies are stocked.</p>
          ) : (
            <ul className="space-y-2.5">
              {lowStockItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium text-foreground truncate">{item.name}</span>
                    {item.category && (
                      <span className="text-xs text-muted-foreground shrink-0">{item.category}</span>
                    )}
                  </div>
                  {item.site && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      {item.site.name}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CollapsibleCard>

        {/* Data Quality Dashboard */}
        <CollapsibleCard
          id="dashboard-data-quality"
          title="Data Quality"
          icon={<ShieldAlert className="h-5 w-5" />}
        >
          {sectionsLoading ? (
            <ListSkeleton rows={4} />
          ) : dataIssues.length === 0 ? (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success" />
              <p className="text-sm text-muted-foreground">All records look good. No issues detected.</p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {dataIssues.map((issue, i) => (
                <li
                  key={`${issue.code}-${i}`}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
                    <span className="font-mono text-xs text-muted-foreground shrink-0">{issue.code}</span>
                    <span className="text-foreground truncate">{issue.issue}</span>
                  </div>
                  <Badge color="yellow">{issue.entity}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleCard>
      </div>
    </div>
  );
}
