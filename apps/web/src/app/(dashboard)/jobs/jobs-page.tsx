'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Briefcase,
  ClipboardList,
  ClipboardCheck,
  Clock,
  Route,
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
  const [tabKpis, setTabKpis] = useState<{ label: string; value: number | string; warn?: boolean }[]>([
    { label: 'Tickets Today', value: 0 },
    { label: 'Open Tickets', value: 0 },
    { label: 'Active Service Plans', value: 0 },
    { label: 'Open Alerts', value: 0 },
  ]);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const fetchKpis = useCallback(async (activeTab: string) => {
    const supabase = getSupabaseBrowserClient();

    if (activeTab === 'time') {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const [openRes, criticalRes, warningRes, recentRes] = await Promise.all([
        supabase.from('alerts').select('id').eq('alert_type', 'TIME_EXCEPTION').is('dismissed_at', null),
        supabase.from('alerts').select('id').eq('alert_type', 'TIME_EXCEPTION').is('dismissed_at', null).eq('severity', 'CRITICAL'),
        supabase.from('alerts').select('id').eq('alert_type', 'TIME_EXCEPTION').is('dismissed_at', null).eq('severity', 'WARNING'),
        supabase.from('alerts').select('id').eq('alert_type', 'TIME_EXCEPTION').is('dismissed_at', null).gte('created_at', weekAgo),
      ]);
      setTabKpis([
        { label: 'Open Exceptions', value: openRes.data?.length ?? 0, warn: (openRes.data?.length ?? 0) > 0 },
        { label: 'Critical', value: criticalRes.data?.length ?? 0, warn: (criticalRes.data?.length ?? 0) > 0 },
        { label: 'Warnings', value: warningRes.data?.length ?? 0 },
        { label: 'This Week', value: recentRes.data?.length ?? 0 },
      ]);
    } else {
      const _now = new Date();
      const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;
      const [todayRes, openRes, jobsRes, alertsRes] = await Promise.all([
        supabase.from('work_tickets').select('id').eq('scheduled_date', today).is('archived_at', null),
        supabase.from('work_tickets').select('id').in('status', ['SCHEDULED', 'IN_PROGRESS']).is('archived_at', null),
        supabase.from('site_jobs').select('id').eq('status', 'ACTIVE').is('archived_at', null),
        supabase.from('alerts').select('id').eq('alert_type', 'TIME_EXCEPTION').is('dismissed_at', null),
      ]);
      setTabKpis([
        { label: 'Tickets Today', value: todayRes.data?.length ?? 0 },
        { label: 'Open Tickets', value: openRes.data?.length ?? 0 },
        { label: 'Active Service Plans', value: jobsRes.data?.length ?? 0 },
        { label: 'Open Alerts', value: alertsRes.data?.length ?? 0, warn: (alertsRes.data?.length ?? 0) > 0 },
      ]);
    }
  }, []);

  useEffect(() => {
    fetchKpis(tab);
  }, [tab, fetchKpis, refreshKey]);

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
        router.push('/schedule?tab=work-orders&action=create-work-order');
      }
    },
    [clearActionParam, router, setTab],
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
      <div className="pt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tabKpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className={`text-lg font-semibold sm:text-xl leading-tight${kpi.warn ? ' text-warning' : ''}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
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
        {tab === 'service-plans' && (
          <Button className="shrink-0" onClick={() => setOpenServicePlanCreateToken((token) => token + 1)}>
            <Plus className="h-4 w-4" />
            New Service Plan
          </Button>
        )}
        {/* Inspection create button is in InspectionsTable toolbar */}
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
