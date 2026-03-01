'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Briefcase,
  ClipboardList,
  ClipboardCheck,
  Route,
  Moon,
  RefreshCw,
  AlertTriangle,
  MessageSquareWarning,
  Eye,
  EyeOff,
} from 'lucide-react';
import { ChipTabs, SearchInput, Button, Card, CardContent } from '@gleamops/ui';
import type { WorkTicket, Inspection } from '@gleamops/shared';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSyncedTab } from '@/hooks/use-synced-tab';

import TicketsTable from './tickets/tickets-table';
import { TicketDetail } from './tickets/ticket-detail';
import JobsTable from './jobs/jobs-table';
import InspectionsTable from './inspections/inspections-table';
import { InspectionDetail } from './inspections/inspection-detail';
import { CreateInspectionForm } from './inspections/create-inspection-form';
import AlertsTable from './geofence/alerts-table';
import RoutesFleetPanel from './routes/routes-fleet-panel';
import RouteTemplatesTable from './templates/route-templates-table';
import NightBridgeDashboard from './night-bridge/night-bridge-dashboard';
import ComplaintsTable from './complaints/complaints-table';
import PeriodicTasksTable from './periodic/periodic-tasks-table';

interface TicketWithRelations extends WorkTicket {
  job?: { job_code: string; billing_amount?: number | null } | null;
  site?: {
    site_code: string;
    name: string;
    address?: { street?: string; city?: string; state?: string; zip?: string } | null;
    client?: { name: string; client_code?: string } | null;
  } | null;
  assignments?: { staff?: { full_name: string } | null }[];
}

interface InspectionWithRelations extends Inspection {
  site?: { name: string; site_code: string } | null;
  inspector?: { full_name: string; staff_code: string } | null;
  template?: { name: string } | null;
  ticket?: { ticket_code: string } | null;
}

const TABS = [
  { key: 'jobs', label: 'Jobs', icon: <Briefcase className="h-4 w-4" /> },
  { key: 'tickets', label: 'Tickets', icon: <ClipboardList className="h-4 w-4" /> },
  { key: 'inspections', label: 'Inspections', icon: <ClipboardCheck className="h-4 w-4" /> },
  { key: 'templates', label: 'Route Templates', icon: <Route className="h-4 w-4" /> },
  { key: 'routes', label: 'Routes', icon: <Route className="h-4 w-4" /> },
  { key: 'night-bridge', label: 'Night Bridge', icon: <Moon className="h-4 w-4" /> },
  { key: 'periodic', label: 'Periodic Tasks', icon: <RefreshCw className="h-4 w-4" /> },
  { key: 'complaints', label: 'Complaints', icon: <MessageSquareWarning className="h-4 w-4" /> },
  { key: 'alerts', label: 'Alerts', icon: <AlertTriangle className="h-4 w-4" /> },
];

