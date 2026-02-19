'use client';

import { useState, useCallback } from 'react';
import { Users, Building2, CalendarClock, ArrowLeftRight, Lock } from 'lucide-react';
import { ChipTabs, SearchInput, EmptyState } from '@gleamops/ui';
import type { WorkTicket } from '@gleamops/shared';
import { useSyncedTab } from '@/hooks/use-synced-tab';

import WeekCalendar from './calendar/week-calendar';
import { TicketDetail } from './tickets/ticket-detail';

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

const TABS = [
  { key: 'by-employee', label: 'By Employee', icon: <Users className="h-4 w-4" /> },
  { key: 'by-site', label: 'By Site', icon: <Building2 className="h-4 w-4" /> },
  { key: 'availability', label: 'Availability', icon: <CalendarClock className="h-4 w-4" /> },
  { key: 'trades', label: 'Trades', icon: <ArrowLeftRight className="h-4 w-4" /> },
  { key: 'publish-lock', label: 'Publish And Lock', icon: <Lock className="h-4 w-4" /> },
];

export default function SchedulePageClient() {
  const [tab, setTab] = useSyncedTab({
    tabKeys: TABS.map((entry) => entry.key),
    defaultTab: 'by-employee',
    aliases: { employee: 'by-employee', site: 'by-site', calendar: 'by-employee' },
  });
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState<TicketWithRelations | null>(null);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Employee Schedule</h1>
        <p className="text-sm text-muted-foreground mt-1">
          By Employee, By Site, Availability, Trades, Publish And Lock
        </p>
      </div>

      <ChipTabs tabs={TABS} active={tab} onChange={setTab} />

      {(tab === 'availability' || tab === 'trades') && (
        <SearchInput value={search} onChange={setSearch} placeholder={`Search ${tab}...`} />
      )}

      {tab === 'by-employee' && (
        <WeekCalendar
          key={`emp-${refreshKey}`}
          onSelectTicket={(t) => setSelectedTicket(t as TicketWithRelations)}
        />
      )}

      {tab === 'by-site' && (
        <WeekCalendar
          key={`site-${refreshKey}`}
          onSelectTicket={(t) => setSelectedTicket(t as TicketWithRelations)}
        />
      )}

      {tab === 'availability' && (
        <EmptyState
          icon={<CalendarClock className="h-10 w-10" />}
          title="Staff Availability"
          description="Manage staff availability windows, time-off requests, and recurring schedules."
          bullets={[
            'View and edit staff availability by day/week',
            'Approve or deny time-off requests',
            'Set recurring availability patterns',
          ]}
        />
      )}

      {tab === 'trades' && (
        <EmptyState
          icon={<ArrowLeftRight className="h-10 w-10" />}
          title="Shift Trades"
          description="Review and approve shift trade requests between team members."
          bullets={[
            'View pending trade requests',
            'Approve or deny trades with conflict checking',
            'Trade history and audit trail',
          ]}
        />
      )}

      {tab === 'publish-lock' && (
        <EmptyState
          icon={<Lock className="h-10 w-10" />}
          title="Publish And Lock"
          description="Publish finalized schedules and lock periods to prevent changes."
          bullets={[
            'Publish schedules to notify staff',
            'Lock schedule periods (Owner/Manager only)',
            'View publish history and locked ranges',
          ]}
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
    </div>
  );
}
