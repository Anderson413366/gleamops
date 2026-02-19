'use client';

import { useState, useCallback, useEffect } from 'react';
import { ClipboardList, ClipboardCheck, Route, MessageSquare } from 'lucide-react';
import { ChipTabs, SearchInput, Card, CardContent } from '@gleamops/ui';
import type { WorkTicket, Inspection, MessageThread } from '@gleamops/shared';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSyncedTab } from '@/hooks/use-synced-tab';

import TicketsTable from '../operations/tickets/tickets-table';
import { TicketDetail } from '../operations/tickets/ticket-detail';
import InspectionsTable from '../operations/inspections/inspections-table';
import { InspectionDetail } from '../operations/inspections/inspection-detail';
import { CreateInspectionForm } from '../operations/inspections/create-inspection-form';
import RoutesFleetPanel from '../operations/routes/routes-fleet-panel';
import MessagesList from '../operations/messages/messages-list';
import { ThreadDetail } from '../operations/messages/thread-detail';

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

interface SelectedThread {
  id: string;
  subject: string;
  thread_type: string;
}

const TABS = [
  { key: 'tickets', label: 'Tickets', icon: <ClipboardList className="h-4 w-4" /> },
  { key: 'inspections', label: 'Inspections', icon: <ClipboardCheck className="h-4 w-4" /> },
  { key: 'routes', label: 'Routes', icon: <Route className="h-4 w-4" /> },
  { key: 'messages', label: 'Messages', icon: <MessageSquare className="h-4 w-4" /> },
];

export default function WorkPageClient() {
  const [tab, setTab] = useSyncedTab({
    tabKeys: TABS.map((t) => t.key),
    defaultTab: 'tickets',
  });
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState<TicketWithRelations | null>(null);
  const [selectedInspection, setSelectedInspection] = useState<InspectionWithRelations | null>(null);
  const [showCreateInspection, setShowCreateInspection] = useState(false);
  const [selectedThread, setSelectedThread] = useState<SelectedThread | null>(null);
  const [, setShowNewThread] = useState(false);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // KPIs from Operations
  const [kpis, setKpis] = useState({
    todayTickets: 0,
    openTickets: 0,
    activeJobs: 0,
    openAlerts: 0,
  });

  useEffect(() => {
    async function fetchKpis() {
      const supabase = getSupabaseBrowserClient();
      const today = new Date().toISOString().slice(0, 10);
      const [todayRes, openRes, jobsRes, alertsRes] = await Promise.all([
        supabase.from('work_tickets').select('id', { count: 'exact', head: true }).eq('scheduled_date', today).is('archived_at', null),
        supabase.from('work_tickets').select('id', { count: 'exact', head: true }).in('status', ['SCHEDULED', 'IN_PROGRESS']).is('archived_at', null),
        supabase.from('site_jobs').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE').is('archived_at', null),
        supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('alert_type', 'TIME_EXCEPTION').is('dismissed_at', null),
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Work Execution</h1>
        <p className="text-sm text-muted-foreground mt-1">Tickets, Inspections, Routes, Messages</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Tickets Today</p><p className="text-xl font-semibold">{kpis.todayTickets}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Open Tickets</p><p className="text-xl font-semibold">{kpis.openTickets}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active Service Plans</p><p className="text-xl font-semibold">{kpis.activeJobs}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Open Alerts</p><p className="text-xl font-semibold text-warning">{kpis.openAlerts}</p></CardContent></Card>
      </div>

      <ChipTabs tabs={TABS} active={tab} onChange={setTab} />
      <SearchInput value={search} onChange={setSearch} placeholder={`Search ${tab}...`} />

      {tab === 'tickets' && <TicketsTable key={`t-${refreshKey}`} search={search} />}

      {tab === 'inspections' && (
        <InspectionsTable
          key={`i-${refreshKey}`}
          search={search}
          onSelect={(insp) => setSelectedInspection(insp as InspectionWithRelations)}
          onCreateNew={() => setShowCreateInspection(true)}
        />
      )}

      {tab === 'routes' && <RoutesFleetPanel key={`r-${refreshKey}`} search={search} />}

      {tab === 'messages' && (
        <MessagesList
          key={`m-${refreshKey}`}
          search={search}
          onSelectThread={(thread) => {
            const t = thread as MessageThread & { latest_message?: unknown };
            setSelectedThread({ id: t.id, subject: t.subject, thread_type: t.thread_type });
          }}
          onNewThread={() => setShowNewThread(true)}
        />
      )}

      <TicketDetail
        ticket={selectedTicket}
        open={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        onStatusChange={() => { setSelectedTicket(null); refresh(); }}
      />

      <InspectionDetail
        inspection={selectedInspection}
        open={!!selectedInspection}
        onClose={() => setSelectedInspection(null)}
        onUpdate={() => { setSelectedInspection(null); refresh(); }}
      />

      <CreateInspectionForm
        open={showCreateInspection}
        onClose={() => setShowCreateInspection(false)}
        onCreated={() => { setShowCreateInspection(false); refresh(); }}
      />

      {selectedThread && (
        <ThreadDetail
          threadId={selectedThread.id}
          threadSubject={selectedThread.subject}
          threadType={selectedThread.thread_type}
          open={!!selectedThread}
          onClose={() => setSelectedThread(null)}
        />
      )}
    </div>
  );
}
