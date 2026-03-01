'use client';

/**
 * Team module — renamed from Workforce (Epic 2.2).
 * Re-exports the existing workforce page with the new "Team" branding.
 */

import { useState, useMemo, useEffect } from 'react';
import { Users, FileText, BriefcaseBusiness, DollarSign, Plus, MessageSquare, UserRoundCheck, Clock, Droplets, HardHat, Coffee, Tag } from 'lucide-react';
import { SearchInput, Button, Card, CardContent } from '@gleamops/ui';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSyncedTab } from '@/hooks/use-synced-tab';

import StaffTable from '../workforce/staff/staff-table';
import TimeEntriesTable from '../workforce/timekeeping/time-entries-table';
import TimesheetsTable from '../workforce/timesheets/timesheets-table';
import PositionsTable from '../workforce/positions/positions-table';
import PayrollTable from '../workforce/payroll/payroll-table';
import MessagesTab from '../workforce/messages/messages-tab';
import HrLitePanel from '../workforce/hr/hr-lite-panel';
import MicrofiberTable from '../workforce/microfiber/microfiber-table';
import MicrofiberExport from '../workforce/microfiber/microfiber-export';
import SubcontractorsTable from '../vendors/subcontractors/subcontractors-table';
import BreakRulesTable from '../workforce/break-rules/break-rules-table';
import ShiftTagsTable from '../workforce/shift-tags/shift-tags-table';

const ATTENDANCE_SUB_TABS = ['Overview', 'Add Clock Time', 'Manage Time Sheets', 'Clocked In List', 'Time Clock Locations', 'Auto-approval Rules'] as const;
const PAYROLL_SUB_TABS = ['Scheduled Hours', 'Confirmed Hours', 'Confirmed Time Sheets', 'Payroll Settings'] as const;

function AttendanceWrapper({ search }: { search: string }) {
  const [subTab, setSubTab] = useState('Overview');
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5 border-b border-border pb-2">
        {ATTENDANCE_SUB_TABS.map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setSubTab(st)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              subTab === st ? 'bg-module-accent/15 text-module-accent border border-module-accent/30' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {st}
          </button>
        ))}
      </div>
      {subTab === 'Overview' && <TimeEntriesTable search={search} />}
      {subTab !== 'Overview' && (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">{subTab} — coming soon</p>
        </div>
      )}
    </div>
  );
}

function PayrollWrapper({ search }: { search: string }) {
  const [subTab, setSubTab] = useState('Scheduled Hours');
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5 border-b border-border pb-2">
        {PAYROLL_SUB_TABS.map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setSubTab(st)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              subTab === st ? 'bg-module-accent/15 text-module-accent border border-module-accent/30' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {st}
          </button>
        ))}
      </div>
      {subTab === 'Scheduled Hours' && <PayrollTable search={search} />}
      {subTab !== 'Scheduled Hours' && (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">{subTab} — coming soon</p>
        </div>
      )}
    </div>
  );
}

const BASE_TABS = [
  { key: 'staff', label: 'Staff', icon: <Users className="h-4 w-4" /> },
  { key: 'positions', label: 'Positions', icon: <BriefcaseBusiness className="h-4 w-4" /> },
  { key: 'attendance', label: 'Attendance', icon: <Clock className="h-4 w-4" /> },
  { key: 'timesheets', label: 'Timesheets', icon: <FileText className="h-4 w-4" /> },
  { key: 'payroll', label: 'Payroll', icon: <DollarSign className="h-4 w-4" /> },
  { key: 'hr', label: 'HR', icon: <UserRoundCheck className="h-4 w-4" /> },
  { key: 'microfiber', label: 'Microfiber', icon: <Droplets className="h-4 w-4" /> },
  { key: 'subcontractors', label: 'Subcontractors', icon: <HardHat className="h-4 w-4" /> },
  { key: 'break-rules', label: 'Break Rules', icon: <Coffee className="h-4 w-4" /> },
  { key: 'shift-tags', label: 'Shift Tags', icon: <Tag className="h-4 w-4" /> },
];

