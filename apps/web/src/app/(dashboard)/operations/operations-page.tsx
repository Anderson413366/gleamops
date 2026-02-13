'use client';

import { useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar, ClipboardList, Briefcase, ClipboardCheck, FileText } from 'lucide-react';
import { ChipTabs, SearchInput } from '@gleamops/ui';
import type { WorkTicket, Inspection } from '@gleamops/shared';

import TicketsTable from './tickets/tickets-table';
import { TicketDetail } from './tickets/ticket-detail';
import JobsTable from './jobs/jobs-table';
import WeekCalendar from './calendar/week-calendar';
import InspectionsTable from './inspections/inspections-table';
import { InspectionDetail } from './inspections/inspection-detail';
import { CreateInspectionForm } from './inspections/create-inspection-form';
import TemplatesTable from './inspections/templates-table';

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
];

export default function OperationsPageClient() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState(TABS.some(t => t.key === initialTab) ? initialTab! : TABS[0].key);
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState<TicketWithRelations | null>(null);
  const [selectedInspection, setSelectedInspection] = useState<InspectionWithRelations | null>(null);
  const [showCreateInspection, setShowCreateInspection] = useState(false);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Operations</h1>
          <p className="text-sm text-muted-foreground mt-1">Calendar, Work Tickets, Service Plans, Inspections, Templates</p>
        </div>
      </div>

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