export default function OperationsPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialTicketId = searchParams.get('ticket');
  const action = searchParams.get('action');
  const [tab, setTab] = useSyncedTab({
    tabKeys: TABS.map((entry) => entry.key),
    defaultTab: initialTicketId ? 'tickets' : 'jobs',
  });
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState<TicketWithRelations | null>(null);
  const [selectedInspection, setSelectedInspection] = useState<InspectionWithRelations | null>(null);
  const [showCreateInspection, setShowCreateInspection] = useState(false);
  const [openJobCreateToken, setOpenJobCreateToken] = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const [kpis, setKpis] = useState({
    todayTickets: 0,
    openTickets: 0,
    activeJobs: 0,
    openAlerts: 0,
  });
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    async function fetchKpis() {
      const supabase = getSupabaseBrowserClient();
      const today = new Date().toISOString().slice(0, 10);
      const [todayRes, openRes, jobsRes, alertsRes] = await Promise.all([
        supabase
          .from('work_tickets')
          .select('id', { count: 'exact', head: true })
          .eq('scheduled_date', today)
          .is('archived_at', null),
        supabase
          .from('work_tickets')
          .select('id', { count: 'exact', head: true })
          .in('status', ['SCHEDULED', 'IN_PROGRESS'])
          .is('archived_at', null),
        supabase
          .from('site_jobs')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'ACTIVE')
          .is('archived_at', null),
        supabase
          .from('alerts')
          .select('id', { count: 'exact', head: true })
          .eq('alert_type', 'TIME_EXCEPTION')
          .is('dismissed_at', null),
      ]);

      setKpis({
        todayTickets: todayRes.count ?? 0,
        openTickets: openRes.count ?? 0,
        activeJobs: jobsRes.count ?? 0,
        openAlerts: alertsRes.count ?? 0,
      });
    }
    fetchKpis();
  }, [refreshKey]);

  const clearActionParam = useCallback((nextTab?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.has('action')) return;
    params.delete('action');
    if (nextTab) params.set('tab', nextTab);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const openQuickCreate = useCallback((actionName: string | null | undefined) => {
    if (actionName === 'create-job') {
      setTab('jobs');
      setOpenJobCreateToken((token) => token + 1);
      clearActionParam('jobs');
      return;
    }
    if (actionName === 'create-inspection') {
      setTab('inspections');
      setShowCreateInspection(true);
      clearActionParam('inspections');
      return;
    }
    if (actionName === 'create-ticket') {
      setTab('tickets');
      clearActionParam('tickets');
    }
  }, [clearActionParam, setTab]);

  useEffect(() => {
    openQuickCreate(action);
  }, [action, openQuickCreate]);

  useEffect(() => {
    function handleQuickCreate(event: Event) {
      const detail = (event as CustomEvent<{ action?: string }>).detail;
      openQuickCreate(detail?.action);
    }
    window.addEventListener('gleamops:quick-create', handleQuickCreate);
    return () => window.removeEventListener('gleamops:quick-create', handleQuickCreate);
  }, [openQuickCreate]);

  // Deep link support for legacy routes like /schedule?ticket=<id>.
  // If a ticket id is present, preselect the Tickets tab and open the detail modal.
  useEffect(() => {
    let ignore = false;
    async function openTicketFromQuery(ticketId: string) {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('work_tickets')
        .select(`
          *,
          job:site_jobs!work_tickets_job_id_fkey(job_code, billing_amount),
          site:sites!work_tickets_site_id_fkey(site_code, name, address, client:clients!sites_client_id_fkey(name, client_code))
        `)
        .eq('id', ticketId)
        .is('archived_at', null)
        .single();

      if (ignore) return;
      if (!error && data) {
        setTab('tickets');
        setSelectedTicket(data as unknown as TicketWithRelations);
      }
    }

    if (initialTicketId) {
      void openTicketFromQuery(initialTicketId);
    }
    return () => {
      ignore = true;
    };
  }, [initialTicketId, setTab]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Operations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Core operations only: jobs, tickets, inspections, routes, and alerts.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setFocusMode((prev) => !prev)}>
          {focusMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {focusMode ? 'Exit Focus' : 'Focus Mode'}
        </Button>
      </div>

      {!focusMode && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Tickets Today</p><p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.todayTickets}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Open Tickets</p><p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.openTickets}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active Jobs</p><p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.activeJobs}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Open Alerts</p><p className="text-lg font-semibold sm:text-xl leading-tight text-warning">{kpis.openAlerts}</p></CardContent></Card>
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 lg:flex-1">
          <ChipTabs tabs={TABS} active={tab} onChange={setTab} />
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={
            tab === 'jobs'
              ? 'Search jobs...'
              : tab === 'tickets'
                ? 'Search tickets...'
                : tab === 'inspections'
                  ? 'Search inspections...'
                  : tab === 'templates'
                    ? 'Search route templates...'
                  : tab === 'routes'
                    ? 'Search routes and owners...'
                    : tab === 'night-bridge'
                      ? 'Search shift reviews...'
                    : tab === 'periodic'
                      ? 'Search periodic tasks...'
                    : tab === 'complaints'
                      ? 'Search complaints...'
                    : tab === 'alerts'
                      ? 'Search alerts...'
                      : `Search ${tab}...`
          }
          className="w-full sm:w-72 lg:w-80 lg:ml-auto"
        />
      </div>

      {tab === 'jobs' && (
        <JobsTable
          key={`j-${refreshKey}`}
          search={search}
          openCreateToken={openJobCreateToken}
        />
      )}
      {tab === 'tickets' && (
        <TicketsTable
          key={`t-${refreshKey}`}
          search={search}
          onGoToServicePlans={() => setTab('jobs')}
        />
      )}
      {tab === 'inspections' && (
        <InspectionsTable
          key={`i-${refreshKey}`}
          search={search}
          onSelect={(insp) => setSelectedInspection(insp as InspectionWithRelations)}
          onCreateNew={() => setShowCreateInspection(true)}
        />
      )}
      {tab === 'routes' && (
        <RoutesFleetPanel
          key={`routes-${refreshKey}`}
          search={search}
        />
      )}
      {tab === 'templates' && (
        <RouteTemplatesTable
          key={`route-templates-${refreshKey}`}
          search={search}
        />
      )}
      {tab === 'night-bridge' && (
        <NightBridgeDashboard
          key={`night-bridge-${refreshKey}`}
          search={search}
        />
      )}
      {tab === 'periodic' && (
        <PeriodicTasksTable
          key={`periodic-${refreshKey}`}
          search={search}
        />
      )}
      {tab === 'complaints' && (
        <ComplaintsTable
          key={`complaints-${refreshKey}`}
          search={search}
        />
      )}
      {tab === 'alerts' && <AlertsTable key={`alerts-${refreshKey}`} search={search} />}

      <TicketDetail
        ticket={selectedTicket}
        open={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        onStatusChange={() => {
          setSelectedTicket(null);
          refresh();
        }}
      />

      <InspectionDetail
        inspection={selectedInspection}
        open={!!selectedInspection}
        onClose={() => setSelectedInspection(null)}
        onUpdate={() => {
          setSelectedInspection(null);
          refresh();
        }}
      />

      <CreateInspectionForm
        open={showCreateInspection}
        onClose={() => setShowCreateInspection(false)}
        onCreated={() => {
          setShowCreateInspection(false);
          refresh();
        }}
      />
    </div>
  );
}
