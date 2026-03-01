'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Briefcase,
  ClipboardList,
  ClipboardCheck,
  Clock,
  Route,
  Eye,
  EyeOff,
  Plus,
  CheckSquare,
  FileCog,
} from 'lucide-react';
import { SearchInput, Button, Card, CardContent } from '@gleamops/ui';
import type { WorkTicket, Inspection } from '@gleamops/shared';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSyncedTab } from '@/hooks/use-synced-tab';

import TicketsTable from '../operations/tickets/tickets-table';
import { TicketDetail } from '../operations/tickets/ticket-detail';
import InspectionsTable from '../operations/inspections/inspections-table';
import { InspectionDetail } from '../operations/inspections/inspection-detail';
import { CreateInspectionForm } from '../operations/inspections/create-inspection-form';
import JobsTable from '../operations/jobs/jobs-table';
import AlertsTable from '../operations/geofence/alerts-table';
import RoutesFleetPanel from '../operations/routes/routes-fleet-panel';
import { ChecklistAdmin } from '../schedule/checklist-admin';
import { FormsHub } from '../schedule/forms/forms-hub';

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

const BASE_TABS = [
  { key: 'service-plans', label: 'Service Plans', icon: <Briefcase className="h-4 w-4" /> },
  { key: 'tickets', label: 'Job Log', icon: <ClipboardList className="h-4 w-4" /> },
  { key: 'inspections', label: 'Inspections', icon: <ClipboardCheck className="h-4 w-4" /> },
  { key: 'time', label: 'Time', icon: <Clock className="h-4 w-4" /> },
  { key: 'routes', label: 'Routes', icon: <Route className="h-4 w-4" /> },
  { key: 'checklists', label: 'Checklists', icon: <CheckSquare className="h-4 w-4" /> },
  { key: 'forms', label: 'Forms', icon: <FileCog className="h-4 w-4" /> },
] as const;

export default function JobsPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialTicketId = searchParams.get('ticket');
  const action = searchParams.get('action');
  const tabs = [...BASE_TABS];

  const [tab, setTab] = useSyncedTab({
    tabKeys: tabs.map((entry) => entry.key),
    defaultTab: initialTicketId ? 'tickets' : 'service-plans',
    aliases: { alerts: 'time', jobs: 'service-plans', services: 'service-plans' },
  });
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState<TicketWithRelations | null>(null);
  const [selectedInspection, setSelectedInspection] = useState<InspectionWithRelations | null>(null);
  const [showCreateInspection, setShowCreateInspection] = useState(false);
  const [openServicePlanCreateToken, setOpenServicePlanCreateToken] = useState(0);
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

  // Handle quick create actions from URL params
  const clearActionParam = useCallback(
    (nextTab?: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!params.has('action')) return;
      params.delete('action');
      if (nextTab) params.set('tab', nextTab);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const openQuickCreate = useCallback(
    (actionName: string | null | undefined) => {
      if (actionName === 'create-job') {
        setTab('service-plans');
        setOpenServicePlanCreateToken((token) => token + 1);
        clearActionParam('service-plans');
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
    },
    [clearActionParam, setTab],
  );

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

  // Deep link: ?ticket=<id>
  useEffect(() => {
    let ignore = false;
    async function openTicketFromQuery(ticketId: string) {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('work_tickets')
        .select(
          `*, job:job_id(job_code, billing_amount), site:site_id(site_code, name, address, client:client_id(name, client_code))`,
        )
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">Jobs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Active work: tickets, inspections, time tracking, and routes.
          </p>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={
              tab === 'service-plans'
                ? 'Search service plans...'
                : tab === 'tickets'
                  ? 'Search tickets...'
                  : tab === 'inspections'
                    ? 'Search inspections...'
                    : tab === 'time'
                      ? 'Search time alerts and exceptions...'
                      : tab === 'routes'
                        ? 'Search routes and owners...'
                        : `Search ${tab}...`
            }
            className="w-56 sm:w-72 lg:w-80"
          />
          <Button className="shrink-0" onClick={() => { setTab('service-plans'); setOpenServicePlanCreateToken((token) => token + 1); }}>
            <Plus className="h-4 w-4" />
            New Service Plan
          </Button>
          <Button variant="secondary" className="shrink-0" onClick={() => setFocusMode((prev) => !prev)}>
            {focusMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {focusMode ? 'Exit Focus' : 'Focus Mode'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Tickets Today</p>
            <p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.todayTickets}</p>
          </CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setTab('tickets')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setTab('tickets');
            }
          }}
          className="cursor-pointer hover:border-module-accent/40 hover:shadow-md"
        >
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Open Tickets</p>
            <p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.openTickets}</p>
            <p className="text-[11px] text-muted-foreground">Open Job Log</p>
          </CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setTab('service-plans')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setTab('service-plans');
            }
          }}
          className="cursor-pointer hover:border-module-accent/40 hover:shadow-md"
        >
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Active Service Plans</p>
            <p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.activeJobs}</p>
            <p className="text-[11px] text-muted-foreground">Open Service Plans</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Open Alerts</p>
            <p className="text-lg font-semibold sm:text-xl leading-tight text-warning">{kpis.openAlerts}</p>
          </CardContent>
        </Card>
      </div>

      {tab === 'service-plans' && (
        <JobsTable
          key={`service-plans-${refreshKey}`}
          search={search}
          openCreateToken={openServicePlanCreateToken}
          showCreateButton={false}
        />
      )}

      {tab === 'tickets' && (
        <TicketsTable
          key={`t-${refreshKey}`}
          search={search}
          onGoToServicePlans={() => setTab('service-plans')}
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

      {tab === 'time' && <AlertsTable key={`alerts-${refreshKey}`} search={search} />}

      {tab === 'routes' && (
        <RoutesFleetPanel key={`routes-${refreshKey}`} search={search} />
      )}

      {tab === 'checklists' && (
        <ChecklistAdmin key={`checklists-${refreshKey}`} search={search} />
      )}

      {tab === 'forms' && (
        <FormsHub key={`forms-${refreshKey}`} search={search} />
      )}

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
