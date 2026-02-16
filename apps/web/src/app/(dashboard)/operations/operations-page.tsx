'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar, ClipboardList, Briefcase, ClipboardCheck, FileText, MapPin, AlertTriangle, MessageSquare, Eye, EyeOff } from 'lucide-react';
import { ChipTabs, SearchInput, Button, Card, CardContent } from '@gleamops/ui';
import type { WorkTicket, Inspection, Geofence } from '@gleamops/shared';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

import TicketsTable from './tickets/tickets-table';
import { TicketDetail } from './tickets/ticket-detail';
import JobsTable from './jobs/jobs-table';
import WeekCalendar from './calendar/week-calendar';
import InspectionsTable from './inspections/inspections-table';
import { InspectionDetail } from './inspections/inspection-detail';
import { CreateInspectionForm } from './inspections/create-inspection-form';
import TemplatesTable from './inspections/templates-table';
import GeofenceTable from './geofence/geofence-table';
import AlertsTable from './geofence/alerts-table';
import { GeofenceForm } from '@/components/forms/geofence-form';
import MessagesList from './messages/messages-list';
import { ThreadDetail } from './messages/thread-detail';
import { MessageForm } from '@/components/forms/message-form';

interface GeofenceWithSite extends Geofence {
  site?: { name: string; site_code: string } | null;
}

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
  { key: 'calendar', label: 'Calendar', icon: <Calendar className="h-4 w-4" /> },
  { key: 'tickets', label: 'Work Tickets', icon: <ClipboardList className="h-4 w-4" /> },
  { key: 'jobs', label: 'Service Plans', icon: <Briefcase className="h-4 w-4" /> },
  { key: 'inspections', label: 'Inspections', icon: <ClipboardCheck className="h-4 w-4" /> },
  { key: 'templates', label: 'Templates', icon: <FileText className="h-4 w-4" /> },
  { key: 'geofences', label: 'Geofences', icon: <MapPin className="h-4 w-4" /> },
  { key: 'alerts', label: 'Alerts', icon: <AlertTriangle className="h-4 w-4" /> },
  { key: 'messages', label: 'Messages', icon: <MessageSquare className="h-4 w-4" /> },
];

export default function OperationsPageClient() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');
  const initialTicketId = searchParams.get('ticket');
  const [tab, setTab] = useState(
    TABS.some((t) => t.key === initialTab)
      ? initialTab!
      : (initialTicketId ? 'tickets' : TABS[0].key)
  );
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState<TicketWithRelations | null>(null);
  const [selectedInspection, setSelectedInspection] = useState<InspectionWithRelations | null>(null);
  const [showCreateInspection, setShowCreateInspection] = useState(false);
  const [showGeofenceForm, setShowGeofenceForm] = useState(false);
  const [editGeofence, setEditGeofence] = useState<GeofenceWithSite | null>(null);
  const [selectedThread, setSelectedThread] = useState<{ id: string; subject: string; thread_type: string } | null>(null);
  const [showMessageForm, setShowMessageForm] = useState(false);
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
          job:job_id(job_code, billing_amount),
          site:site_id(site_code, name, address, client:client_id(name, client_code))
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
  }, [initialTicketId]);

  return (
    <div className={`space-y-6 ${focusMode ? 'mx-auto max-w-5xl' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Operations</h1>
          <p className="text-sm text-muted-foreground mt-1">Calendar, Work Tickets, Service Plans, Inspections, Templates, Geofences, Messages</p>
        </div>
        <Button variant="secondary" onClick={() => setFocusMode((prev) => !prev)}>
          {focusMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {focusMode ? 'Exit Focus' : 'Focus Mode'}
        </Button>
      </div>

      {!focusMode && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Tickets Today</p><p className="text-xl font-semibold">{kpis.todayTickets}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Open Tickets</p><p className="text-xl font-semibold">{kpis.openTickets}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active Jobs</p><p className="text-xl font-semibold">{kpis.activeJobs}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Open Alerts</p><p className="text-xl font-semibold text-warning">{kpis.openAlerts}</p></CardContent></Card>
        </div>
      )}

      <ChipTabs tabs={TABS} active={tab} onChange={setTab} />
      {tab !== 'calendar' && (
        <SearchInput value={search} onChange={setSearch} placeholder={`Search ${tab}...`} />
      )}

      {tab === 'calendar' && (
        <WeekCalendar
          key={`cal-${refreshKey}`}
          onSelectTicket={(t) => setSelectedTicket(t as TicketWithRelations)}
        />
      )}
      {tab === 'tickets' && (
        <TicketsTable
          key={`t-${refreshKey}`}
          search={search}
          onSelect={(t) => setSelectedTicket(t as TicketWithRelations)}
        />
      )}
      {tab === 'jobs' && <JobsTable key={`j-${refreshKey}`} search={search} />}
      {tab === 'inspections' && (
        <InspectionsTable
          key={`i-${refreshKey}`}
          search={search}
          onSelect={(insp) => setSelectedInspection(insp as InspectionWithRelations)}
          onCreateNew={() => setShowCreateInspection(true)}
        />
      )}
      {tab === 'templates' && <TemplatesTable key={`tmpl-${refreshKey}`} search={search} />}
      {tab === 'geofences' && (
        <GeofenceTable
          key={`geo-${refreshKey}`}
          search={search}
          onAdd={() => { setEditGeofence(null); setShowGeofenceForm(true); }}
          onSelect={(g) => { setEditGeofence(g); setShowGeofenceForm(true); }}
        />
      )}
      {tab === 'alerts' && <AlertsTable key={`alerts-${refreshKey}`} search={search} />}
      {tab === 'messages' && (
        <MessagesList
          key={`msg-${refreshKey}`}
          search={search}
          onSelectThread={(thread) => setSelectedThread({ id: thread.id, subject: thread.subject, thread_type: thread.thread_type })}
          onNewThread={() => setShowMessageForm(true)}
        />
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

      <GeofenceForm
        open={showGeofenceForm}
        onClose={() => { setShowGeofenceForm(false); setEditGeofence(null); }}
        initialData={editGeofence}
        onSuccess={refresh}
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

      <MessageForm
        open={showMessageForm}
        onClose={() => setShowMessageForm(false)}
        onSuccess={() => {
          setShowMessageForm(false);
          refresh();
        }}
      />
    </div>
  );
}
