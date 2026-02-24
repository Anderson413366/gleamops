'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ClipboardList,
  ClipboardCheck,
  Clock,
  Route,
  Eye,
  EyeOff,
} from 'lucide-react';
import { ChipTabs, SearchInput, Button, Card, CardContent } from '@gleamops/ui';
import type { WorkTicket, Inspection } from '@gleamops/shared';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSyncedTab } from '@/hooks/use-synced-tab';

import TicketsTable from '../operations/tickets/tickets-table';
import { TicketDetail } from '../operations/tickets/ticket-detail';
import InspectionsTable from '../operations/inspections/inspections-table';
import { InspectionDetail } from '../operations/inspections/inspection-detail';
import { CreateInspectionForm } from '../operations/inspections/create-inspection-form';
import AlertsTable from '../operations/geofence/alerts-table';
import RoutesFleetPanel from '../operations/routes/routes-fleet-panel';

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
  { key: 'tickets', label: 'Tickets', icon: <ClipboardList className="h-4 w-4" /> },
  { key: 'inspections', label: 'Inspections', icon: <ClipboardCheck className="h-4 w-4" /> },
  { key: 'time', label: 'Time', icon: <Clock className="h-4 w-4" /> },
  { key: 'routes', label: 'Routes', icon: <Route className="h-4 w-4" /> },
];

export default function JobsPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialTicketId = searchParams.get('ticket');
  const action = searchParams.get('action');

  const [tab, setTab] = useSyncedTab({
    tabKeys: TABS.map((entry) => entry.key),
    defaultTab: initialTicketId ? 'tickets' : 'tickets',
    aliases: { alerts: 'time' },
  });
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState<TicketWithRelations | null>(null);
  const [selectedInspection, setSelectedInspection] = useState<InspectionWithRelations | null>(null);
  const [showCreateInspection, setShowCreateInspection] = useState(false);
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
        setTab('tickets');
        clearActionParam('tickets');
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
    <div className={`space-y-6 ${focusMode ? 'mx-auto max-w-5xl' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Jobs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Active work: tickets, inspections, time tracking, and routes.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setFocusMode((prev) => !prev)}>
          {focusMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {focusMode ? 'Exit Focus' : 'Focus Mode'}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Tickets Today</p>
            <p className="text-xl font-semibold">{kpis.todayTickets}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Open Tickets</p>
            <p className="text-xl font-semibold">{kpis.openTickets}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Active Service Plans</p>
            <p className="text-xl font-semibold">{kpis.activeJobs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Open Alerts</p>
            <p className="text-xl font-semibold text-warning">{kpis.openAlerts}</p>
          </CardContent>
        </Card>
      </div>

      <ChipTabs tabs={TABS} active={tab} onChange={setTab} />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={
          tab === 'tickets'
            ? 'Search tickets...'
            : tab === 'inspections'
              ? 'Search inspections...'
              : tab === 'time'
                ? 'Search time alerts and exceptions...'
                : tab === 'routes'
                  ? 'Search routes and owners...'
                  : `Search ${tab}...`
        }
      />

      {tab === 'tickets' && (
        <TicketsTable
          key={`t-${refreshKey}`}
          search={search}
          onGoToServicePlans={() => setTab('tickets')}
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