export default function TeamPageClient() {
  const messagingEnabled = useFeatureFlag('messaging_v1');

  const TABS = useMemo(() => {
    const tabs = [...BASE_TABS];
    if (messagingEnabled) {
      tabs.push({ key: 'messages', label: 'Messages', icon: <MessageSquare className="h-4 w-4" /> });
    }
    return tabs;
  }, [messagingEnabled]);

  const [tab] = useSyncedTab({
    tabKeys: TABS.map((entry) => entry.key),
    defaultTab: 'staff',
    aliases: {
      timekeeping: 'attendance',
      attendance: 'attendance',
      exceptions: 'timesheets',
      'hr-lite': 'hr',
    },
  });
  const [search, setSearch] = useState('');
  const refreshKey = 0;
  const [autoCreateStaff, setAutoCreateStaff] = useState(false);
  const [kpis, setKpis] = useState({
    activeStaff: 0,
    supervisors: 0,
    openExceptions: 0,
    pendingTimesheets: 0,
  });
  useEffect(() => {
    async function fetchKpis() {
      const supabase = getSupabaseBrowserClient();
      const [activeRes, superRes, excRes, tsRes] = await Promise.all([
        supabase.from('staff').select('id', { count: 'exact', head: true }).is('archived_at', null).eq('staff_status', 'ACTIVE'),
        supabase.from('staff').select('id', { count: 'exact', head: true }).is('archived_at', null).eq('staff_status', 'ACTIVE').eq('role', 'SUPERVISOR'),
        supabase.from('time_exceptions').select('id', { count: 'exact', head: true }).is('resolved_at', null),
        supabase.from('timesheets').select('id', { count: 'exact', head: true }).eq('status', 'SUBMITTED'),
      ]);

      setKpis({
        activeStaff: activeRes.count ?? 0,
        supervisors: superRes.count ?? 0,
        openExceptions: excRes.count ?? 0,
        pendingTimesheets: tsRes.count ?? 0,
      });
    }
    fetchKpis();
  }, []);

  const handleAdd = () => {
    setAutoCreateStaff(true);
  };

  const addLabel = tab === 'staff' ? 'Add Staff' : '';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your team — staff, positions, timesheets, payroll, HR, and microfiber program</p>
        </div>
        {addLabel && (
          <Button className="w-full sm:w-auto" onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            {addLabel}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active Staff</p><p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.activeStaff}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Supervisors</p><p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.supervisors}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Open Exceptions</p><p className="text-lg font-semibold sm:text-xl leading-tight text-warning">{kpis.openExceptions}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Pending Timesheets</p><p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.pendingTimesheets}</p></CardContent></Card>
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={`Search ${tab}...`}
        className="w-full sm:w-72 lg:w-80"
      />

      {tab === 'staff' && (
        <StaffTable
          key={`staff-${refreshKey}`}
          search={search}
          autoCreate={autoCreateStaff}
          onAutoCreateHandled={() => setAutoCreateStaff(false)}
          showCreateButton={false}
        />
      )}
      {tab === 'positions' && <PositionsTable key={`pos-${refreshKey}`} search={search} />}
      {tab === 'attendance' && (
        <AttendanceWrapper key={`attendance-${refreshKey}`} search={search} />
      )}
      {tab === 'timesheets' && <TimesheetsTable key={`ts-${refreshKey}`} search={search} />}
      {tab === 'payroll' && (
        <PayrollWrapper key={`pay-${refreshKey}`} search={search} />
      )}
      {tab === 'hr' && <HrLitePanel key={`hr-${refreshKey}`} search={search} />}
      {tab === 'microfiber' && (
        <div className="space-y-4">
          <MicrofiberExport key={`mfe-${refreshKey}`} />
          <MicrofiberTable key={`mft-${refreshKey}`} search={search} />
        </div>
      )}
      {tab === 'messages' && messagingEnabled && <MessagesTab key={`msg-${refreshKey}`} search={search} />}
      {tab === 'subcontractors' && <SubcontractorsTable key={`subs-${refreshKey}`} search={search} />}
      {tab === 'break-rules' && <BreakRulesTable key={`break-${refreshKey}`} search={search} />}
      {tab === 'shift-tags' && <ShiftTagsTable key={`tags-${refreshKey}`} search={search} />}
    </div>
  );
}
